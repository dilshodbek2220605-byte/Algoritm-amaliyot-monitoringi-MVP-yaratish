'use strict';

const { buildRemindersReport } = require('../services/attendance.service');
const { recordAudit } = require('../utils/audit');

const getReminders = async (req, res) => {
  const { deployment_id: deploymentId, skip_weekends: skipWeekends } = req.query;
  const report = await buildRemindersReport({
    deploymentId: deploymentId || null,
    skipWeekends: skipWeekends === undefined ? true : skipWeekends !== 'false',
  });
  res.json({ success: true, data: { items: report, total: report.length } });
};

const runReminders = async (req, res) => {
  const report = await buildRemindersReport({});
  await recordAudit({
    userId: req.user.id,
    action: 'reminders_run',
    entityName: 'System',
    entityId: null,
    changes: { generated: report.length },
  });
  res.json({ success: true, data: { items: report, total: report.length } });
};

module.exports = { getReminders, runReminders };
