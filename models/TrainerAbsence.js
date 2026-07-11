'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('TrainerAbsence', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  trainer_id: { type: DataTypes.UUID, allowNull: false },
  absence_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT },
  notified: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'trainer_absences', underscored: true });
