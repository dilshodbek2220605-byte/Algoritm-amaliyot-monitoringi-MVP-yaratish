'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

const router = express.Router();

router.use(authenticate, authorize('coordinator'));

router.get('/', ctrl.listUsers);
router.get('/:id', [param('id').isUUID()], validate, ctrl.getUser);

router.post(
  '/',
  [
    body('full_name').isString().notEmpty().withMessage('F.I.Sh majburiy.'),
    body('email').isEmail().withMessage('Email formati noto\'g\'ri.'),
    body('role').isIn(['coordinator', 'intern', 'mentor']).withMessage('Rol yaroqsiz.'),
    body('password').optional().isString().isLength({ min: 8 }),
  ],
  validate,
  ctrl.createUser
);

router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('full_name').optional().isString().notEmpty(),
    body('role').optional().isIn(['coordinator', 'intern', 'mentor']),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  ctrl.updateUser
);

router.post('/:id/invite', [param('id').isUUID()], validate, ctrl.resendInvite);
router.delete('/:id', [param('id').isUUID()], validate, ctrl.deactivateUser);

module.exports = router;
