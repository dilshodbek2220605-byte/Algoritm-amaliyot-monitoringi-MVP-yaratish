'use strict';

const crypto = require('crypto');
const env = require('../config/env');
const { InviteToken } = require('../models');

const INVITE_EXPIRES_HOURS = env.inviteExpiresHours;

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

/**
 * Foydalanuvchi uchun yangi bir martalik taklif havolasini yaratadi.
 * Havoladagi xom token faqat bir marta qaytariladi; bazada hash saqlanadi.
 */
const createInvite = async (user, { createdBy = null } = {}) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_HOURS * 60 * 60 * 1000);

  const invite = await InviteToken.create({
    user_id: user.id,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt,
    created_by: createdBy,
  });

  const link = `${env.appBaseUrl}/invite/${rawToken}`;

  return {
    invite,
    rawToken,
    link,
    expires_at: expiresAt,
    expires_in_hours: INVITE_EXPIRES_HOURS,
  };
};

const findUsableInviteByRawToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const invite = await InviteToken.findOne({
    where: { token_hash: hashToken(rawToken) },
  });
  if (!invite || !invite.isUsable()) return null;
  return invite;
};

module.exports = { createInvite, findUsableInviteByRawToken, hashToken };
