'use strict';

// Runs right after users are created. Introduces the multi-tenant "shop"
// layer plus the platform-subscription tables that gym owners pay us for.
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    };

    await queryInterface.createTable('shops', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      owner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      phone: { type: Sequelize.STRING(20) },
      email: { type: Sequelize.STRING(255) },
      address: { type: Sequelize.TEXT },
      logo_url: { type: Sequelize.TEXT },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...ts,
    });

    await queryInterface.createTable('shop_subscription_plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      plan_type: { type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false },
      duration_days: { type: Sequelize.INTEGER, allowNull: false },
      base_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      discount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      sell_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      description: { type: Sequelize.TEXT },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });

    await queryInterface.createTable('shop_subscriptions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'shop_subscription_plans', key: 'id' },
      },
      base_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      sell_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('active', 'expired', 'cancelled', 'pending'), allowNull: false, defaultValue: 'active' },
      razorpay_order_id: { type: Sequelize.STRING },
      razorpay_payment_id: { type: Sequelize.STRING },
      ...ts,
    });
    await queryInterface.addIndex('shop_subscriptions', ['shop_id', 'status'], { name: 'idx_shop_subs_shop_status' });

    await queryInterface.createTable('expense_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false, defaultValue: 'debit' },
      ...ts,
    });
    await queryInterface.addIndex('expense_categories', ['shop_id'], { name: 'idx_expense_categories_shop' });

    await queryInterface.createTable('ledger', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.ENUM('credit', 'debit'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      reference: { type: Sequelize.STRING(50) },
      reference_id: { type: Sequelize.INTEGER },
      entry_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      ...ts,
    });
    await queryInterface.addIndex('ledger', ['shop_id'], { name: 'idx_ledger_shop' });

    // Tenant membership + member govt id on users
    await queryInterface.addColumn('users', 'shop_id', {
      type: Sequelize.INTEGER,
      references: { model: 'shops', key: 'id' },
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('users', 'govt_id_url', { type: Sequelize.TEXT });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'govt_id_url');
    await queryInterface.removeColumn('users', 'shop_id');
    await queryInterface.dropTable('ledger');
    await queryInterface.dropTable('expense_categories');
    await queryInterface.dropTable('shop_subscriptions');
    await queryInterface.dropTable('shop_subscription_plans');
    await queryInterface.dropTable('shops');
  },
};
