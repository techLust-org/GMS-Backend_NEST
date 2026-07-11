'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutExercise', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  workout_day_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  sets: { type: DataTypes.INTEGER },
  reps: { type: DataTypes.INTEGER },
  duration_secs: { type: DataTypes.INTEGER },
  rest_secs: { type: DataTypes.INTEGER, defaultValue: 60 },
  notes: { type: DataTypes.TEXT },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'workout_exercises', underscored: true });
