'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workout_plans', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      trainer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      member_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT },
      goal: { type: Sequelize.STRING(100) },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      start_date: { type: Sequelize.DATEONLY },
      end_date: { type: Sequelize.DATEONLY },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('workout_days', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      workout_plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workout_plans', key: 'id' },
        onDelete: 'CASCADE',
      },
      day_of_week: {
        type: Sequelize.DataTypes.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        allowNull: false,
      },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('workout_exercises', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      workout_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'workout_days', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      sets: { type: Sequelize.INTEGER },
      reps: { type: Sequelize.INTEGER },
      duration_secs: { type: Sequelize.INTEGER },
      rest_secs: { type: Sequelize.INTEGER, defaultValue: 60 },
      notes: { type: Sequelize.TEXT },
      order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('workout_exercises');
    await queryInterface.dropTable('workout_days');
    await queryInterface.dropTable('workout_plans');
  },
};
