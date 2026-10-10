'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return next(ApiError.unprocessable('Kiritilgan ma\'lumotlar yaroqsiz.', details));
};

module.exports = validate;
