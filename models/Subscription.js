'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  member_id: { type: DataTypes.INTEGER, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'expired', 'cancelled', 'pending'), defaultValue: 'active' },
  base_price: { type: DataTypes.DECIMAL(10, 2) },
  sell_price: { type: DataTypes.DECIMAL(10, 2) },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_method: { type: DataTypes.STRING(50), defaultValue: 'cash' },
  payment_ref: { type: DataTypes.STRING(100) },
  razorpay_order_id: { type: DataTypes.STRING },
  razorpay_payment_id: { type: DataTypes.STRING },
}, { tableName: 'subscriptions', underscored: true });
