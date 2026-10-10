'use strict';

class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isApiError = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Avtorizatsiya talab qilinadi') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Ruxsat yo\'q') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Ma\'lumot topilmadi') {
    return new ApiError(404, message);
  }

  static conflict(message, details) {
    return new ApiError(409, message, details);
  }

  static unprocessable(message, details) {
    return new ApiError(422, message, details);
  }
}

module.exports = ApiError;
