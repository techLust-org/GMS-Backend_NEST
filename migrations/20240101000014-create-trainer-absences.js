'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trainer_absences', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trainer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      absence_date: { type: Sequelize.DATEONLY, allowNull: false },
      reason: { type: Sequelize.TEXT },
      notified: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('trainer_absences', {
      fields: ['trainer_id', 'absence_date'],
      type: 'unique',
      name: 'unique_trainer_absence_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('trainer_absences');
  },
};
