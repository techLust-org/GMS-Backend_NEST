'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  member_id: { type: DataTypes.INTEGER, allowNull: false },
  attendance_date: { type: DataTypes.DATEONLY, allowNull: false },
  check_in_time: { type: DataTypes.DATE, allowNull: false },
  check_out_time: { type: DataTypes.DATE },
}, { tableName: 'attendance', underscored: true });
