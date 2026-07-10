'use strict';

// Trailing migration: makes every business table tenant-aware (shop_id) and
// applies the new pricing / sale / expense-category structure. Runs on empty
// tables (before seeders), so NOT NULL additions are safe.
const SHOP_SCOPED = [
  'subscription_plans', 'subscriptions', 'payments', 'attendance',
  'trainer_members', 'workout_plans', 'diet_plans', 'products',
  'product_sales', 'expenses', 'trainer_absences',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const shopFk = (allowNull) => ({
      type: Sequelize.INTEGER,
      allowNull,
      references: { model: 'shops', key: 'id' },
      onDelete: 'CASCADE',
    });

    for (const table of SHOP_SCOPED) {
      await queryInterface.addColumn(table, 'shop_id', shopFk(false));
      await queryInterface.addIndex(table, ['shop_id'], { name: `idx_${table}_shop` });
    }
    // Notifications may be shop-wide announcements; nullable + no cascade index needed.
    await queryInterface.addColumn('notifications', 'shop_id', {
      type: Sequelize.INTEGER,
      references: { model: 'shops', key: 'id' },
      onDelete: 'SET NULL',
    });

    // subscription_plans: price -> base_price/discount/sell_price
    await queryInterface.removeColumn('subscription_plans', 'price');
    await queryInterface.addColumn('subscription_plans', 'base_price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('subscription_plans', 'discount', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('subscription_plans', 'sell_price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

    // subscriptions: pricing + razorpay refs
    await queryInterface.addColumn('subscriptions', 'base_price', { type: Sequelize.DECIMAL(10, 2) });
    await queryInterface.addColumn('subscriptions', 'sell_price', { type: Sequelize.DECIMAL(10, 2) });
    await queryInterface.addColumn('subscriptions', 'razorpay_order_id', { type: Sequelize.STRING });
    await queryInterface.addColumn('subscriptions', 'razorpay_payment_id', { type: Sequelize.STRING });

    // products: price -> cost_price/discount/sell_price + photo
    await queryInterface.removeColumn('products', 'price');
    await queryInterface.addColumn('products', 'cost_price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('products', 'discount', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('products', 'sell_price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('products', 'photo_url', { type: Sequelize.TEXT });

    // product_sales: order/payment mode + txn refs
    await queryInterface.addColumn('product_sales', 'order_mode', { type: Sequelize.ENUM('offline', 'online'), allowNull: false, defaultValue: 'offline' });
    await queryInterface.addColumn('product_sales', 'payment_mode', { type: Sequelize.ENUM('cash', 'upi', 'card', 'razorpay'), allowNull: false, defaultValue: 'cash' });
    await queryInterface.addColumn('product_sales', 'transaction_id', { type: Sequelize.STRING });
    await queryInterface.addColumn('product_sales', 'order_id', { type: Sequelize.STRING });

    // expenses: category enum -> category_id FK, receipt_url -> invoice_url
    await queryInterface.removeColumn('expenses', 'category');
    await queryInterface.removeColumn('expenses', 'receipt_url');
    await queryInterface.addColumn('expenses', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'expense_categories', key: 'id' },
      onDelete: 'RESTRICT',
    });
    await queryInterface.addColumn('expenses', 'invoice_url', { type: Sequelize.TEXT });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('expenses', 'invoice_url');
    await queryInterface.removeColumn('expenses', 'category_id');
    await queryInterface.addColumn('expenses', 'receipt_url', { type: Sequelize.TEXT });
    await queryInterface.addColumn('expenses', 'category', {
      type: Sequelize.ENUM('trainer_salary', 'equipment', 'utilities', 'rent', 'maintenance', 'other'),
      allowNull: false, defaultValue: 'other',
    });

    for (const col of ['order_mode', 'payment_mode', 'transaction_id', 'order_id']) {
      await queryInterface.removeColumn('product_sales', col);
    }

    await queryInterface.removeColumn('products', 'photo_url');
    for (const col of ['cost_price', 'discount', 'sell_price']) {
      await queryInterface.removeColumn('products', col);
    }
    await queryInterface.addColumn('products', 'price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

    for (const col of ['base_price', 'sell_price', 'razorpay_order_id', 'razorpay_payment_id']) {
      await queryInterface.removeColumn('subscriptions', col);
    }

    for (const col of ['base_price', 'discount', 'sell_price']) {
      await queryInterface.removeColumn('subscription_plans', col);
    }
    await queryInterface.addColumn('subscription_plans', 'price', { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 });

    await queryInterface.removeColumn('notifications', 'shop_id');
    for (const table of SHOP_SCOPED) {
      await queryInterface.removeColumn(table, 'shop_id');
    }
  },
};
