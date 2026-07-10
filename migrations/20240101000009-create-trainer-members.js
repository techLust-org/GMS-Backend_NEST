'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trainer_members', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trainer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('trainer_members', ['trainer_id', 'is_active'], { name: 'idx_tm_trainer' });
    await queryInterface.addIndex('trainer_members', ['member_id', 'is_active'], { name: 'idx_tm_member' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trainer_members');
  },
};
