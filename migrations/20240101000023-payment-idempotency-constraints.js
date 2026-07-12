'use strict';

// Idempotency guardrails: a Razorpay payment ID (or an order's line items)
// must never be able to back more than one committed transaction, even
// under concurrent duplicate submissions. Application-level pre-checks
// alone can't close that race — a DB-level unique constraint is the actual
// source of truth in a race, and the service layer catches the resulting
// SequelizeUniqueConstraintError to respond idempotently.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;

    // Seed data uses the literal placeholder 'seed_pay'/'seed_order' across
    // many rows (not real Razorpay IDs) — clear it so it doesn't collide
    // with the new unique constraints below.
    await queryInterface.bulkUpdate(
      'shop_subscriptions',
      { razorpay_payment_id: null, razorpay_order_id: null },
      { razorpay_payment_id: 'seed_pay' },
    );
    await queryInterface.bulkUpdate(
      'subscriptions',
      { razorpay_payment_id: null, razorpay_order_id: null },
      { razorpay_payment_id: 'seed_pay' },
    );
    await queryInterface.bulkUpdate(
      'product_sales',
      { transaction_id: null, order_id: null },
      { transaction_id: 'seed_pay' },
    );

    await queryInterface.addIndex('shop_subscriptions', ['razorpay_payment_id'], {
      name: 'uniq_shop_subscriptions_razorpay_payment_id',
      unique: true,
      where: { razorpay_payment_id: { [Op.ne]: null } },
    });
    await queryInterface.addIndex('subscriptions', ['razorpay_payment_id'], {
      name: 'uniq_subscriptions_razorpay_payment_id',
      unique: true,
      where: { razorpay_payment_id: { [Op.ne]: null } },
    });
    await queryInterface.addIndex('product_sales', ['order_id', 'product_id'], {
      name: 'uniq_product_sales_order_product',
      unique: true,
      where: { order_id: { [Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('shop_subscriptions', 'uniq_shop_subscriptions_razorpay_payment_id');
    await queryInterface.removeIndex('subscriptions', 'uniq_subscriptions_razorpay_payment_id');
    await queryInterface.removeIndex('product_sales', 'uniq_product_sales_order_product');
  },
};
