'use strict';
const { DataTypes } = require('sequelize');

// A shop's subscription to the platform (owner pays us).
module.exports = (sequelize) => sequelize.define('ShopSubscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'expired', 'cancelled', 'pending'), defaultValue: 'active' },
  razorpay_order_id: { type: DataTypes.STRING },
  razorpay_payment_id: { type: DataTypes.STRING },
}, { tableName: 'shop_subscriptions', underscored: true });
