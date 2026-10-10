'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/deployments.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listDeployments);
router.get('/:id', [param('id').isUUID()], validate, ctrl.getDeployment);
router.get('/:id/progress', [param('id').isUUID()], validate, ctrl.getProgress);

router.post(
  '/',
  authorize('coordinator'),
  [
    body('student_id').isUUID().withMessage('student_id majburiy.'),
    body('company_id').isUUID().withMessage('company_id majburiy.'),
    body('mentor_id').optional({ nullable: true }).isUUID(),
    body('start_date').isISO8601().withMessage('Boshlanish sanasi yaroqsiz.'),
    body('end_date').isISO8601().withMessage('Tugash sanasi yaroqsiz.'),
    body('planned_hours').isFloat({ min: 0.5 }).withMessage('Reja soati musbat bo\'lishi kerak.'),
    body('hiring_status').optional().isString(),
  ],
  validate,
  ctrl.createDeployment
);

router.patch(
  '/:id',
  authorize('coordinator'),
  [
    param('id').isUUID(),
    body('mentor_id').optional({ nullable: true }).isUUID(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('planned_hours').optional().isFloat({ min: 0 }),
    body('hiring_status').optional({ nullable: true }).isString(),
    body('company_id').optional().isUUID(),
  ],
  validate,
  ctrl.updateDeployment
);

router.post(
  '/:id/status',
  authorize('coordinator'),
  [
    param('id').isUUID(),
    body('status')
      .isIn(['placed', 'in_progress', 'paused', 'completed', 'terminated_early'])
      .withMessage('Holat yaroqsiz.'),
    body('reason').optional({ nullable: true }).isString(),
  ],
  validate,
  ctrl.changeStatus
);

router.post(
  '/:id/complete',
  authorize('coordinator'),
  [param('id').isUUID(), body('hiring_status').optional().isString()],
  validate,
  ctrl.completeDeployment
);

module.exports = router;
