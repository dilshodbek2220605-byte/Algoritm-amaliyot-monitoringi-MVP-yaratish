'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/weeklyReports.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listReports);
router.get('/:id', [param('id').isUUID()], validate, ctrl.getReport);

router.post(
  '/',
  [
    body('deployment_id').optional().isUUID(),
    body('week_start_date').isISO8601().withMessage('Hafta sanasi yaroqsiz.'),
    body('student_summary').optional({ nullable: true }).isString(),
    body('challenges').optional({ nullable: true }).isString(),
    body('next_week_plan').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.upsertReport
);

const scoreValidator = (field) =>
  body(field).optional({ nullable: true }).isInt({ min: 0, max: 5 }).withMessage('Baho 0..5.');

router.post(
  '/:id/evaluate',
  [
    param('id').isUUID(),
    scoreValidator('score_discipline'),
    scoreValidator('score_quality'),
    scoreValidator('score_deadline'),
    scoreValidator('score_independence'),
    scoreValidator('score_teamwork'),
    body('mentor_feedback').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.evaluateReport
);

module.exports = router;
