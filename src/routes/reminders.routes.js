'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/reminders.controller');

const router = express.Router();

router.use(authenticate, authorize('coordinator', 'mentor'));

router.get('/', ctrl.getReminders);
router.post('/run', authorize('coordinator'), ctrl.runReminders);

module.exports = router;
