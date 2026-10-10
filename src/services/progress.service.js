'use strict';

const { DailyLog } = require('../models');

const round1 = (n) => Math.round(Number(n) * 10) / 10;

/**
 * Hisoblash qoidalari:
 *  - O'talgan (tasdiqlangan) soat = status='approved' bo'lgan kunlik qaydlar yig'indisi.
 *  - Qolgan soat = max(0, reja - tasdiqlangan soat).
 *  - Progress % = tasdiqlangan soat / reja * 100 (100% bilan cheklanadi).
 *  - Ortig'i (overtime) alohida ko'rsatiladi.
 */
const computeProgress = async (deployment) => {
  const planned = Number(deployment.planned_hours) || 0;

  const rows = await DailyLog.findAll({
    where: { deployment_id: deployment.id },
    attributes: ['status', 'hours_worked'],
    raw: true,
  });

  let approved = 0;
  let pending = 0;
  const byStatus = { draft: 0, submitted: 0, approved: 0, rejected: 0 };

  for (const row of rows) {
    const hours = Number(row.hours_worked) || 0;
    byStatus[row.status] = (byStatus[row.status] || 0) + hours;
    if (row.status === 'approved') approved += hours;
    if (row.status === 'submitted') pending += hours;
  }

  const remaining = Math.max(0, planned - approved);
  const overtime = Math.max(0, approved - planned);
  const rawPercent = planned > 0 ? (approved / planned) * 100 : 0;
  const percent = Math.min(100, rawPercent);

  return {
    planned_hours: round1(planned),
    approved_hours: round1(approved),
    pending_hours: round1(pending),
    remaining_hours: round1(remaining),
    overtime_hours: round1(overtime),
    progress_percent: Math.round(percent * 100) / 100,
    raw_progress_percent: Math.round(rawPercent * 100) / 100,
    approved_is_over_plan: approved > planned,
    logs_by_status: {
      draft: round1(byStatus.draft),
      submitted: round1(byStatus.submitted),
      approved: round1(byStatus.approved),
      rejected: round1(byStatus.rejected),
    },
  };
};

module.exports = { computeProgress };
