'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutPlan', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  trainer_id: { type: DataTypes.UUID, allowNull: false },
  member_id: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  goal: { type: DataTypes.STRING(100) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
}, { tableName: 'workout_plans', underscored: true });
