import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ledger } from '../models';

const pad2 = (n: number | string) => String(n).padStart(2, '0');
const cents = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// SUM over a NUMERIC(10,2) column came back from pg as a string: "123.00"
// when at least one row contributed an amount, "0" when only the CASE's
// ELSE 0 branch did. Reproduced so these raw rows keep their exact shape.
const pgSum = (sum: number, contributing: number) => (contributing > 0 ? cents(sum).toFixed(2) : '0');

// Matches `amount` when `cond` holds, else 0 — the SQL `SUM(CASE ...)`.
const sumIf = (cond: any) => ({ $sum: { $cond: [cond, '$amount', 0] } });
const countIf = (cond: any) => ({ $sum: { $cond: [cond, 1, 0] } });
const eq = (field: string, value: string) => ({ $eq: [`$${field}`, value] });

// entry_date is a 'YYYY-MM-DD' string, so month/day are fixed substrings
// and year/month filters are plain string ranges.
const MONTH = { $toInt: { $substrBytes: ['$entry_date', 5, 2] } };
const DAY = { $toInt: { $substrBytes: ['$entry_date', 8, 2] } };
const yearRange = (year: number | string) => ({ $gte: `${year}-01-01`, $lte: `${year}-12-31` });
const monthRange = (year: number | string, month: number | string) => ({
  $gte: `${year}-${pad2(month)}-01`,
  $lte: `${year}-${pad2(month)}-31`,
});

// Port of services/financial.service.js. Aggregations over the `ledger`
// collection (the canonical cashflow source of truth).
@Injectable()
export class FinancialService {
  constructor(@InjectModel(Ledger.name) private readonly ledger: Model<any>) {}

  async getMonthlySummary(year: number | string, shopId: string) {
    const revenueRows = await this.ledger.aggregate([
      { $match: { type: 'credit', shop_id: shopId, entry_date: yearRange(year) } },
      {
        $group: {
          _id: MONTH,
          subscription_revenue: sumIf(eq('reference', 'subscription')),
          subscription_n: countIf(eq('reference', 'subscription')),
          product_revenue: sumIf(eq('reference', 'sale')),
          product_n: countIf(eq('reference', 'sale')),
          total_revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const revenue = revenueRows.map((r) => ({
      month: r._id,
      subscription_revenue: pgSum(r.subscription_revenue, r.subscription_n),
      product_revenue: pgSum(r.product_revenue, r.product_n),
      total_revenue: pgSum(r.total_revenue, 1),
    }));

    const expenseRows = await this.ledger.aggregate([
      { $match: { type: 'debit', reference: 'expense', shop_id: shopId, entry_date: yearRange(year) } },
      { $group: { _id: { month: MONTH, category_id: '$reference_id' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.month': 1 } },
    ]);
    const expenses = expenseRows.map((r) => ({
      month: r._id.month,
      category_id: r._id.category_id,
      total: pgSum(r.total, 1),
    }));

    return { revenue, expenses };
  }

  async getMonthlyBreakdown(year: number | string, shopId: string) {
    const rows = await this.ledger.aggregate([
      { $match: { shop_id: shopId, entry_date: yearRange(year) } },
      {
        $group: {
          _id: MONTH,
          revenue: sumIf(eq('type', 'credit')),
          expenses: sumIf(eq('type', 'debit')),
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((r) => ({
      month: r._id,
      revenue: cents(r.revenue),
      expenses: cents(r.expenses),
      net_profit: cents(r.revenue) - cents(r.expenses),
    }));
  }

  async getAnnualSummary(year: number | string, shopId: string) {
    return this.getMonthlyBreakdown(year, shopId);
  }

  async getDailyBreakdown(year: number | string, month: number | string, shopId: string) {
    const rows = await this.ledger.aggregate([
      { $match: { shop_id: shopId, entry_date: monthRange(year, month) } },
      {
        $group: {
          _id: DAY,
          revenue: sumIf(eq('type', 'credit')),
          expenses: sumIf(eq('type', 'debit')),
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((r) => ({
      day: r._id,
      revenue: cents(r.revenue),
      expenses: cents(r.expenses),
    }));
  }

  async getOverallSummary(year: number | string, month: number | string, shopId: string) {
    const match = { shop_id: shopId, entry_date: monthRange(year, month) };

    const [totals] = await this.ledger.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_revenue: sumIf(eq('type', 'credit')),
          total_expenses: sumIf(eq('type', 'debit')),
        },
      },
    ]);

    const bySource = await this.ledger.aggregate([
      { $match: { ...match, type: 'credit' } },
      { $group: { _id: '$reference', total: { $sum: '$amount' } } },
    ]);
    const bySourceMap = Object.fromEntries(bySource.map((r) => [r._id, cents(r.total)]));

    const totalRevenue = cents(totals?.total_revenue);
    const totalExpenses = cents(totals?.total_expenses);
    const dailyData = await this.getDailyBreakdown(year, month, shopId);

    return {
      subscription_revenue: bySourceMap.subscription || 0,
      product_revenue: bySourceMap.sale || 0,
      other_income: bySourceMap.expense || 0,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      dailyData,
    };
  }
}
