'use strict';

module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    'Company',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      industry: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      contact_info: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'companies',
    }
  );

  Company.associate = (models) => {
    Company.hasMany(models.Deployment, {
      foreignKey: 'company_id',
      as: 'deployments',
    });
  };

  return Company;
};
