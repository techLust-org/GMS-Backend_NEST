'use strict';

// Audit trail of every time an admin resolved a signed URL to an ID
// document's original (unmasked) file — see DocumentAccessLog model.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('document_access_logs', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'user_documents', key: 'id' },
        onDelete: 'CASCADE',
      },
      shop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      viewed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('document_access_logs', ['document_id'], { name: 'idx_doc_access_logs_document' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('document_access_logs');
  },
};
