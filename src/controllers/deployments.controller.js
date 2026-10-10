'use strict';

const { Op } = require('sequelize');
const { Deployment, User, Company } = require('../models');
const ApiError = require('../utils/ApiError');
const { computeProgress } = require('../services/progress.service');
const { recordAudit } = require('../utils/audit');

const STATUSES = ['placed', 'in_progress', 'paused', 'completed', 'terminated_early'];
const REASON_REQUIRED = ['paused', 'terminated_early'];

const includeGraph = [
  { model: User, as: 'student', attributes: ['id', 'full_name', 'email', 'is_active'] },
  { model: User, as: 'mentor', attributes: ['id', 'full_name', 'email', 'is_active'] },
  { model: Company, as: 'company', attributes: ['id', 'name', 'industry', 'is_active'] },
];

const scopeWhereFor = (user) => {
  if (user.role === 'coordinator') return {};
  if (user.role === 'mentor') return { mentor_id: user.id };
  return { student_id: user.id };
};

const loadAccessible = async (id, user) => {
  const deployment = await Deployment.findOne({
    where: { id, ...scopeWhereFor(user) },
    include: includeGraph,
  });
  if (!deployment) throw ApiError.notFound('Amaliyot topilmadi yoki ruxsat yo\'q.');
  return deployment;
};

const listDeployments = async (req, res) => {
  const { status, company_id: companyId, student_id: studentId, mentor_id: mentorId } = req.query;
  const where = { ...scopeWhereFor(req.user) };

  if (status) where.status = status;
  if (companyId) where.company_id = companyId;
  if (studentId && req.user.role === 'coordinator') where.student_id = studentId;
  if (mentorId && req.user.role === 'coordinator') where.mentor_id = mentorId;

  const items = await Deployment.findAll({
    where,
    include: includeGraph,
    order: [['created_at', 'DESC']],
  });

  res.json({ success: true, data: { items } });
};

const getDeployment = async (req, res) => {
  const deployment = await loadAccessible(req.params.id, req.user);
  const progress = await computeProgress(deployment);
  res.json({ success: true, data: { deployment, progress } });
};

const createDeployment = async (req, res) => {
  const {
    student_id: studentId,
    company_id: companyId,
    mentor_id: mentorId,
    start_date: startDate,
    end_date: endDate,
    planned_hours: plannedHours,
    hiring_status: hiringStatus,
  } = req.body;

  const student = await User.findByPk(studentId);
  if (!student || student.role !== 'intern') {
    throw ApiError.badRequest('Tanlangan o\'quvchi (intern) topilmadi.');
  }

  const company = await Company.findByPk(companyId);
  if (!company || !company.is_active) {
    throw ApiError.badRequest('Tanlangan kompaniya faol emas.');
  }

  if (mentorId) {
    const mentor = await User.findByPk(mentorId);
    if (!mentor || mentor.role !== 'mentor' || !mentor.is_active) {
      throw ApiError.badRequest('Tanlangan mentor yaroqsiz.');
    }
  }

  if (new Date(endDate) < new Date(startDate)) {
    throw ApiError.badRequest('Tugash sanasi boshlanish sanasidan keyin bo\'lishi kerak.');
  }

  const deployment = await Deployment.create({
    student_id: studentId,
    company_id: companyId,
    mentor_id: mentorId || null,
    start_date: startDate,
    end_date: endDate,
    planned_hours: plannedHours,
    hiring_status: hiringStatus || null,
    status: 'placed',
  });

  await recordAudit({
    userId: req.user.id,
    action: 'deployment_created',
    entityName: 'Deployment',
    entityId: deployment.id,
    changes: { student_id: studentId, company_id: companyId, mentor_id: mentorId || null },
  });

  const created = await Deployment.findByPk(deployment.id, { include: includeGraph });
  res.status(201).json({ success: true, data: { deployment: created } });
};

const updateDeployment = async (req, res) => {
  const deployment = await Deployment.findByPk(req.params.id);
  if (!deployment) throw ApiError.notFound('Amaliyot topilmadi.');

  const before = deployment.get({ plain: true });
  const fields = [
    'mentor_id',
    'start_date',
    'end_date',
    'planned_hours',
    'hiring_status',
    'company_id',
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) deployment[field] = req.body[field];
  }

  if (new Date(deployment.end_date) < new Date(deployment.start_date)) {
    throw ApiError.badRequest('Tugash sanasi boshlanish sanasidan keyin bo\'lishi kerak.');
  }

  if (deployment.mentor_id) {
    const mentor = await User.findByPk(deployment.mentor_id);
    if (!mentor || mentor.role !== 'mentor') {
      throw ApiError.badRequest('Tanlangan mentor yaroqsiz.');
    }
  }

  await deployment.save();

  await recordAudit({
    userId: req.user.id,
    action: 'deployment_updated',
    entityName: 'Deployment',
    entityId: deployment.id,
    changes: {
      before: { mentor_id: before.mentor_id, start_date: before.start_date, end_date: before.end_date, planned_hours: before.planned_hours },
      after: { mentor_id: deployment.mentor_id, start_date: deployment.start_date, end_date: deployment.end_date, planned_hours: deployment.planned_hours },
    },
  });

  const updated = await Deployment.findByPk(deployment.id, { include: includeGraph });
  res.json({ success: true, data: { deployment: updated } });
};

const changeStatus = async (req, res) => {
  const { status, reason } = req.body;
  if (!STATUSES.includes(status)) {
    throw ApiError.badRequest('Holat qiymati yaroqsiz.');
  }

  const deployment = await Deployment.findByPk(req.params.id);
  if (!deployment) throw ApiError.notFound('Amaliyot topilmadi.');

  if (REASON_REQUIRED.includes(status) && (!reason || !String(reason).trim())) {
    throw ApiError.unprocessable(
      status === 'paused'
        ? 'To\'xtatib turish uchun sabab majburiy.'
        : 'Muddatidan oldin tugatish uchun sabab majburiy.'
    );
  }

  const previous = deployment.status;
  deployment.status = status;
  await deployment.save();

  await recordAudit({
    userId: req.user.id,
    action: 'deployment_status_changed',
    entityName: 'Deployment',
    entityId: deployment.id,
    changes: { from: previous, to: status },
    reason: reason || null,
  });

  const updated = await Deployment.findByPk(deployment.id, { include: includeGraph });
  res.json({ success: true, data: { deployment: updated } });
};

const completeDeployment = async (req, res) => {
  const deployment = await Deployment.findByPk(req.params.id);
  if (!deployment) throw ApiError.notFound('Amaliyot topilmadi.');

  const { hiring_status: hiringStatus } = req.body || {};
  deployment.status = 'completed';
  if (hiringStatus !== undefined) deployment.hiring_status = hiringStatus;
  await deployment.save();

  const progress = await computeProgress(deployment);

  await recordAudit({
    userId: req.user.id,
    action: 'deployment_completed',
    entityName: 'Deployment',
    entityId: deployment.id,
    changes: { progress },
  });

  const updated = await Deployment.findByPk(deployment.id, { include: includeGraph });
  res.json({ success: true, data: { deployment: updated, progress } });
};

const getProgress = async (req, res) => {
  const deployment = await loadAccessible(req.params.id, req.user);
  const progress = await computeProgress(deployment);
  res.json({ success: true, data: { progress } });
};

module.exports = {
  listDeployments,
  getDeployment,
  createDeployment,
  updateDeployment,
  changeStatus,
  completeDeployment,
  getProgress,
};
