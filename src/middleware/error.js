'use strict';

const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Manzil topilmadi: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server xatosi.';
  let details = err.details;

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 422;
    message = 'Ma\'lumotlar bazasi validatsiyasidan o\'tmadi.';
    details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Bog\'liq yozuv mavjud emas yoki o\'chirilgan.';
  } else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 400;
    message = 'Ma\'lumotlar bazasi xatosi.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON formati noto\'g\'ri.';
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: { message, details: details || null },
  });
};

module.exports = { notFound, errorHandler };
