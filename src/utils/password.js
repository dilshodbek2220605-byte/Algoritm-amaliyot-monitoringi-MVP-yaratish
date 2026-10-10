'use strict';

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

const verifyPassword = (plain, hash) => {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
};

const isStrongEnough = (plain) =>
  typeof plain === 'string' && plain.length >= 8;

module.exports = { hashPassword, verifyPassword, isStrongEnough };
