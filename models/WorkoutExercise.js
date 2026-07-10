'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutExercise', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  workout_day_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  sets: { type: DataTypes.INTEGER },
  reps: { type: DataTypes.INTEGER },
  duration_secs: { type: DataTypes.INTEGER },
  rest_secs: { type: DataTypes.INTEGER, defaultValue: 60 },
  notes: { type: DataTypes.TEXT },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'workout_exercises', underscored: true });
