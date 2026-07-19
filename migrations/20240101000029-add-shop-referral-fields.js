'use strict';

// referral_code: this shop's own shareable code (lazily generated on first
// read for shops that predate this migration, not backfilled here).
// referred_by_shop_id: which shop's code was used at this shop's
// registration, if any. Nullable/SET NULL — losing the referrer shouldn't
// take the referred shop's own data down with it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('shops', 'referral_code', {
      type: Sequelize.STRING(12),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('shops', 'referred_by_shop_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'shops', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('shops', 'referred_by_shop_id');
    await queryInterface.removeColumn('shops', 'referral_code');
  },
};
