'use strict';

module.exports = {
  async up(queryInterface) {
    // ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
    // Postgres < 12, and Sequelize wraps migrations in one — use a raw,
    // unmanaged query so it commits immediately.
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'role_promotion';`,
    );
  },

  async down() {
    // Postgres has no ALTER TYPE ... DROP VALUE; leaving the extra enum
    // value in place on rollback is harmless.
  },
};
