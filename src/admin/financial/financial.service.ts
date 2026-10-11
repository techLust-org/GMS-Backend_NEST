import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { stringify } from 'csv-stringify';
import PDFDocument from 'pdfkit';
import { Expense, ExpenseCategory } from '../../models';
import { FinancialService as FinancialReportService } from '../../shared/financial.service';
import { LedgerService } from '../../shared/ledger.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class AdminFinancialService {
  constructor(
    @InjectModel(Expense.name) private readonly expense: Model<any>,
    @InjectModel(ExpenseCategory.name) private readonly expenseCategory: Model<any>,
    private readonly financial: FinancialReportService,
    private readonly ledger: LedgerService,
  ) {}

  async summary(shopId: string, query: any) {
    const now = new Date();
    const year = parseInt(query.year) || now.getFullYear();
    const month = parseInt(query.month) || now.getMonth() + 1;
    const data = await this.financial.getOverallSummary(year, month, shopId);
    return { year, month, ...data };
  }

  async monthlyReport(shopId: string, query: any) {
    const year = parseInt(query.year) || new Date().getFullYear();
    const data = await this.financial.getAnnualSummary(year, shopId);
    return { year, months: data };
  }

  async revenue(shopId: string, query: any) {
    const year = parseInt(query.year) || new Date().getFullYear();
    const { revenue } = await this.financial.getMonthlySummary(year, shopId);
    return revenue;
  }

  async getExpenses(shopId: string, query: any) {
    const { year, month, categoryId, page = 1, limit = 10 } = query;
    const where: any = { shop_id: shopId };
    if (categoryId) where.category_id = categoryId;
    if (year && month) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      where.expense_date = { $gte: start, $lte: end };
    } else if (year) {
      where.expense_date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
    }
    const offset = (page - 1) * limit;
    const [count, rows] = await Promise.all([
      this.expense.countDocuments(where),
      this.expense
        .find(where)
        .populate([
          { path: 'category', select: 'name type' },
          { path: 'trainer', select: 'first_name last_name' },
        ])
        .sort({ expense_date: -1, createdAt: -1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Expenses fetched', { total: count, page: +page, limit: +limit });
  }

  async exportExpenses(shopId: string, query: any, res: Response) {
    const { startDate, endDate, categoryId, format = 'csv' } = query;
    if (!startDate || !endDate) throw new AppError('startDate and endDate are required', 400);

    const where: any = {
      shop_id: shopId,
      expense_date: { $gte: startDate, $lte: endDate },
    };
    if (categoryId) where.category_id = categoryId;

    const rows: any[] = await this.expense
      .find(where)
      .populate({ path: 'category', select: 'name type' })
      .sort({ expense_date: 1, createdAt: 1 });

    const filename = `ledger_${startDate}_to_${endDate}`;
    if (format === 'pdf') {
      this.writeLedgerPdf(rows, startDate, endDate, filename, res);
    } else {
      this.writeLedgerCsv(rows, filename, res);
    }
  }

  private writeLedgerCsv(rows: any[], filename: string, res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

    const stringifier = stringify({
      header: true,
      columns: ['Date', 'Category', 'Type', 'Description', 'Paid To', 'Amount'],
    });
    stringifier.pipe(res);
    for (const r of rows) {
      stringifier.write([
        r.expense_date,
        r.category?.name ?? '',
        r.category?.type ?? '',
        r.description ?? '',
        r.paid_to ?? '',
        Number(r.amount).toFixed(2),
      ]);
    }
    stringifier.end();
  }

  private writeLedgerPdf(rows: any[], startDate: string, endDate: string, filename: string, res: Response) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Ledger Export', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#555').text(`${startDate} to ${endDate}`, { align: 'center' });
    doc.moveDown(1.5);

    const cols = [
      { label: 'Date', x: 40, width: 65 },
      { label: 'Category', x: 105, width: 90 },
      { label: 'Description', x: 195, width: 165 },
      { label: 'Paid To', x: 360, width: 100 },
      { label: 'Amount', x: 460, width: 95 },
    ];
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
      for (const c of cols) doc.text(c.label, c.x, doc.y, { width: c.width, continued: false });
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).fillColor('#000');
    };

    drawHeader();
    let totalCredit = 0;
    let totalDebit = 0;
    for (const r of rows) {
      if (doc.y > 760) {
        doc.addPage();
        drawHeader();
      }
      const isCredit = r.category?.type === 'credit';
      const amount = Number(r.amount);
      if (isCredit) totalCredit += amount; else totalDebit += amount;

      const rowY = doc.y;
      doc.text(r.expense_date ?? '', cols[0].x, rowY, { width: cols[0].width });
      doc.text(r.category?.name ?? '', cols[1].x, rowY, { width: cols[1].width });
      doc.text(r.description ?? '', cols[2].x, rowY, { width: cols[2].width });
      doc.text(r.paid_to ?? '', cols[3].x, rowY, { width: cols[3].width });
      doc.fillColor(isCredit ? '#1a8a3d' : '#c62828')
        .text(`${isCredit ? '+' : '-'}${amount.toFixed(2)}`, cols[4].x, rowY, { width: cols[4].width });
      doc.fillColor('#000');
      doc.moveDown(0.6);
    }

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Credit: ${totalCredit.toFixed(2)}`, 360, doc.y, { width: 195 });
    doc.text(`Total Debit: ${totalDebit.toFixed(2)}`, 360, doc.y, { width: 195 });
    doc.text(`Net: ${(totalCredit - totalDebit).toFixed(2)}`, 360, doc.y, { width: 195 });

    doc.end();
  }

  async createExpense(shopId: string, body: any) {
    const { categoryId, description, amount, expenseDate, paidTo, trainerId, invoiceUrl } = body;
    if (!categoryId || !description || !amount) throw new AppError('Category, description and amount required', 400);

    const category: any = await this.expenseCategory.findOne({ _id: categoryId, shop_id: shopId });
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
    });

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

  async updateExpense(shopId: string, id: string, body: any) {
    const expense: any = await this.expense.findOne({ _id: id, shop_id: shopId });
    if (!expense) throw new AppError('Expense not found', 404);
    const { categoryId, description, amount, expenseDate, paidTo, invoiceUrl } = body;
    let category: any = null;
    if (categoryId) {
      category = await this.expenseCategory.findOne({ _id: categoryId, shop_id: shopId });
      if (!category) throw new AppError('Invalid expense category', 400);
    }

    const ownsLedgerEntry = await this.ledger.hasEntry({
      shopId, reference: 'expense', referenceId: expense.id,
    });

    await expense.set({
      category_id: categoryId || expense.category_id,
      description: description || expense.description,
      amount: amount || expense.amount,
      expense_date: expenseDate || expense.expense_date,
      paid_to: paidTo !== undefined ? paidTo : expense.paid_to,
      invoice_url: invoiceUrl !== undefined ? invoiceUrl : expense.invoice_url,
    }).save();

    if (!ownsLedgerEntry) {
      return new ApiPayload(expense, 'Transaction updated');
    }

    if (!category) category = await this.expenseCategory.findById(expense.category_id);
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

  async deleteExpense(shopId: string, id: string) {
    const expense: any = await this.expense.findOne({ _id: id, shop_id: shopId });
    if (!expense) throw new AppError('Expense not found', 404);
    await this.ledger.removeByReference({ shopId, reference: 'expense', referenceId: expense.id });
    await expense.deleteOne();
    return new ApiPayload(null, 'Transaction deleted');
  }
}
