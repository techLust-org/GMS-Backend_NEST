import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Expense, ExpenseCategory, User } from '../../models';
import { FinancialService as FinancialReportService } from '../../shared/financial.service';
import { LedgerService } from '../../shared/ledger.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminFinancialService {
  constructor(
    @InjectModel(Expense) private readonly expense: typeof Expense,
    @InjectModel(ExpenseCategory) private readonly expenseCategory: typeof ExpenseCategory,
    private readonly financial: FinancialReportService,
    private readonly ledger: LedgerService,
  ) {}

  async summary(shopId: number, query: any) {
    const now = new Date();
    const year = parseInt(query.year) || now.getFullYear();
    const month = parseInt(query.month) || now.getMonth() + 1;
    const data = await this.financial.getOverallSummary(year, month, shopId);
    return { year, month, ...data };
  }

  async monthlyReport(shopId: number, query: any) {
    const year = parseInt(query.year) || new Date().getFullYear();
    const data = await this.financial.getAnnualSummary(year, shopId);
    return { year, months: data };
  }

  async revenue(shopId: number, query: any) {
    const year = parseInt(query.year) || new Date().getFullYear();
    const { revenue } = await this.financial.getMonthlySummary(year, shopId);
    return revenue;
  }

  async getExpenses(shopId: number, query: any) {
    const { year, month, categoryId } = query;
    const where: any = { shop_id: shopId };
    if (categoryId) where.category_id = categoryId;
    if (year && month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      where.expense_date = { [Op.between]: [start, end] };
    } else if (year) {
      where.expense_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }
    return this.expense.findAll({
      where,
      include: [
        { model: ExpenseCategory, as: 'category', attributes: ['id', 'name', 'type'] },
        { model: User, as: 'trainer', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  async createExpense(shopId: number, body: any) {
    const { categoryId, description, amount, expenseDate, paidTo, trainerId, invoiceUrl } = body;
    if (!categoryId || !description || !amount) throw new AppError('Category, description and amount required', 400);

    const category: any = await this.expenseCategory.findOne({ where: { id: categoryId, shop_id: shopId } });
    if (!category) throw new AppError('Invalid expense category', 400);

    const expense: any = await this.expense.create({
      shop_id: shopId,
      category_id: categoryId,
      description,
      amount,
      expense_date: expenseDate || new Date().toISOString().split('T')[0],
      paid_to: paidTo,
      trainer_id: trainerId || null,
      invoice_url: invoiceUrl,
    } as any);

    await this.ledger.record({
      shopId,
      type: category.type,
      amount,
      reference: 'expense',
      referenceId: expense.id,
      entryDate: expense.expense_date,
    });

    return new ApiPayload(expense, 'Transaction recorded');
  }

  async updateExpense(shopId: number, id: number, body: any) {
    const expense: any = await this.expense.findOne({ where: { id, shop_id: shopId } });
    if (!expense) throw new AppError('Expense not found', 404);
    const { categoryId, description, amount, expenseDate, paidTo, invoiceUrl } = body;
    let category: any = null;
    if (categoryId) {
      category = await this.expenseCategory.findOne({ where: { id: categoryId, shop_id: shopId } });
      if (!category) throw new AppError('Invalid expense category', 400);
    }

    const ownsLedgerEntry = await this.ledger.hasEntry({
      shopId, reference: 'expense', referenceId: expense.id,
    });

    await expense.update({
      category_id: categoryId || expense.category_id,
      description: description || expense.description,
      amount: amount || expense.amount,
      expense_date: expenseDate || expense.expense_date,
      paid_to: paidTo !== undefined ? paidTo : expense.paid_to,
      invoice_url: invoiceUrl !== undefined ? invoiceUrl : expense.invoice_url,
    });

    if (!ownsLedgerEntry) {
      return new ApiPayload(expense, 'Transaction updated');
    }

    if (!category) category = await this.expenseCategory.findByPk(expense.category_id);
    await this.ledger.removeByReference({ shopId, reference: 'expense', referenceId: expense.id });
    await this.ledger.record({
      shopId,
      type: category.type,
      amount: expense.amount,
      reference: 'expense',
      referenceId: expense.id,
      entryDate: expense.expense_date,
    });

    return new ApiPayload(expense, 'Transaction updated');
  }

  async deleteExpense(shopId: number, id: number) {
    const expense: any = await this.expense.findOne({ where: { id, shop_id: shopId } });
    if (!expense) throw new AppError('Expense not found', 404);
    await this.ledger.removeByReference({ shopId, reference: 'expense', referenceId: expense.id });
    await expense.destroy();
    return new ApiPayload(null, 'Transaction deleted');
  }
}
