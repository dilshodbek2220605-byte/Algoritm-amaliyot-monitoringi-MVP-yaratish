'use strict';

const { AuditLog } = require('../models');

/**
 * Audit yozuvini yaratadi. Hech qachon asosiy oqimni buzmaydi.
 */
const recordAudit = async ({
  userId = null,
  action,
  entityName,
  entityId = null,
  changes = null,
  reason = null,
}) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_name: entityName,
      entity_id: entityId,
      changes,
      reason,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit] yozib bo\'lmadi:', err.message);
  }
};

module.exports = { recordAudit };
