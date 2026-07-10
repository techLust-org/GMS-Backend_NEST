'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DietPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  trainer_id: { type: DataTypes.INTEGER, allowNull: false },
  member_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  daily_calories: { type: DataTypes.INTEGER },
  protein_grams: { type: DataTypes.INTEGER },
  carbs_grams: { type: DataTypes.INTEGER },
  fat_grams: { type: DataTypes.INTEGER },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'diet_plans', underscored: true });
