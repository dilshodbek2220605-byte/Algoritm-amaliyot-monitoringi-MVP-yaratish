'use strict';

const { Op } = require('sequelize');
const { User, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { createInvite } = require('../utils/invite');
const { recordAudit } = require('../utils/audit');

const listUsers = async (req, res) => {
  const { role, search, is_active: isActive, limit = 100, offset = 0 } = req.query;
  const where = {};

  if (role) where.role = role;
  if (isActive !== undefined) where.is_active = isActive === 'true' || isActive === true;
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: {
      exclude: ['password_hash'],
      include: [[sequelize.literal('(password_hash IS NOT NULL)'), 'has_password']],
    },
    order: [['created_at', 'DESC']],
    limit: Math.min(Number(limit) || 100, 500),
    offset: Number(offset) || 0,
  });

  res.json({ success: true, data: { items: rows, total: count } });
};

const getUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi.');
  res.json({ success: true, data: { user } });
};

const createUser = async (req, res) => {
  const { full_name: fullName, email, role, password } = req.body;

  const existing = await User.findOne({ where: { email: String(email).toLowerCase().trim() } });
  if (existing) throw ApiError.conflict('Bu email allaqachon ro\'yxatdan o\'tgan.');

  const user = await User.create({
    full_name: fullName,
    email: String(email).toLowerCase().trim(),
    role,
    is_active: true,
  });

  let invite = null;
  if (password) {
    const { hashPassword } = require('../utils/password');
    user.password_hash = await hashPassword(password);
    await user.save();
  } else {
    const result = await createInvite(user, { createdBy: req.user.id });
    invite = { link: result.link, expires_at: result.expires_at };
  }

  await recordAudit({
    userId: req.user.id,
    action: 'user_created',
    entityName: 'User',
    entityId: user.id,
    changes: { role: user.role, email: user.email },
  });

  res.status(201).json({ success: true, data: { user: user.toSafeJSON(), invite } });
};

const updateUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi.');

  const before = { full_name: user.full_name, role: user.role, is_active: user.is_active };
  const allowed = ['full_name', 'role', 'is_active'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  }
  await user.save();

  await recordAudit({
    userId: req.user.id,
    action: 'user_updated',
    entityName: 'User',
    entityId: user.id,
    changes: { before, after: { full_name: user.full_name, role: user.role, is_active: user.is_active } },
  });

  res.json({ success: true, data: { user: user.toSafeJSON() } });
};

const resendInvite = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi.');
  if (user.password_hash) {
    throw ApiError.badRequest('Foydalanuvchi allaqachon parol o\'rnatgan.');
  }

  const result = await createInvite(user, { createdBy: req.user.id });

  await recordAudit({
    userId: req.user.id,
    action: 'invite_resent',
    entityName: 'User',
    entityId: user.id,
  });

  res.json({
    success: true,
    data: { invite: { link: result.link, expires_at: result.expires_at } },
  });
};

const deactivateUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi.');
  if (user.id === req.user.id) {
    throw ApiError.badRequest('O\'zingizni o\'chira olmaysiz.');
  }

  user.is_active = false;
  await user.save();

  await recordAudit({
    userId: req.user.id,
    action: 'user_deactivated',
    entityName: 'User',
    entityId: user.id,
  });

  res.json({ success: true, data: { user: user.toSafeJSON() } });
};

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resendInvite,
  deactivateUser,
};
