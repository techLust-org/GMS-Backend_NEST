'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ExpenseCategory', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false, defaultValue: 'debit' },
}, { tableName: 'expense_categories', underscored: true });
