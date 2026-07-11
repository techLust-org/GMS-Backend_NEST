'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('TrainerMember', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  trainer_id: { type: DataTypes.UUID, allowNull: false },
  member_id: { type: DataTypes.UUID, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  assigned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'trainer_members', underscored: true });
