import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseCategory } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectModel(ExpenseCategory.name) private readonly expenseCategory: Model<any>,
    @InjectModel(Expense.name) private readonly expense: Model<any>,
  ) {}

  async list(shopId: string) {
    return this.expenseCategory.find({ shop_id: shopId }).sort({ name: 1 });
  }

  async create(shopId: string, body: any) {
    const { name, type = 'debit' } = body;
    if (!name) throw new AppError('Name required', 400);
    if (!['credit', 'debit'].includes(type)) throw new AppError('Type must be credit or debit', 400);
    const category = await this.expenseCategory.create({ shop_id: shopId, name, type });
    return new ApiPayload(category, 'Category created');
  }

  async update(shopId: string, id: string, body: any) {
    const category: any = await this.expenseCategory.findOne({ _id: id, shop_id: shopId });
    if (!category) throw new AppError('Category not found', 404);
    const { name, type } = body;
    if (type && !['credit', 'debit'].includes(type)) throw new AppError('Type must be credit or debit', 400);
    await category.set({ name: name || category.name, type: type || category.type }).save();
    return new ApiPayload(category, 'Category updated');
  }

  async remove(shopId: string, id: string) {
    const category: any = await this.expenseCategory.findOne({ _id: id, shop_id: shopId });
    if (!category) throw new AppError('Category not found', 404);
    // Expenses reference their category (ON DELETE RESTRICT in the old
    // schema) — refusing here keeps that integrity rule, surfacing as the
    // same 500 the FK violation produced.
    if (await this.expense.exists({ category_id: category.id })) {
      throw new Error(`Expense category ${category.id} is still referenced by expenses`);
    }
    await category.deleteOne();
    return new ApiPayload(null, 'Category deleted');
  }
}
