'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscriptions', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      member_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'subscription_plans', key: 'id' },
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.DataTypes.ENUM('active', 'expired', 'cancelled', 'pending'),
        allowNull: false,
        defaultValue: 'active',
      },
      amount_paid: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payment_method: { type: Sequelize.STRING(50), defaultValue: 'cash' },
      payment_ref: { type: Sequelize.STRING(100) },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('subscriptions', ['member_id'], { name: 'idx_subscriptions_member' });
    await queryInterface.addIndex('subscriptions', ['end_date'], { name: 'idx_subscriptions_end_date' });
    await queryInterface.addIndex('subscriptions', ['status'], { name: 'idx_subscriptions_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subscriptions');
  },
};
