'use strict';

require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 4000),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'algoritm_amaliyot',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwtSecret: process.env.JWT_SECRET || 'insecure_dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  inviteExpiresHours: toInt(process.env.INVITE_EXPIRES_HOURS, 72),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  timezone: 'Asia/Tashkent',
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'insecure_dev_secret_change_me') {
  throw new Error('JWT_SECRET production muhitida albatta o\'rnatilishi shart.');
}

module.exports = env;
