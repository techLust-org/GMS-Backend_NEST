'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      subscription_id: {
        type: Sequelize.INTEGER,
        references: { model: 'subscriptions', key: 'id' },
        onDelete: 'SET NULL',
      },
      product_sale_id: {
        type: Sequelize.INTEGER,
        references: { model: 'product_sales', key: 'id' },
        onDelete: 'SET NULL',
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payment_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      payment_method: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'cash' },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('payments', ['member_id'], { name: 'idx_payments_member' });
    await queryInterface.addIndex('payments', ['payment_date'], { name: 'idx_payments_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  },
};
