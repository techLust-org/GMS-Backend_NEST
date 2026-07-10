'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category: {
        type: Sequelize.DataTypes.ENUM('trainer_salary', 'equipment', 'utilities', 'rent', 'maintenance', 'other'),
        allowNull: false,
      },
      description: { type: Sequelize.STRING(255), allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      expense_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      paid_to: { type: Sequelize.STRING(150) },
      trainer_id: {
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      receipt_url: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('expenses', ['expense_date'], { name: 'idx_expenses_date' });
    await queryInterface.addIndex('expenses', ['category'], { name: 'idx_expenses_category' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  },
};
