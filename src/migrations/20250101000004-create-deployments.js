'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('deployments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      mentor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      planned_hours: {
        type: Sequelize.DECIMAL(7, 1),
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM(
          'placed',
          'in_progress',
          'paused',
          'completed',
          'terminated_early'
        ),
        allowNull: false,
        defaultValue: 'placed',
      },
      hiring_status: { type: Sequelize.STRING(100), allowNull: true },
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
    await queryInterface.addIndex('deployments', ['student_id']);
    await queryInterface.addIndex('deployments', ['mentor_id']);
    await queryInterface.addIndex('deployments', ['company_id']);
    await queryInterface.addIndex('deployments', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('deployments');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_deployments_status";'
    );
  },
};
