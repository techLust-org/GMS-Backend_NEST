'use strict';
const { DataTypes } = require('sequelize');

// Backend-only cashflow log per shop.
module.exports = (sequelize) => sequelize.define('Ledger', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  shop_id: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reference: { type: DataTypes.STRING(50) },
  reference_id: { type: DataTypes.UUID },
  entry_date: { type: DataTypes.DATEONLY },
}, { tableName: 'ledger', underscored: true });
