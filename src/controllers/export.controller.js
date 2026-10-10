'use strict';

const { Deployment, DailyLog, User, Company } = require('../models');
const { buildCsv } = require('../utils/csv');
const { computeProgress } = require('../services/progress.service');

const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
};

const deploymentColumns = [
  { label: "O'quvchi F.I.Sh", value: (r) => r.student?.full_name || '' },
  { label: "O'quvchi email", value: (r) => r.student?.email || '' },
  { label: 'Kompaniya', value: (r) => r.company?.name || '' },
  { label: 'Mentor', value: (r) => r.mentor?.full_name || '' },
  { label: 'Boshlanish', value: (r) => r.start_date },
  { label: 'Tugash', value: (r) => r.end_date },
  { label: 'Reja (soat)', value: (r) => r.progress.planned_hours },
  { label: 'Tasdiqlangan (soat)', value: (r) => r.progress.approved_hours },
  { label: 'Qolgan (soat)', value: (r) => r.progress.remaining_hours },
  { label: 'Ortiqcha (soat)', value: (r) => r.progress.overtime_hours },
  { label: 'Progress (%)', value: (r) => r.progress.progress_percent },
  { label: 'Holat', value: (r) => r.status },
  { label: 'Ishga olinish holati', value: (r) => r.hiring_status || '' },
];

const exportDeploymentsCsv = async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;

  const deployments = await Deployment.findAll({
    where,
    include: [
      { model: User, as: 'student', attributes: ['full_name', 'email'] },
      { model: User, as: 'mentor', attributes: ['full_name', 'email'] },
      { model: Company, as: 'company', attributes: ['name'] },
    ],
    order: [['start_date', 'DESC']],
  });

  const rows = [];
  for (const deployment of deployments) {
    const progress = await computeProgress(deployment);
    rows.push({ ...deployment.get({ plain: true }), progress });
  }

  const csv = buildCsv(deploymentColumns, rows);
  sendCsv(res, `amaliyot_natijalari_${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

const attendanceColumns = [
  { label: 'Sana', value: (r) => r.date },
  { label: "O'quvchi", value: (r) => r.deployment?.student?.full_name || '' },
  { label: 'Kompaniya', value: (r) => r.deployment?.company?.name || '' },
  { label: 'Soat', value: (r) => r.hours_worked },
  { label: 'Davomat', value: (r) => r.attendance },
  { label: 'Holat', value: (r) => r.status },
  { label: 'Koordinator kiritgan', value: (r) => (r.entered_by_coordinator ? 'Ha' : "Yo'q") },
  { label: 'Vazifa', value: (r) => r.task_description || '' },
  { label: 'Natija havolasi', value: (r) => r.result_link || '' },
  { label: 'Rad etish sababi', value: (r) => r.rejection_reason || '' },
];

const exportAttendanceCsv = async (req, res) => {
  const { from, to, deployment_id: deploymentId } = req.query;
  const where = {};
  if (deploymentId) where.deployment_id = deploymentId;
  if (from || to) {
    where.date = {};
    if (from) where.date[require('sequelize').Op.gte] = from;
    if (to) where.date[require('sequelize').Op.lte] = to;
  }

  const logs = await DailyLog.findAll({
    where,
    include: [
      {
        model: Deployment,
        as: 'deployment',
        include: [
          { model: User, as: 'student', attributes: ['full_name'] },
          { model: Company, as: 'company', attributes: ['name'] },
        ],
      },
    ],
    order: [['date', 'DESC']],
  });

  const csv = buildCsv(attendanceColumns, logs.map((l) => l.get({ plain: true })));
  sendCsv(res, `davomat_jurnali_${new Date().toISOString().slice(0, 10)}.csv`, csv);
};

module.exports = { exportDeploymentsCsv, exportAttendanceCsv };
