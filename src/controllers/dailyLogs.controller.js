'use strict';

const { Op } = require('sequelize');
const { DailyLog, Deployment, User, Company } = require('../models');
const ApiError = require('../utils/ApiError');
const { validateExternalUrl } = require('../utils/url');
const { todayISO, toDateOnly } = require('../utils/time');
const { recordAudit } = require('../utils/audit');

const ATTENDANCE = ['present', 'excused', 'unexcused', 'day_off'];
const HOURS_STEP = 0.5;

const deploymentInclude = [
  { model: User, as: 'student', attributes: ['id', 'full_name', 'email'] },
  { model: User, as: 'mentor', attributes: ['id', 'full_name', 'email'] },
  { model: Company, as: 'company', attributes: ['id', 'name'] },
];

const deploymentScopeWhere = (user) => {
  if (user.role === 'coordinator') return {};
  if (user.role === 'mentor') return { mentor_id: user.id };
  return { student_id: user.id };
};

const loadAccessibleDeployment = async (id, user) => {
  const deployment = await Deployment.findOne({
    where: { id, ...deploymentScopeWhere(user) },
    include: deploymentInclude,
  });
  if (!deployment) {
    throw ApiError.notFound('Amaliyot topilmadi yoki ruxsat yo\'q.');
  }
  return deployment;
};

const validateHours = (hours) => {
  const num = Number(hours);
  if (Number.isNaN(num)) throw ApiError.unprocessable('Soat raqam bo\'lishi kerak.');
  if (num < 0 || num > 24) throw ApiError.unprocessable('Soat 0 va 24 orasida bo\'lishi kerak.');
  const steps = num / HOURS_STEP;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    throw ApiError.unprocessable('Soat 0.5 qadamda kiritilishi kerak (masalan 7.5).');
  }
  return Math.round(num * 10) / 10;
};

const assertWithinRange = (date, deployment, { allowFuture = false } = {}) => {
  const value = toDateOnly(date);
  if (value < deployment.start_date || value > deployment.end_date) {
    throw ApiError.unprocessable(
      `Sana amaliyot davri (${deployment.start_date} - ${deployment.end_date}) ichida bo'lishi kerak.`
    );
  }
  if (!allowFuture && value > todayISO()) {
    throw ApiError.unprocessable('Kelajakdagi kun uchun qayd kiritib bo\'lmaydi.');
  }
  return value;
};

const normalizePayload = async (payload, deployment, { partial = false } = {}) => {
  const data = {};

  if (payload.attendance !== undefined) {
    if (!ATTENDANCE.includes(payload.attendance)) {
      throw ApiError.unprocessable('Davomat qiymati yaroqsiz.');
    }
    data.attendance = payload.attendance;
  } else if (!partial) {
    data.attendance = 'present';
  }

  if (payload.hours_worked !== undefined || !partial) {
    data.hours_worked = validateHours(payload.hours_worked ?? 0);
  }

  // Kelmagan / dam kunlarda soat 0 bo'lishi shart.
  const attendance = data.attendance;
  if (attendance && attendance !== 'present' && data.hours_worked !== undefined && data.hours_worked !== 0) {
    throw ApiError.unprocessable(
      'Kelmagan yoki dam olish kunlarida ishlagan soat 0 bo\'lishi shart.'
    );
  }

  if (payload.task_description !== undefined) {
    data.task_description = payload.task_description || null;
  }

  if (payload.result_link !== undefined) {
    try {
      data.result_link = validateExternalUrl(payload.result_link);
    } catch (err) {
      throw ApiError.unprocessable(err.message);
    }
  }

  return data;
};

const listLogs = async (req, res) => {
  const { deployment_id: deploymentId, from, to, status } = req.query;

  const deploymentWhere = deploymentScopeWhere(req.user);
  const where = {};
  if (status) where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = toDateOnly(from);
    if (to) where.date[Op.lte] = toDateOnly(to);
  }
  if (deploymentId) where.deployment_id = deploymentId;

  const logs = await DailyLog.findAll({
    where,
    include: [{ model: Deployment, as: 'deployment', where: deploymentWhere, attributes: ['id', 'student_id', 'mentor_id'] }],
    order: [['date', 'DESC']],
  });

  res.json({ success: true, data: { items: logs } });
};

const getLog = async (req, res) => {
  const log = await DailyLog.findByPk(req.params.id, {
    include: [{ model: Deployment, as: 'deployment', include: deploymentInclude }],
  });
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');
  await loadAccessibleDeployment(log.deployment_id, req.user);
  res.json({ success: true, data: { log } });
};

