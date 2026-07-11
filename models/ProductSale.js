'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('ProductSale', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  product_id: { type: DataTypes.UUID, allowNull: false },
  member_id: { type: DataTypes.UUID },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  order_mode: { type: DataTypes.ENUM('offline', 'online'), defaultValue: 'offline' },
  payment_mode: { type: DataTypes.ENUM('cash', 'upi', 'card', 'razorpay'), defaultValue: 'cash' },
  transaction_id: { type: DataTypes.STRING },
  order_id: { type: DataTypes.STRING },
  sold_by: { type: DataTypes.UUID },
  sale_date: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('pending', 'shipped', 'delivered', 'cancelled'), allowNull: false, defaultValue: 'pending' },
}, { tableName: 'product_sales', underscored: true });
