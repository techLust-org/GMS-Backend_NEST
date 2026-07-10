'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Shop', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  owner_id: { type: DataTypes.INTEGER, allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.TEXT },
  logo_url: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'shops', underscored: true });
