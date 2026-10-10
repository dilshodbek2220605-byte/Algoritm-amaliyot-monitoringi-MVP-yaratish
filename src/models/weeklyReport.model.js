'use strict';

module.exports = (sequelize, DataTypes) => {
  const choice = () => ({ type: DataTypes.SMALLINT, allowNull: true, validate: { min: 0, max: 5 } });

  const WeeklyReport = sequelize.define(
    'WeeklyReport',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      deployment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      week_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      student_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      challenges: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      next_week_plan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      score_discipline: choice(),
      score_quality: choice(),
      score_deadline: choice(),
      score_independence: choice(),
      score_teamwork: choice(),
      mentor_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      evaluated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      evaluated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'weekly_reports',
      indexes: [
        { unique: true, fields: ['deployment_id', 'week_start_date'] },
      ],
    }
  );

  WeeklyReport.SCORE_FIELDS = [
    'score_discipline',
    'score_quality',
    'score_deadline',
    'score_independence',
    'score_teamwork',
  ];

  WeeklyReport.prototype.averageScore = function averageScore() {
    const values = WeeklyReport.SCORE_FIELDS.map((f) => this[f]).filter(
      (v) => v !== null && v !== undefined && v !== ''
    );
    if (values.length === 0) return null;
    const sum = values.reduce((acc, v) => acc + Number(v), 0);
    return Math.round((sum / values.length) * 100) / 100;
  };

  WeeklyReport.associate = (models) => {
    WeeklyReport.belongsTo(models.Deployment, {
      foreignKey: 'deployment_id',
      as: 'deployment',
    });
    WeeklyReport.belongsTo(models.User, {
      foreignKey: 'evaluated_by',
      as: 'evaluator',
    });
  };

  return WeeklyReport;
};
