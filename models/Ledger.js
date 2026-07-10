'use strict';
const { DataTypes } = require('sequelize');

// Backend-only cashflow log per shop.
module.exports = (sequelize) => sequelize.define('Ledger', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reference: { type: DataTypes.STRING(50) },
  reference_id: { type: DataTypes.INTEGER },
  entry_date: { type: DataTypes.DATEONLY },
}, { tableName: 'ledger', underscored: true });
