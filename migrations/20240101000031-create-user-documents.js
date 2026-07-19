'use strict';

// Personal ID documents uploaded by members/trainers for the gym owner to
// verify. One row per upload; a rejected document is left in place (with its
// rejection_reason) and the member uploads a fresh row rather than mutating
// the old one, so the review history stays intact.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_documents', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      shop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      file_key: { type: Sequelize.TEXT, allowNull: false },
      preview_key: { type: Sequelize.TEXT, allowNull: true },
      content_type: { type: Sequelize.STRING(100), allowNull: false },
      original_filename: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.DataTypes.ENUM('pending', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('user_documents', ['shop_id', 'status'], { name: 'idx_user_documents_shop_status' });
    await queryInterface.addIndex('user_documents', ['user_id'], { name: 'idx_user_documents_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_documents');
  },
};
