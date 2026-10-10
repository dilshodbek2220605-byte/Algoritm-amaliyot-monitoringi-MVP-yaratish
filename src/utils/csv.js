'use strict';

const BOM = '\uFEFF';

const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Qatorlar massividan CSV matn yasaydi.
 * Ajratuvchi: nuqta-vergul (,) — Excel uchun qulay.
 * UTF-8 BOM bilan qaytariladi.
 */
const buildCsv = (columns, rows, { delimiter = ',' } = {}) => {
  const header = columns.map((col) => escapeCell(col.label)).join(delimiter);
  const body = rows
    .map((row) =>
      columns.map((col) => escapeCell(col.value(row))).join(delimiter)
    )
    .join('\r\n');
  return BOM + header + '\r\n' + body + '\r\n';
};

module.exports = { buildCsv, BOM };
