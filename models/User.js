'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  shop_id: { type: DataTypes.INTEGER },
  first_name: { type: DataTypes.STRING(50), allowNull: false },
  last_name: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  date_of_birth: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.ENUM('male', 'female', 'other') },
  profile_pic: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' },
  hire_date: { type: DataTypes.DATEONLY },
  salary: { type: DataTypes.DECIMAL(10, 2) },
  emergency_contact: { type: DataTypes.STRING(100) },
  specialization: { type: DataTypes.STRING(150) },
  bio: { type: DataTypes.TEXT },
  govt_id_url: { type: DataTypes.TEXT },
}, {
  tableName: 'users',
  underscored: true,
  defaultScope: { attributes: { exclude: ['password_hash'] } },
  scopes: { withPassword: { attributes: {} } },
});
