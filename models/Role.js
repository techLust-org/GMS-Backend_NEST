'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Role', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(20), allowNull: false, unique: true },
}, { tableName: 'roles', underscored: true });
