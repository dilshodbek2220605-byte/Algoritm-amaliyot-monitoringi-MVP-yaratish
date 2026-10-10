'use strict';

module.exports = (sequelize, DataTypes) => {
  const InviteToken = sequelize.define(
    'InviteToken',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      // Token faqat xeshlangan holda saqlanadi (havoladagi xom token emas).
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'invite_tokens',
    }
  );

  InviteToken.associate = (models) => {
    InviteToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  InviteToken.prototype.isUsable = function isUsable() {
    return !this.used_at && new Date(this.expires_at).getTime() > Date.now();
  };

  return InviteToken;
};
