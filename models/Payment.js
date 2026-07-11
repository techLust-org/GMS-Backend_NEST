'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Payment', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  member_id: { type: DataTypes.UUID, allowNull: false },
  subscription_id: { type: DataTypes.UUID },
  product_sale_id: { type: DataTypes.UUID },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  payment_method: { type: DataTypes.STRING(50), defaultValue: 'cash' },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'payments', underscored: true });
