'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Expense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  expense_date: { type: DataTypes.DATEONLY },
  paid_to: { type: DataTypes.STRING(150) },
  trainer_id: { type: DataTypes.INTEGER },
  invoice_url: { type: DataTypes.TEXT },
  product_sale_id: { type: DataTypes.INTEGER },
}, { tableName: 'expenses', underscored: true });
