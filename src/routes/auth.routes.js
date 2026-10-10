'use strict';

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email formati noto\'g\'ri.'),
    body('password').isString().notEmpty().withMessage('Parol majburiy.'),
  ],
  validate,
  ctrl.login
);

router.post(
  '/register',
  [
    body('full_name').isString().trim().notEmpty().withMessage('F.I.Sh majburiy.'),
    body('email').isEmail().withMessage('Email formati noto\'g\'ri.'),
    body('password').isString().isLength({ min: 8 }).withMessage('Parol kamida 8 belgi.'),
    body('role').isIn(['intern', 'mentor']).withMessage('Rol yaroqsiz.'),
  ],
  validate,
  ctrl.register
);

router.get('/invite/:token', ctrl.inviteInfo);

router.post(
  '/invite/accept',
  [
    body('token').isString().notEmpty(),
    body('password').isString().isLength({ min: 8 }).withMessage('Parol kamida 8 belgi.'),
  ],
  validate,
  ctrl.acceptInvite
);

router.get('/me', authenticate, ctrl.me);

router.post(
  '/change-password',
  authenticate,
  [
    body('current_password').isString().notEmpty(),
    body('new_password').isString().isLength({ min: 8 }).withMessage('Yangi parol kamida 8 belgi.'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
