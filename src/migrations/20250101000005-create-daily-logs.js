'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      deployment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'deployments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      hours_worked: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
      },
      attendance: {
        type: Sequelize.ENUM('present', 'excused', 'unexcused', 'day_off'),
        allowNull: false,
        defaultValue: 'present',
      },
      task_description: { type: Sequelize.TEXT, allowNull: true },
      result_link: { type: Sequelize.STRING(1000), allowNull: true },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      entered_by_coordinator: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
    await queryInterface.addIndex('daily_logs', ['deployment_id', 'date'], {
      unique: true,
      name: 'daily_logs_deployment_id_date_unique',
    });
    await queryInterface.addIndex('daily_logs', ['deployment_id', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_logs');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_daily_logs_attendance";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_daily_logs_status";'
    );
  },
};
