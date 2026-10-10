'use strict';

const { Op } = require('sequelize');
const { Company } = require('../models');
const ApiError = require('../utils/ApiError');
const { recordAudit } = require('../utils/audit');

const listCompanies = async (req, res) => {
  const { search, is_active: isActive, limit = 100, offset = 0 } = req.query;
  const where = {};

  if (isActive !== undefined) where.is_active = isActive === 'true' || isActive === true;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { industry: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Company.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit: Math.min(Number(limit) || 100, 500),
    offset: Number(offset) || 0,
  });

  res.json({ success: true, data: { items: rows, total: count } });
};

const getCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) throw ApiError.notFound('Kompaniya topilmadi.');
  res.json({ success: true, data: { company } });
};

const createCompany = async (req, res) => {
  const { name, industry, address, contact_info: contactInfo } = req.body;
  const company = await Company.create({ name, industry, address, contact_info: contactInfo });

  await recordAudit({
    userId: req.user.id,
    action: 'company_created',
    entityName: 'Company',
    entityId: company.id,
    changes: { name: company.name },
  });

  res.status(201).json({ success: true, data: { company } });
};

const updateCompany = async (req, res) => {
  const company = await Company.findByPk(req.params.id);
  if (!company) throw ApiError.notFound('Kompaniya topilmadi.');

  const allowed = ['name', 'industry', 'address', 'contact_info', 'is_active'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) company[field] = req.body[field];
  }
  await company.save();

  await recordAudit({
    userId: req.user.id,
    action: 'company_updated',
    entityName: 'Company',
    entityId: company.id,
  });

  res.json({ success: true, data: { company } });
};

module.exports = { listCompanies, getCompany, createCompany, updateCompany };
