'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/export.controller');

const router = express.Router();

router.use(authenticate, authorize('coordinator'));

router.get('/deployments.csv', ctrl.exportDeploymentsCsv);
router.get('/attendance.csv', ctrl.exportAttendanceCsv);

module.exports = router;
