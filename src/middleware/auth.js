'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Bearer token topilmadi.');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (_err) {
      throw ApiError.unauthorized('Token yaroqsiz yoki muddati tugagan.');
    }

    const user = await User.findByPk(payload.sub);
    if (!user) {
      throw ApiError.unauthorized('Foydalanuvchi topilmadi.');
    }
    if (!user.is_active) {
      throw ApiError.forbidden('Foydalanuvchi faol emas.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Bu amal uchun ruxsatingiz yo\'q.'));
    }
    next();
  };

module.exports = { authenticate, authorize };
