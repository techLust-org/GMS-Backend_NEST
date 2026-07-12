'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Shop', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(150), allowNull: false },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  email: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.TEXT },
  logo_url: { type: DataTypes.TEXT },
  cover_image_url: { type: DataTypes.TEXT },
  theme_color: { type: DataTypes.STRING(7) },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_closed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'shops', underscored: true });
