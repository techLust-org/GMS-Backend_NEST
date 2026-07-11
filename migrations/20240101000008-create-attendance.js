'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      member_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      attendance_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      check_in_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      check_out_time: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('attendance', {
      fields: ['member_id', 'attendance_date'],
      type: 'unique',
      name: 'unique_member_attendance_date',
    });

    await queryInterface.addIndex('attendance', ['attendance_date'], { name: 'idx_attendance_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance');
  },
};
