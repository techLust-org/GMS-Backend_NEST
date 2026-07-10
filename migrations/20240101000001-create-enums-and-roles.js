'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE plan_duration AS ENUM ('monthly', 'quarterly', 'yearly');
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE sub_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE notify_type AS ENUM (
          'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
          'trainer_absence', 'gym_announcement', 'subscription_purchased'
        );
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE expense_cat AS ENUM (
          'trainer_salary', 'equipment', 'utilities', 'rent', 'maintenance', 'other'
        );
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        CREATE TYPE day_of_week AS ENUM (
          'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
        );
        EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS day_of_week;
      DROP TYPE IF EXISTS expense_cat;
      DROP TYPE IF EXISTS notify_type;
      DROP TYPE IF EXISTS sub_status;
      DROP TYPE IF EXISTS plan_duration;
      DROP TYPE IF EXISTS gender_type;
      DROP TYPE IF EXISTS user_status;
    `);
  },
};
