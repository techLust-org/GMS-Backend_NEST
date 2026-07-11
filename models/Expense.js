'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Expense', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  category_id: { type: DataTypes.UUID, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  expense_date: { type: DataTypes.DATEONLY },
  paid_to: { type: DataTypes.STRING(150) },
  trainer_id: { type: DataTypes.UUID },
  invoice_url: { type: DataTypes.TEXT },
  product_sale_id: { type: DataTypes.UUID },
}, { tableName: 'expenses', underscored: true });
