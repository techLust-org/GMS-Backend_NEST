import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';

// Port of services/financial.service.js. Raw parameterized Postgres SQL over the
// `ledger` table (the canonical cashflow source of truth). Kept verbatim.
@Injectable()
export class FinancialService {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async getMonthlySummary(year: number | string, shopId: number) {
    const revenue = await this.sequelize.query(
      `
      SELECT
        EXTRACT(MONTH FROM entry_date)::int AS month,
        SUM(CASE WHEN reference = 'subscription' THEN amount ELSE 0 END) AS subscription_revenue,
        SUM(CASE WHEN reference = 'sale' THEN amount ELSE 0 END) AS product_revenue,
        SUM(amount) AS total_revenue
      FROM ledger
      WHERE type = 'credit' AND EXTRACT(YEAR FROM entry_date) = :year AND shop_id = :shopId
      GROUP BY month ORDER BY month
    `,
      { replacements: { year, shopId }, type: QueryTypes.SELECT },
    );

    const expenses = await this.sequelize.query(
      `
      SELECT
        EXTRACT(MONTH FROM entry_date)::int AS month,
        reference_id AS category_id,
        SUM(amount) AS total
      FROM ledger
      WHERE type = 'debit' AND reference = 'expense' AND EXTRACT(YEAR FROM entry_date) = :year AND shop_id = :shopId
      GROUP BY month, reference_id ORDER BY month
    `,
      { replacements: { year, shopId }, type: QueryTypes.SELECT },
    );

    return { revenue, expenses };
  }

  async getMonthlyBreakdown(year: number | string, shopId: number) {
    const rows: any[] = await this.sequelize.query(
      `
      SELECT
        EXTRACT(MONTH FROM entry_date)::int AS month,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS expenses
      FROM ledger
      WHERE EXTRACT(YEAR FROM entry_date) = :year AND shop_id = :shopId
      GROUP BY month ORDER BY month
    `,
      { replacements: { year, shopId }, type: QueryTypes.SELECT },
    );

    return rows.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue) || 0,
      expenses: parseFloat(r.expenses) || 0,
      net_profit: (parseFloat(r.revenue) || 0) - (parseFloat(r.expenses) || 0),
    }));
  }

  async getAnnualSummary(year: number | string, shopId: number) {
    return this.getMonthlyBreakdown(year, shopId);
  }

  async getDailyBreakdown(year: number | string, month: number | string, shopId: number) {
    const rows: any[] = await this.sequelize.query(
      `
      SELECT
        EXTRACT(DAY FROM entry_date)::int AS day,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS revenue,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS expenses
      FROM ledger
      WHERE EXTRACT(YEAR FROM entry_date) = :year AND EXTRACT(MONTH FROM entry_date) = :month AND shop_id = :shopId
      GROUP BY day ORDER BY day
    `,
      { replacements: { year, month, shopId }, type: QueryTypes.SELECT },
    );

    return rows.map((r) => ({
      day: r.day,
      revenue: parseFloat(r.revenue) || 0,
      expenses: parseFloat(r.expenses) || 0,
    }));
  }

  async getOverallSummary(year: number | string, month: number | string, shopId: number) {
    const dateFilter = 'EXTRACT(YEAR FROM entry_date) = :year AND EXTRACT(MONTH FROM entry_date) = :month';
    const replacements = { year, month, shopId };

    const [totals]: any[] = await this.sequelize.query(
      `
      SELECT
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_revenue,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_expenses
      FROM ledger WHERE ${dateFilter} AND shop_id = :shopId
    `,
      { replacements, type: QueryTypes.SELECT },
    );

    const bySource: any[] = await this.sequelize.query(
      `
      SELECT reference, SUM(amount) AS total
      FROM ledger
      WHERE type = 'credit' AND ${dateFilter} AND shop_id = :shopId
      GROUP BY reference
    `,
      { replacements, type: QueryTypes.SELECT },
    );
    const bySourceMap = Object.fromEntries(bySource.map((r) => [r.reference, parseFloat(r.total) || 0]));

    const totalRevenue = parseFloat(totals.total_revenue) || 0;
    const totalExpenses = parseFloat(totals.total_expenses) || 0;
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
