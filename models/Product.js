'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Product', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  cost_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  stock_qty: { type: DataTypes.INTEGER, defaultValue: 0 },
  category: { type: DataTypes.STRING(100) },
  sku: { type: DataTypes.STRING(100), unique: true },
  photo_url: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  low_stock_threshold: { type: DataTypes.INTEGER, defaultValue: 5 },
}, { tableName: 'products', underscored: true });
