'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otp_requests', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      phone: { type: Sequelize.STRING(20), allowNull: false },
      code_hash: { type: Sequelize.STRING, allowNull: false },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('otp_requests', ['phone'], { name: 'idx_otp_requests_phone' });
    // Non-unique — phone is optional and not enforced unique at the DB
    // level yet, so lookups just need to be fast, not exclusive.
    await queryInterface.addIndex('users', ['phone'], { name: 'idx_users_phone' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_phone');
    await queryInterface.dropTable('otp_requests');
  },
};
