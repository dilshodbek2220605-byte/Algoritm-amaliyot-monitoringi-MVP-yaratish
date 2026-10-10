'use strict';

const { WeeklyReport, Deployment, User, Company } = require('../models');
const ApiError = require('../utils/ApiError');
const { weekStart, todayISO } = require('../utils/time');
const { recordAudit } = require('../utils/audit');

const SCORE_MIN = 0;
const SCORE_MAX = 5;

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
  if (!deployment) throw ApiError.notFound('Amaliyot topilmadi yoki ruxsat yo\'q.');
  return deployment;
};

const listReports = async (req, res) => {
  const { deployment_id: deploymentId } = req.query;
  const where = {};
  if (deploymentId) where.deployment_id = deploymentId;

  const items = await WeeklyReport.findAll({
    where,
    include: [
      {
        model: Deployment,
        as: 'deployment',
        where: deploymentScopeWhere(req.user),
        attributes: ['id', 'student_id', 'mentor_id'],
      },
      { model: User, as: 'evaluator', attributes: ['id', 'full_name'] },
    ],
    order: [['week_start_date', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      items: items.map((item) => ({ ...item.toJSON(), average_score: item.averageScore() })),
    },
  });
};

const getReport = async (req, res) => {
  const report = await WeeklyReport.findByPk(req.params.id, {
    include: [{ model: Deployment, as: 'deployment', include: deploymentInclude }],
  });
  if (!report) throw ApiError.notFound('Haftalik hisobot topilmadi.');
  await loadAccessibleDeployment(report.deployment_id, req.user);
  res.json({
    success: true,
    data: { report: { ...report.toJSON(), average_score: report.averageScore() } },
  });
};

const upsertReport = async (req, res) => {
  const { deployment_id: deploymentId, week_start_date: weekStartDate } = req.body;

  if (!weekStartDate) {
    throw ApiError.unprocessable('week_start_date majburiy.');
  }
  const normalizedWeek = weekStart(weekStartDate);

  let deployment;
  if (deploymentId) {
    deployment = await loadAccessibleDeployment(deploymentId, req.user);
  } else {
    deployment = await Deployment.findOne({
      where: { student_id: req.user.id, status: ['placed', 'in_progress', 'paused'] },
      order: [['start_date', 'DESC']],
    });
    if (!deployment) throw ApiError.badRequest('Sizga biriktirilgan amaliyot topilmadi.');
  }

  if (req.user.role !== 'intern' && req.user.role !== 'coordinator') {
    throw ApiError.forbidden('Hisobotni faqat amaliyotchi yoki koordinator kiritadi.');
  }

  if (normalizedWeek > todayISO()) {
    throw ApiError.unprocessable('Kelajakdagi hafta uchun hisobot kiritib bo\'lmaydi.');
  }

  let report = await WeeklyReport.findOne({
    where: { deployment_id: deployment.id, week_start_date: normalizedWeek },
  });

  const fields = {
    student_summary: req.body.student_summary,
    challenges: req.body.challenges,
    next_week_plan: req.body.next_week_plan,
  };

  if (report) {
    if (report.evaluated_at && req.user.role === 'intern') {
      throw ApiError.badRequest('Baholangan hisobotni tahrirlab bo\'lmaydi.');
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) report[key] = value;
    }
    await report.save();
  } else {
    report = await WeeklyReport.create({
      deployment_id: deployment.id,
      week_start_date: normalizedWeek,
      student_summary: fields.student_summary || null,
      challenges: fields.challenges || null,
      next_week_plan: fields.next_week_plan || null,
    });
  }

  await recordAudit({
    userId: req.user.id,
    action: 'weekly_report_saved',
    entityName: 'WeeklyReport',
    entityId: report.id,
    changes: { week_start_date: normalizedWeek },
  });

  res.status(report.isNewRecord ? 201 : 200).json({
    success: true,
    data: { report: { ...report.toJSON(), average_score: report.averageScore() } },
  });
};

const evaluateReport = async (req, res) => {
  const report = await WeeklyReport.findByPk(req.params.id);
  if (!report) throw ApiError.notFound('Haftalik hisobot topilmadi.');
  await loadAccessibleDeployment(report.deployment_id, req.user);

  if (!['mentor', 'coordinator'].includes(req.user.role)) {
    throw ApiError.forbidden('Baholashni faqat mentor yoki koordinator bajaradi.');
  }

  const scores = {};
  for (const field of WeeklyReport.SCORE_FIELDS) {
    if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
      const value = Number(req.body[field]);
      if (Number.isNaN(value) || value < SCORE_MIN || value > SCORE_MAX) {
        throw ApiError.unprocessable(`${field}: baho ${SCORE_MIN} va ${SCORE_MAX} orasida bo'lishi kerak.`);
      }
      scores[field] = Math.round(value);
    }
  }

  if (Object.keys(scores).length === 0 && !req.body.mentor_feedback) {
    throw ApiError.unprocessable('Kamida bitta mezon bahosi yoki izoh kiritilishi kerak.');
  }

  Object.assign(report, scores);
  if (req.body.mentor_feedback !== undefined) {
    report.mentor_feedback = req.body.mentor_feedback;
  }
  report.evaluated_by = req.user.id;
  report.evaluated_at = new Date();
  await report.save();

  await recordAudit({
    userId: req.user.id,
    action: 'weekly_report_evaluated',
    entityName: 'WeeklyReport',
    entityId: report.id,
    changes: { scores, average_score: report.averageScore() },
  });

  res.json({
    success: true,
    data: { report: { ...report.toJSON(), average_score: report.averageScore() } },
  });
};

module.exports = { listReports, getReport, upsertReport, evaluateReport };
