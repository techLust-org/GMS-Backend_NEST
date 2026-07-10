'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('diet_plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trainer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      member_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT },
      daily_calories: { type: Sequelize.INTEGER },
      protein_grams: { type: Sequelize.INTEGER },
      carbs_grams: { type: Sequelize.INTEGER },
      fat_grams: { type: Sequelize.INTEGER },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('diet_meals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      diet_plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'diet_plans', key: 'id' },
        onDelete: 'CASCADE',
      },
      meal_name: { type: Sequelize.STRING(100), allowNull: false },
      meal_time: { type: Sequelize.TIME },
      foods: { type: Sequelize.TEXT, allowNull: false },
      calories: { type: Sequelize.INTEGER },
      order_index: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('diet_meals');
    await queryInterface.dropTable('diet_plans');
  },
};
