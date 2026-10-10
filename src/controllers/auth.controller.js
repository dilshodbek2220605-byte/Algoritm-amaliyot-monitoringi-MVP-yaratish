'use strict';

const { User, InviteToken, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');
const { verifyPassword, hashPassword, isStrongEnough } = require('../utils/password');
const { findUsableInviteByRawToken } = require('../utils/invite');
const { recordAudit } = require('../utils/audit');

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email: String(email).toLowerCase().trim() },
  });

  if (!user || !user.password_hash) {
    throw ApiError.unauthorized('Email yoki parol noto\'g\'ri.');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('Hisobingiz faol emas. Koordinator bilan bog\'laning.');
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    throw ApiError.unauthorized('Email yoki parol noto\'g\'ri.');
  }

  user.last_login_at = new Date();
  await user.save();

  const token = signAccessToken(user);

  res.json({
    success: true,
    data: { token, user: user.toSafeJSON() },
  });
};

const me = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
};

// Ommaviy ro'yxatdan o'tish. Xavfsizlik uchun hisob "pending" (is_active=false)
// holatida yaratiladi va koordinator tasdiqlagach faollashadi.
const register = async (req, res) => {
  const { full_name: fullName, email, password, role } = req.body;

  if (!['intern', 'mentor'].includes(role)) {
    throw ApiError.badRequest(
      'Faqat amaliyotchi yoki mentor sifatida ro\'yxatdan o\'tish mumkin.'
    );
  }
  if (!isStrongEnough(password)) {
    throw ApiError.unprocessable('Parol kamida 8 belgidan iborat bo\'lishi kerak.');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    throw ApiError.conflict('Bu email allaqachon ro\'yxatdan o\'tgan.');
  }

  const user = await User.create({
    full_name: fullName,
    email: normalizedEmail,
    role,
    is_active: false,
    password_hash: await hashPassword(password),
  });

  await recordAudit({
    userId: user.id,
    action: 'user_registered',
    entityName: 'User',
    entityId: user.id,
    changes: { role: user.role, email: user.email },
    reason: 'Ommaviy ro\'yxatdan o\'tish (tasdiq kutmoqda)',
  });

  res.status(201).json({
    success: true,
    data: {
      user: user.toSafeJSON(),
      pending: true,
      message:
        'Ro\'yxatdan o\'tdingiz. Hisobingiz koordinator tasdiqlashini kutmoqda.',
    },
  });
};

// Taklif havolasi haqida ma'lumot (parol o'rnatishdan oldin email'ni ko'rsatish uchun).
const inviteInfo = async (req, res) => {
  const invite = await findUsableInviteByRawToken(req.params.token);
  if (!invite) {
    throw ApiError.badRequest('Taklif havolasi yaroqsiz yoki muddati tugagan.');
  }
  const user = await User.findByPk(invite.user_id);
  if (!user || !user.is_active) {
    throw ApiError.badRequest('Taklif egasi topilmadi yoki faol emas.');
  }
  res.json({
    success: true,
    data: {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      expires_at: invite.expires_at,
    },
  });
};

// Taklifni qabul qilish: parol o'rnatish + hisobni faollashtirish.
const acceptInvite = async (req, res) => {
  const { token, password, full_name: fullName } = req.body;

  if (!isStrongEnough(password)) {
    throw ApiError.unprocessable('Parol kamida 8 belgidan iborat bo\'lishi kerak.');
  }

  const invite = await findUsableInviteByRawToken(token);
  if (!invite) {
    throw ApiError.badRequest('Taklif havolasi yaroqsiz yoki muddati tugagan.');
  }

  const target = await User.findByPk(invite.user_id);
  if (!target) {
    throw ApiError.badRequest('Taklif egasi topilmadi.');
  }

  await sequelize.transaction(async (transaction) => {
    target.password_hash = await hashPassword(password);
    target.is_active = true;
    if (fullName) target.full_name = fullName;
    await target.save({ transaction });

    invite.used_at = new Date();
    await invite.save({ transaction });

    // Bir foydalanuvchi uchun boshqa faol takliflarni ham yopamiz.
    await InviteToken.update(
      { used_at: new Date() },
      {
        where: { user_id: target.id, used_at: null },
        transaction,
      }
    );
  });

  await recordAudit({
    userId: target.id,
    action: 'invite_accepted',
    entityName: 'User',
    entityId: target.id,
  });

  const accessToken = signAccessToken(target);
  res.json({
    success: true,
    data: { token: accessToken, user: target.toSafeJSON() },
  });
};

const changePassword = async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;

  if (!isStrongEnough(newPassword)) {
    throw ApiError.unprocessable('Yangi parol kamida 8 belgidan iborat bo\'lishi kerak.');
  }

  const user = await User.scope('withPassword').findByPk(req.user.id);
  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) {
    throw ApiError.badRequest('Joriy parol noto\'g\'ri.');
  }

  user.password_hash = await hashPassword(newPassword);
  await user.save();

  await recordAudit({
    userId: user.id,
    action: 'password_changed',
    entityName: 'User',
    entityId: user.id,
  });

  res.json({ success: true, data: { message: 'Parol yangilandi.' } });
};

module.exports = { login, me, register, inviteInfo, acceptInvite, changePassword };
