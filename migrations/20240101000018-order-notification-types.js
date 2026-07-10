'use strict';

const NEW_VALUES = ['order_placed', 'order_shipped', 'order_delivered', 'order_cancelled'];

module.exports = {
  async up(queryInterface) {
    for (const value of NEW_VALUES) {
      // ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
      // Postgres < 12, and Sequelize wraps migrations in one — use a raw,
      // unmanaged query so each ADD VALUE commits immediately.
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS '${value}';`,
      );
    }
  },

  async down() {
    // Postgres has no ALTER TYPE ... DROP VALUE; leaving the extra enum
    // values in place on rollback is harmless.
  },
};
