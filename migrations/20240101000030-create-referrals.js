'use strict';

// One row per referred shop (referred_shop_id is unique — a shop can only
// have been referred once, by whoever's code it registered with).
// status flips pending -> successful the moment the referred shop activates
// its first-ever platform subscription. redeemed_at is set once this
// referral has been consumed as part of a reward redemption batch, so it's
// excluded from future eligibility counts.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referrals', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      referrer_shop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      referred_shop_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'shops', key: 'id' },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.DataTypes.ENUM('pending', 'successful'),
        allowNull: false,
        defaultValue: 'pending',
      },
      converted_at: { type: Sequelize.DATE, allowNull: true },
      redeemed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('referrals', ['referrer_shop_id'], { name: 'idx_referrals_referrer' });
    await queryInterface.addIndex('referrals', ['status'], { name: 'idx_referrals_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('referrals');
  },
};
