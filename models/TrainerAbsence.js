'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('TrainerAbsence', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  trainer_id: { type: DataTypes.INTEGER, allowNull: false },
  absence_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT },
  notified: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'trainer_absences', underscored: true });
