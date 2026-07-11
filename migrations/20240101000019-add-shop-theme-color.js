'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shops', 'theme_color', {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('shops', 'theme_color');
  },
};
