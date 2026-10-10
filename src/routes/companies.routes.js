'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/companies.controller');

const router = express.Router();

router.use(authenticate);

// Koordinator, mentor va amaliyotchi kompaniya ro'yxatini ko'rishi mumkin.
router.get('/', ctrl.listCompanies);
router.get('/:id', [param('id').isUUID()], validate, ctrl.getCompany);

router.post(
  '/',
  authorize('coordinator'),
  [body('name').isString().notEmpty().withMessage('Kompaniya nomi majburiy.')],
  validate,
  ctrl.createCompany
);

router.patch(
  '/:id',
  authorize('coordinator'),
  [
    param('id').isUUID(),
    body('name').optional().isString().notEmpty(),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  ctrl.updateCompany
);

module.exports = router;
