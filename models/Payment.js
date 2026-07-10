'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  member_id: { type: DataTypes.INTEGER, allowNull: false },
  subscription_id: { type: DataTypes.INTEGER },
  product_sale_id: { type: DataTypes.INTEGER },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  payment_method: { type: DataTypes.STRING(50), defaultValue: 'cash' },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'payments', underscored: true });
