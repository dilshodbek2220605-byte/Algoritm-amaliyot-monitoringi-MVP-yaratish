'use strict';

module.exports = (sequelize, DataTypes) => {
  const Deployment = sequelize.define(
    'Deployment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      student_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      mentor_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      planned_hours: {
        type: DataTypes.DECIMAL(7, 1),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      status: {
        type: DataTypes.ENUM(
          'placed',
          'in_progress',
          'paused',
          'completed',
          'terminated_early'
        ),
        allowNull: false,
        defaultValue: 'placed',
      },
      hiring_status: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: 'deployments',
    }
  );

  Deployment.associate = (models) => {
    Deployment.belongsTo(models.User, {
      foreignKey: 'student_id',
      as: 'student',
    });
    Deployment.belongsTo(models.User, {
      foreignKey: 'mentor_id',
      as: 'mentor',
    });
    Deployment.belongsTo(models.Company, {
      foreignKey: 'company_id',
      as: 'company',
    });
    Deployment.hasMany(models.DailyLog, {
      foreignKey: 'deployment_id',
      as: 'dailyLogs',
    });
    Deployment.hasMany(models.WeeklyReport, {
      foreignKey: 'deployment_id',
      as: 'weeklyReports',
    });
  };

  return Deployment;
};
