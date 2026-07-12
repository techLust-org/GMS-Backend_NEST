'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    await queryInterface.addColumn('users', 'google_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addIndex('users', ['google_id'], {
      name: 'uniq_users_google_id',
      unique: true,
      where: { google_id: { [Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'uniq_users_google_id');
    await queryInterface.removeColumn('users', 'google_id');
  },
};
