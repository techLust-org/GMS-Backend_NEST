'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_sales', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' },
      },
      member_id: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      total_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      sold_by: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      sale_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('product_sales', ['sale_date'], { name: 'idx_product_sales_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_sales');
  },
};
