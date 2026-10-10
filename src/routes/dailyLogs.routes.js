'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dailyLogs.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listLogs);
router.get('/:id', [param('id').isUUID()], validate, ctrl.getLog);

router.post(
  '/',
  [
    body('deployment_id').optional().isUUID(),
    body('date').isISO8601().withMessage('Sana yaroqsiz (YYYY-MM-DD).'),
    body('hours_worked').isFloat({ min: 0, max: 24 }).withMessage('Soat 0..24 oralig\'ida.'),
    body('attendance').optional().isIn(['present', 'excused', 'unexcused', 'day_off']),
    body('task_description').optional({ nullable: true }).isString(),
    body('result_link').optional({ nullable: true }).isString(),
    body('submit').optional().isBoolean(),
    body('reason').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.createLog
);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('hours_worked').optional().isFloat({ min: 0, max: 24 }),
    body('attendance').optional().isIn(['present', 'excused', 'unexcused', 'day_off']),
    body('task_description').optional({ nullable: true }).isString(),
    body('result_link').optional({ nullable: true }).isString(),
    body('reason').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.updateLog
);

router.post('/:id/submit', [param('id').isUUID()], validate, ctrl.submitLog);
router.post('/:id/approve', [param('id').isUUID()], validate, ctrl.approveLog);
router.post(
  '/:id/reject',
  [param('id').isUUID(), body('reason').isString().notEmpty().withMessage('Sabab majburiy.')],
  validate,
  ctrl.rejectLog
);
router.delete('/:id', [param('id').isUUID()], validate, ctrl.deleteLog);

module.exports = router;
