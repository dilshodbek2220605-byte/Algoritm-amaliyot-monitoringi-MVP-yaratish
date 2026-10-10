'use strict';

require('dotenv').config();

const common = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
  dialect: 'postgres',
  timezone: '+05:00',
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

module.exports = {
  development: {
    ...common,
    database: process.env.DB_NAME || 'algoritm_amaliyot',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: false,
  },
  test: {
    ...common,
    database: process.env.DB_NAME_TEST || 'algoritm_amaliyot_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: false,
  },
  production: {
    ...common,
    database: process.env.DB_NAME || 'algoritm_amaliyot',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: false,
  },
};
