import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductSale, Payment, Expense, ExpenseCategory } from '../../models';
import { LedgerService } from '../../shared/ledger.service';
import { AppError } from '../../common/app-error';
import { ApiPayload } from '../../common/api-payload';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly product: Model<any>,
    @InjectModel(ProductSale.name) private readonly productSale: Model<any>,
    @InjectModel(Payment.name) private readonly payment: Model<any>,
    @InjectModel(Expense.name) private readonly expense: Model<any>,
    @InjectModel(ExpenseCategory.name) private readonly expenseCategory: Model<any>,
    private readonly ledger: LedgerService,
  ) {}

  // Buying stock costs the owner money — log a "Product Cost" (money out) row.
  private async recordStockExpense(shopId: string, product: any, quantityAdded: number) {
    if (quantityAdded <= 0) return;
    const costPrice = parseFloat(product.cost_price) || 0;
    const amount = costPrice * quantityAdded;
    if (amount <= 0) return;

    const category: any = await this.expenseCategory.findOneAndUpdate(
      { shop_id: shopId, name: 'Product Cost', type: 'debit' },
      { $setOnInsert: { shop_id: shopId, name: 'Product Cost', type: 'debit' } },
      { upsert: true, new: true },
    );

    const expenseDate = new Date().toISOString().split('T')[0];
    const expense: any = await this.expense.create({
      shop_id: shopId,
      category_id: category.id,
      description: `${quantityAdded} × ${product.name} restocked (cost ₹${costPrice.toFixed(0)}, sell ₹${parseFloat(product.sell_price).toFixed(0)} each)`,
      amount,
      expense_date: expenseDate,
    });

    await this.ledger.record({
      shopId, type: 'debit', amount, reference: 'expense', referenceId: expense.id, entryDate: expenseDate,
    });
  }

  async list(shopId: string, query: any) {
    const { category, lowStock, page = 1, limit = 10 } = query;
    const where: any = { shop_id: shopId, is_active: true };
    if (category) where.category = category;

    if (lowStock === 'true') {
      // stock_qty <= low_stock_threshold is a column-to-column comparison,
      // so filter in memory rather than pushing it into the WHERE clause.
      const products: any[] = await this.product.find(where).sort({ name: 1 });
      const filtered = products.filter((p) => p.stock_qty <= p.low_stock_threshold);
      const offset = (page - 1) * limit;
      const rows = filtered.slice(offset, offset + Number(limit));
      return new ApiPayload(rows, 'Products fetched', { total: filtered.length, page: +page, limit: +limit });
    }

    const offset = (page - 1) * limit;
    const [count, rows] = await Promise.all([
      this.product.countDocuments(where),
      this.product
        .find(where)
        .sort({ name: 1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);
    return new ApiPayload(rows, 'Products fetched', { total: count, page: +page, limit: +limit });
  }

  async create(shopId: string, body: any) {
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
    });
    await this.recordStockExpense(shopId, product, product.stock_qty);
    return new ApiPayload(product, 'Product created');
  }

  async get(shopId: string, id: string) {
    const product = await this.product
      .findOne({ _id: id, shop_id: shopId })
      .populate({ path: 'sales', options: { sort: { createdAt: -1 }, perDocumentLimit: 10 } });
    if (!product) throw new AppError('Product not found', 404);
    return product;
  }

  async update(shopId: string, id: string, body: any) {
    const product: any = await this.product.findOne({ _id: id, shop_id: shopId });
    if (!product) throw new AppError('Product not found', 404);
    const { name, description, costPrice, discount, sellPrice, category, sku,
      stockQty, photoUrl, lowStockThreshold, isActive } = body;

    const oldStockQty = product.stock_qty;
    const newStockQty = stockQty !== undefined ? parseInt(stockQty) : product.stock_qty;

    await product.set({
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
    }).save();

    const delta = newStockQty - oldStockQty;
    if (delta > 0) await this.recordStockExpense(shopId, product, delta);

    return new ApiPayload(product, 'Product updated');
  }

  async remove(shopId: string, id: string) {
    const product: any = await this.product.findOne({ _id: id, shop_id: shopId });
    if (!product) throw new AppError('Product not found', 404);
    await product.set({ is_active: false }).save();
    return new ApiPayload(null, 'Product deleted');
  }

  async restock(shopId: string, id: string, body: any) {
    const product: any = await this.product.findOne({ _id: id, shop_id: shopId });
    if (!product) throw new AppError('Product not found', 404);
    const { quantity } = body;
    if (!quantity || quantity < 1) throw new AppError('Valid quantity required', 400);
    const qty = parseInt(quantity);
    await product.set({ stock_qty: product.stock_qty + qty }).save();
    await this.recordStockExpense(shopId, product, qty);
    return new ApiPayload(product, 'Stock updated');
  }

  async recordSale(shopId: string, userId: string, body: any) {
    const { productId, memberId, quantity = 1, paymentMode = 'cash', orderMode = 'offline', transactionId } = body;
    const product: any = await this.product.findOne({ _id: productId, shop_id: shopId });
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
    });

    await product.set({ stock_qty: product.stock_qty - quantity }).save();

    if (memberId) {
      await this.payment.create({
        shop_id: shopId,
        member_id: memberId,
        product_sale_id: sale.id,
        amount: total_price,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMode,
      });
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

  async getSales(shopId: string, query: any) {
    const { from, to, productId } = query;
    const where: any = { shop_id: shopId };
    if (productId) where.product_id = productId;
    if (from || to) {
      where.sale_date = {};
      if (from) where.sale_date.$gte = from;
      if (to) where.sale_date.$lte = to;
    }
    return this.productSale
      .find(where)
      .populate([
        { path: 'product', select: 'name category' },
        { path: 'buyer', select: 'first_name last_name' },
      ])
      .sort({ createdAt: -1 });
  }
}
