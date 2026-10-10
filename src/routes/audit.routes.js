'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/audit.controller');

const router = express.Router();

router.use(authenticate, authorize('coordinator'));
router.get('/', ctrl.listAuditLogs);

module.exports = router;
