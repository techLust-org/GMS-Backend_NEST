'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shop_id: { type: DataTypes.INTEGER },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
      'trainer_absence', 'gym_announcement', 'subscription_purchased',
      'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled'
    ),
    allowNull: false,
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  related_id: { type: DataTypes.INTEGER },
}, { tableName: 'notifications', underscored: true });
