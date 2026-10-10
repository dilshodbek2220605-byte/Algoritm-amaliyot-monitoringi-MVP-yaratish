'use strict';

const express = require('express');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/companies', require('./companies.routes'));
router.use('/deployments', require('./deployments.routes'));
router.use('/daily-logs', require('./dailyLogs.routes'));
router.use('/weekly-reports', require('./weeklyReports.routes'));
router.use('/audit-logs', require('./audit.routes'));
router.use('/export', require('./export.routes'));
router.use('/reminders', require('./reminders.routes'));

module.exports = router;
