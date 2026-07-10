'use strict';
const { DataTypes } = require('sequelize');

// Member-facing plans, defined per shop by the owner.
module.exports = (sequelize) => sequelize.define('SubscriptionPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  duration: { type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false },
  duration_days: { type: DataTypes.INTEGER, allowNull: false },
  base_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  sell_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'subscription_plans', underscored: true });
