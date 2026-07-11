'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('DietMeal', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  diet_plan_id: { type: DataTypes.UUID, allowNull: false },
  meal_name: { type: DataTypes.STRING(100), allowNull: false },
  meal_time: { type: DataTypes.STRING(10) },
  foods: { type: DataTypes.TEXT, allowNull: false },
  calories: { type: DataTypes.INTEGER },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'diet_meals', underscored: true });
