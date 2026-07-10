'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutDay', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  workout_plan_id: { type: DataTypes.INTEGER, allowNull: false },
  day_of_week: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false,
  },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'workout_days', underscored: true });
