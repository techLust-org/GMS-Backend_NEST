'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  trainer_id: { type: DataTypes.INTEGER, allowNull: false },
  member_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  goal: { type: DataTypes.STRING(100) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
}, { tableName: 'workout_plans', underscored: true });
