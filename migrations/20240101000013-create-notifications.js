'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.DataTypes.ENUM(
          'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
          'trainer_absence', 'gym_announcement', 'subscription_purchased'
        ),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      related_id: { type: Sequelize.UUID },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('notifications', ['user_id', 'is_read'], { name: 'idx_notifications_user_unread' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
