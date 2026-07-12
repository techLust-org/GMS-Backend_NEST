'use strict';

// Records exactly what a Razorpay order was created for (plan/items +
// amount), resolved server-side, at the moment createOrder() runs — so the
// later purchase()/activate() confirm step can grant what was actually
// PAID for instead of trusting a client-resubmitted planId/items/amount
// alongside a signature that only proves *some* payment is genuine.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pending_payments', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      shop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      kind: { type: Sequelize.STRING(30), allowNull: false },
      razorpay_order_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      consumed_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pending_payments');
  },
};
