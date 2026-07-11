import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ExpenseCategory } from '../../models';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class ExpenseCategoriesService {
  constructor(@InjectModel(ExpenseCategory) private readonly expenseCategory: typeof ExpenseCategory) {}

  async list(shopId: string) {
    return this.expenseCategory.findAll({
      where: { shop_id: shopId },
      order: [['name', 'ASC']],
    });
  }

  async create(shopId: string, body: any) {
    const { name, type = 'debit' } = body;
    if (!name) throw new AppError('Name required', 400);
    if (!['credit', 'debit'].includes(type)) throw new AppError('Type must be credit or debit', 400);
    const category = await this.expenseCategory.create({ shop_id: shopId, name, type } as any);
    return new ApiPayload(category, 'Category created');
  }

  async update(shopId: string, id: string, body: any) {
    const category: any = await this.expenseCategory.findOne({ where: { id, shop_id: shopId } });
    if (!category) throw new AppError('Category not found', 404);
    const { name, type } = body;
    if (type && !['credit', 'debit'].includes(type)) throw new AppError('Type must be credit or debit', 400);
    await category.update({ name: name || category.name, type: type || category.type });
    return new ApiPayload(category, 'Category updated');
  }

  async remove(shopId: string, id: string) {
    const category: any = await this.expenseCategory.findOne({ where: { id, shop_id: shopId } });
    if (!category) throw new AppError('Category not found', 404);
    await category.destroy();
    return new ApiPayload(null, 'Category deleted');
  }
}
