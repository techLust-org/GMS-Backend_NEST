'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      first_name: { type: Sequelize.STRING(50), allowNull: false },
      last_name: { type: Sequelize.STRING(50), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      phone: { type: Sequelize.STRING(20) },
      date_of_birth: { type: Sequelize.DATEONLY },
      gender: { type: Sequelize.DataTypes.ENUM('male', 'female', 'other') },
      profile_pic: { type: Sequelize.TEXT },
      status: {
        type: Sequelize.DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      hire_date: { type: Sequelize.DATEONLY },
      salary: { type: Sequelize.DECIMAL(10, 2) },
      emergency_contact: { type: Sequelize.STRING(100) },
      specialization: { type: Sequelize.STRING(150) },
      bio: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('users', ['email'], { name: 'idx_users_email' });
    await queryInterface.addIndex('users', ['role_id', 'status'], { name: 'idx_users_role_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
