'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      stock_qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      category: { type: Sequelize.STRING(100) },
      sku: { type: Sequelize.STRING(100), unique: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      low_stock_threshold: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
