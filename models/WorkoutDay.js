'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('WorkoutDay', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  workout_plan_id: { type: DataTypes.UUID, allowNull: false },
  day_of_week: {
    type: DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false,
  },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'workout_days', underscored: true });
