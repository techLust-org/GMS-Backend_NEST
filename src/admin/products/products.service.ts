import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Product, ProductSale, Payment, User, Expense, ExpenseCategory } from '../../models';
import { LedgerService } from '../../shared/ledger.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product) private readonly product: typeof Product,
    @InjectModel(ProductSale) private readonly productSale: typeof ProductSale,
    @InjectModel(Payment) private readonly payment: typeof Payment,
    @InjectModel(Expense) private readonly expense: typeof Expense,
    @InjectModel(ExpenseCategory) private readonly expenseCategory: typeof ExpenseCategory,
    private readonly ledger: LedgerService,
  ) {}

  // Buying stock costs the owner money — log a "Product Cost" (money out) row.
  private async recordStockExpense(shopId: number, product: any, quantityAdded: number) {
    if (quantityAdded <= 0) return;
    const costPrice = parseFloat(product.cost_price) || 0;
    const amount = costPrice * quantityAdded;
    if (amount <= 0) return;

    const [category]: any = await this.expenseCategory.findOrCreate({
      where: { shop_id: shopId, name: 'Product Cost', type: 'debit' },
      defaults: { shop_id: shopId, name: 'Product Cost', type: 'debit' } as any,
    });

    const expenseDate = new Date().toISOString().split('T')[0];
    const expense: any = await this.expense.create({
      shop_id: shopId,
      category_id: category.id,
      description: `${quantityAdded} × ${product.name} restocked (cost ₹${costPrice.toFixed(0)}, sell ₹${parseFloat(product.sell_price).toFixed(0)} each)`,
      amount,
      expense_date: expenseDate,
    } as any);

    await this.ledger.record({
      shopId, type: 'debit', amount, reference: 'expense', referenceId: expense.id, entryDate: expenseDate,
    });
  }

  async list(shopId: number, query: any) {
    const { category, lowStock } = query;
    const where: any = { shop_id: shopId, is_active: true };
    if (category) where.category = category;
    const products: any[] = await this.product.findAll({ where, order: [['name', 'ASC']] });
    let result = products;
    if (lowStock === 'true') result = products.filter((p) => p.stock_qty <= p.low_stock_threshold);
    return result;
  }

  async create(shopId: number, body: any) {
    const { name, description, costPrice, discount, sellPrice, stockQty,
      category, sku, photoUrl, lowStockThreshold } = body;
    if (!name || sellPrice === undefined) throw new AppError('Name and sell price required', 400);
    const product: any = await this.product.create({
      shop_id: shopId,
      name, description,
      cost_price: costPrice || 0,
      discount: discount || 0,
      sell_price: sellPrice,
      stock_qty: stockQty || 0,
      category, sku,
      photo_url: photoUrl,
      low_stock_threshold: lowStockThreshold || 5,
    } as any);
    await this.recordStockExpense(shopId, product, product.stock_qty);
    return new ApiPayload(product, 'Product created');
  }

  async get(shopId: number, id: number) {
    const product = await this.product.findOne({
      where: { id, shop_id: shopId },
      include: [{ model: ProductSale, as: 'sales', limit: 10, order: [['created_at', 'DESC']] }],
    });
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async update(shopId: number, id: number, body: any) {
    const product: any = await this.product.findOne({ where: { id, shop_id: shopId } });
    if (!product) throw new AppError('Product not found', 404);
    const { name, description, costPrice, discount, sellPrice, category, sku,
      stockQty, photoUrl, lowStockThreshold, isActive } = body;

    const oldStockQty = product.stock_qty;
    const newStockQty = stockQty !== undefined ? parseInt(stockQty) : product.stock_qty;

    await product.update({
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      cost_price: costPrice !== undefined ? costPrice : product.cost_price,
      discount: discount !== undefined ? discount : product.discount,
      sell_price: sellPrice !== undefined ? sellPrice : product.sell_price,
      category: category !== undefined ? category : product.category,
      sku: sku !== undefined ? sku : product.sku,
      stock_qty: newStockQty,
      photo_url: photoUrl !== undefined ? photoUrl : product.photo_url,
      low_stock_threshold: lowStockThreshold || product.low_stock_threshold,
      is_active: isActive !== undefined ? isActive : product.is_active,
    });

    const delta = newStockQty - oldStockQty;
    if (delta > 0) await this.recordStockExpense(shopId, product, delta);

    return new ApiPayload(product, 'Product updated');
  }

  async remove(shopId: number, id: number) {
    const product: any = await this.product.findOne({ where: { id, shop_id: shopId } });
    if (!product) throw new AppError('Product not found', 404);
    await product.update({ is_active: false });
    return new ApiPayload(null, 'Product deleted');
  }

  async restock(shopId: number, id: number, body: any) {
    const product: any = await this.product.findOne({ where: { id, shop_id: shopId } });
    if (!product) throw new AppError('Product not found', 404);
    const { quantity } = body;
    if (!quantity || quantity < 1) throw new AppError('Valid quantity required', 400);
    const qty = parseInt(quantity);
    await product.update({ stock_qty: product.stock_qty + qty });
    await this.recordStockExpense(shopId, product, qty);
    return new ApiPayload(product, 'Stock updated');
  }

  async recordSale(shopId: number, userId: number, body: any) {
    const { productId, memberId, quantity = 1, paymentMode = 'cash', orderMode = 'offline', transactionId } = body;
    const product: any = await this.product.findOne({ where: { id: productId, shop_id: shopId } });
    if (!product) throw new AppError('Product not found', 404);
    if (product.stock_qty < quantity) throw new AppError('Insufficient stock', 400);

    const total_price = parseFloat(product.sell_price) * quantity;
    const status = orderMode === 'offline' ? 'delivered' : 'pending';
    const sale: any = await this.productSale.create({
      shop_id: shopId,
      product_id: productId,
      member_id: memberId || null,
      quantity,
      unit_price: product.sell_price,
      total_price,
      order_mode: orderMode,
      payment_mode: paymentMode,
      transaction_id: transactionId || null,
      sold_by: userId,
      sale_date: new Date().toISOString().split('T')[0],
      status,
    } as any);

    await product.update({ stock_qty: product.stock_qty - quantity });

    if (memberId) {
      await this.payment.create({
        shop_id: shopId,
        member_id: memberId,
        product_sale_id: sale.id,
        amount: total_price,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMode,
      } as any);
    }

    await this.ledger.record({
      shopId,
      type: 'credit',
      amount: total_price,
      reference: 'sale',
      referenceId: sale.id,
    });

    return new ApiPayload(sale, 'Sale recorded');
  }

  async getSales(shopId: number, query: any) {
    const { from, to, productId } = query;
    const where: any = { shop_id: shopId };
    if (productId) where.product_id = productId;
    if (from || to) {
      where.sale_date = {};
      if (from) where.sale_date[Op.gte] = from;
      if (to) where.sale_date[Op.lte] = to;
    }
    return this.productSale.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'category'] },
        { model: User, as: 'buyer', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
  }
}
