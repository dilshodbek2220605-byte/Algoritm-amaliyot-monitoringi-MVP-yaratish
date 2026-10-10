'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('coordinator', 'intern', 'mentor'),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
      defaultScope: {
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        withPassword: { attributes: { include: ['password_hash'] } },
      },
    }
  );

  User.prototype.toSafeJSON = function toSafeJSON() {
    const { password_hash, ...rest } = this.get({ plain: true });
    return rest;
  };

  User.associate = (models) => {
    User.hasMany(models.Deployment, {
      foreignKey: 'student_id',
      as: 'deployments',
    });
    User.hasMany(models.Deployment, {
      foreignKey: 'mentor_id',
      as: 'mentoredDeployments',
    });
    User.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      as: 'auditLogs',
    });
    User.hasMany(models.InviteToken, {
      foreignKey: 'user_id',
      as: 'inviteTokens',
    });
  };

  return User;
};
