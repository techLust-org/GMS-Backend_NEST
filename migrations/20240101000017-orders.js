'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('product_sales', 'status', {
      type: Sequelize.ENUM('pending', 'shipped', 'delivered', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    });

    // Links an auto-mirrored "Product Sell" expense row back to the sale
    // (or the anchor item of a multi-item order) it represents, so
    // cancelling an order can find and remove the exact mirror row without
    // touching unrelated expenses.
    await queryInterface.addColumn('expenses', 'product_sale_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'product_sales', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('expenses', 'product_sale_id');
    await queryInterface.removeColumn('product_sales', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_sales_status";');
  },
};