const createLog = async (req, res) => {
  const { deployment_id: deploymentId, date } = req.body;
  const isCoordinator = req.user.role === 'coordinator';

  let deployment;
  if (deploymentId) {
    deployment = await loadAccessibleDeployment(deploymentId, req.user);
  } else {
    // Intern o'zining faol amaliyotini avtomatik tanlash.
    if (isCoordinator) {
      throw ApiError.badRequest('Amaliyot (deployment_id) ko\'rsatilishi shart.');
    }
    deployment = await Deployment.findOne({
      where: { student_id: req.user.id, status: ['placed', 'in_progress', 'paused'] },
      include: deploymentInclude,
      order: [['start_date', 'DESC']],
    });
    if (!deployment) throw ApiError.badRequest('Sizga biriktirilgan amaliyot topilmadi.');
  }

  const normalizedDate = assertWithinRange(date, deployment, { allowFuture: isCoordinator });
  const data = await normalizePayload(req.body, deployment);

  const existing = await DailyLog.findOne({
    where: { deployment_id: deployment.id, date: normalizedDate },
  });
  if (existing) {
    throw ApiError.conflict('Bu kun uchun qayd allaqachon mavjud. Uni tahrirlang.');
  }

  const log = await DailyLog.create({
    ...data,
    deployment_id: deployment.id,
    date: normalizedDate,
    status: req.body.submit ? 'submitted' : 'draft',
    entered_by_coordinator: isCoordinator,
  });

  if (isCoordinator) {
    await recordAudit({
      userId: req.user.id,
      action: 'daily_log_entered_by_coordinator',
      entityName: 'DailyLog',
      entityId: log.id,
      changes: { deployment_id: deployment.id, date: normalizedDate, hours_worked: log.hours_worked },
      reason: req.body.reason || 'Koordinator tomonidan kiritildi',
    });
  }

  res.status(201).json({ success: true, data: { log } });
};

const updateLog = async (req, res) => {
  const log = await DailyLog.findByPk(req.params.id);
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');

  const deployment = await loadAccessibleDeployment(log.deployment_id, req.user);
  const isCoordinator = req.user.role === 'coordinator';

  if (!isCoordinator) {
    if (req.user.role !== 'intern') {
      throw ApiError.forbidden('Mentor kunlik qaydni tahrirlay olmaydi.');
    }
    if (log.status === 'approved') {
      throw ApiError.badRequest('Tasdiqlangan qaydni tahrirlab bo\'lmaydi.');
    }
    if (req.body.date !== undefined) {
      throw ApiError.badRequest('Sanani o\'zgartirib bo\'lmaydi.');
    }
  }

  const data = await normalizePayload(req.body, deployment, { partial: true });
  Object.assign(log, data);

  if (isCoordinator) {
    log.entered_by_coordinator = true;
  }

  // Tahrirdan so'ng rad etilgan qayd qayta ko'rikka tushadi.
  if (log.status === 'rejected') {
    log.status = 'draft';
    log.rejection_reason = null;
  }

  await log.save();

  await recordAudit({
    userId: req.user.id,
    action: isCoordinator ? 'daily_log_updated_by_coordinator' : 'daily_log_updated',
    entityName: 'DailyLog',
    entityId: log.id,
    changes: data,
    reason: isCoordinator ? req.body.reason || null : null,
  });

  res.json({ success: true, data: { log } });
};

const submitLog = async (req, res) => {
  const log = await DailyLog.findByPk(req.params.id);
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');
  await loadAccessibleDeployment(log.deployment_id, req.user);
  if (req.user.role !== 'intern') throw ApiError.forbidden('Faqat amaliyotchi yuboradi.');
  if (!['draft', 'rejected'].includes(log.status)) {
    throw ApiError.badRequest('Bu qaydni yuborib bo\'lmaydi.');
  }

  log.status = 'submitted';
  log.rejection_reason = null;
  await log.save();

  res.json({ success: true, data: { log } });
};

const approveLog = async (req, res) => {
  const log = await DailyLog.findByPk(req.params.id);
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');
  await loadAccessibleDeployment(log.deployment_id, req.user);
  if (!['mentor', 'coordinator'].includes(req.user.role)) {
    throw ApiError.forbidden('Faqat mentor yoki koordinator tasdiqlaydi.');
  }

  log.status = 'approved';
  log.rejection_reason = null;
  log.reviewed_by = req.user.id;
  log.reviewed_at = new Date();
  await log.save();

  await recordAudit({
    userId: req.user.id,
    action: 'daily_log_approved',
    entityName: 'DailyLog',
    entityId: log.id,
  });

  res.json({ success: true, data: { log } });
};

const rejectLog = async (req, res) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    throw ApiError.unprocessable('Rad etish uchun izoh (sabab) majburiy.');
  }

  const log = await DailyLog.findByPk(req.params.id);
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');
  await loadAccessibleDeployment(log.deployment_id, req.user);
  if (!['mentor', 'coordinator'].includes(req.user.role)) {
    throw ApiError.forbidden('Faqat mentor yoki koordinator qaytaradi.');
  }

  log.status = 'rejected';
  log.rejection_reason = reason;
  log.reviewed_by = req.user.id;
  log.reviewed_at = new Date();
  await log.save();

  await recordAudit({
    userId: req.user.id,
    action: 'daily_log_rejected',
    entityName: 'DailyLog',
    entityId: log.id,
    reason,
  });

  res.json({ success: true, data: { log } });
};

const deleteLog = async (req, res) => {
  const log = await DailyLog.findByPk(req.params.id);
  if (!log) throw ApiError.notFound('Kunlik qayd topilmadi.');
  await loadAccessibleDeployment(log.deployment_id, req.user);

  const isCoordinator = req.user.role === 'coordinator';
  if (!isCoordinator) {
    if (req.user.role !== 'intern' || log.status !== 'draft') {
      throw ApiError.forbidden('Faqat qoralama (draft) qaydni o\'chirish mumkin.');
    }
  }

  await log.destroy();

  await recordAudit({
    userId: req.user.id,
    action: 'daily_log_deleted',
    entityName: 'DailyLog',
    entityId: req.params.id,
  });

  res.json({ success: true, data: { message: 'Qayd o\'chirildi.' } });
};

module.exports = {
  listLogs,
  getLog,
  createLog,
  updateLog,
  submitLog,
  approveLog,
  rejectLog,
  deleteLog,
};
