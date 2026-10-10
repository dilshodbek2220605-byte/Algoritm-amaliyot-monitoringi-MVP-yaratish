'use strict';

const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');
const { toDateOnly } = require('../utils/time');

const listAuditLogs = async (req, res) => {
  const {
    action,
    entity_name: entityName,
    entity_id: entityId,
    user_id: userId,
    from,
    to,
    limit = 100,
    offset = 0,
  } = req.query;

  const where = {};
  if (action) where.action = action;
  if (entityName) where.entity_name = entityName;
  if (entityId) where.entity_id = entityId;
  if (userId) where.user_id = userId;
  if (from || to) {
    where.created_at = {};
    if (from) where.created_at[Op.gte] = new Date(`${toDateOnly(from)}T00:00:00+05:00`);
    if (to) where.created_at[Op.lte] = new Date(`${toDateOnly(to)}T23:59:59+05:00`);
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] }],
    order: [['created_at', 'DESC']],
    limit: Math.min(Number(limit) || 100, 500),
    offset: Number(offset) || 0,
  });

  res.json({ success: true, data: { items: rows, total: count } });
};

module.exports = { listAuditLogs };
