'use strict';
const { DataTypes } = require('sequelize');

// Platform plans that WE sell to gym owners (shops).
module.exports = (sequelize) => sequelize.define('ShopSubscriptionPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  plan_type: { type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false },
  duration_days: { type: DataTypes.INTEGER, allowNull: false },
  base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'shop_subscription_plans', underscored: true });
