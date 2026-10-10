'use strict';

module.exports = (sequelize, DataTypes) => {
  const DailyLog = sequelize.define(
    'DailyLog',
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      hours_worked: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 24 },
      },
      attendance: {
        type: DataTypes.ENUM('present', 'excused', 'unexcused', 'day_off'),
        allowNull: false,
        defaultValue: 'present',
      },
      task_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      result_link: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      entered_by_coordinator: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'daily_logs',
      indexes: [
        { unique: true, fields: ['deployment_id', 'date'] },
        { fields: ['deployment_id', 'status'] },
      ],
    }
  );

  DailyLog.associate = (models) => {
    DailyLog.belongsTo(models.Deployment, {
      foreignKey: 'deployment_id',
      as: 'deployment',
    });
    DailyLog.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'reviewer',
    });
  };

  return DailyLog;
};
