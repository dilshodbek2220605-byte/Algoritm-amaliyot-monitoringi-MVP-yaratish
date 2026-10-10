'use strict';

const { DailyLog, Deployment, User, Company } = require('../models');
const { dayjs, TZ, todayISO, isWeekend, eachDayInclusive } = require('../utils/time');

/**
 * Amaliyot davomida kunlik qayd yo'q kunlarni topadi (eslatmalar uchun).
 * Standart holatda dam olish kunlari (shanba/yakshanba) hisobga olinmaydi.
 */
const findMissingDays = async (deployment, { skipWeekends = true } = {}) => {
  const start = dayjs(deployment.start_date).tz(TZ);
  const end = dayjs(deployment.end_date).tz(TZ);
  const today = dayjs(todayISO()).tz(TZ);
  const lastDay = end.isBefore(today, 'day') ? end : today;

  if (lastDay.isBefore(start, 'day')) return [];

  const logs = await DailyLog.findAll({
    where: { deployment_id: deployment.id },
    attributes: ['date', 'status'],
    raw: true,
  });
  const loggedDates = new Set(logs.map((l) => l.date));

  const missing = [];
  eachDayInclusive(start.format('YYYY-MM-DD'), lastDay.format('YYYY-MM-DD'), (date) => {
    if (skipWeekends && isWeekend(date)) return;
    if (!loggedDates.has(date)) missing.push(date);
  });

  return missing;
};

/**
 * Koordinator uchun: faol amaliyotlar bo'yicha qayd qilinmagan kunlar hisoboti.
 */
const buildRemindersReport = async ({ deploymentId = null, skipWeekends = true } = {}) => {
  const where = {
    status: ['placed', 'in_progress'],
  };
  if (deploymentId) where.id = deploymentId;

  const deployments = await Deployment.findAll({
    where,
    include: [
      { model: User, as: 'student', attributes: ['id', 'full_name', 'email'] },
      { model: Company, as: 'company', attributes: ['id', 'name'] },
    ],
  });

  const report = [];
  for (const deployment of deployments) {
    const missing = await findMissingDays(deployment, { skipWeekends });
    if (missing.length > 0) {
      report.push({
        deployment_id: deployment.id,
        student: deployment.student,
        company: deployment.company,
        start_date: deployment.start_date,
        end_date: deployment.end_date,
        missing_days_count: missing.length,
        missing_days: missing,
      });
    }
  }

  return report;
};

module.exports = { findMissingDays, buildRemindersReport };
