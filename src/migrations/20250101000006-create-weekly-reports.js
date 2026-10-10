'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const score = { type: Sequelize.SMALLINT, allowNull: true };
    await queryInterface.createTable('weekly_reports', {
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
      week_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      student_summary: { type: Sequelize.TEXT, allowNull: true },
      challenges: { type: Sequelize.TEXT, allowNull: true },
      next_week_plan: { type: Sequelize.TEXT, allowNull: true },
      score_discipline: score,
      score_quality: score,
      score_deadline: score,
      score_independence: score,
      score_teamwork: score,
      mentor_feedback: { type: Sequelize.TEXT, allowNull: true },
      evaluated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      evaluated_at: { type: Sequelize.DATE, allowNull: true },
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
    await queryInterface.addIndex(
      'weekly_reports',
      ['deployment_id', 'week_start_date'],
      { unique: true, name: 'weekly_reports_deployment_week_unique' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('weekly_reports');
  },
};
