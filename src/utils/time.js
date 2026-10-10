'use strict';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

const TZ = 'Asia/Tashkent';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sanani vaqt-zona siljishisiz kunlik (date-only) sifatida tahlil qiladi.
 * "2025-01-01" kabi matnlar UTC sifatida o'qiladi (kun o'zgarmaydi),
 * to'liq timestamp'lar esa Asia/Tashkent zonasiga o'tkaziladi.
 */
const asDay = (value) => {
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    return dayjs.utc(value);
  }
  return dayjs(value).tz(TZ);
};

const now = () => dayjs().tz(TZ);
const todayISO = () => now().format('YYYY-MM-DD');
const toDateOnly = (value) => asDay(value).format('YYYY-MM-DD');

const isWeekend = (value) => {
  const weekday = asDay(value).isoWeekday();
  return weekday === 6 || weekday === 7; // shanba / yakshanba
};

// Shu kun kiradigan haftaning dushanbasi.
const weekStart = (value) => asDay(value).isoWeekday(1).format('YYYY-MM-DD');

const eachDayInclusive = (start, end, cb) => {
  let cursor = asDay(start).startOf('day');
  const last = asDay(end).startOf('day');
  while (cursor.isSameOrBefore(last, 'day')) {
    cb(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
};

module.exports = {
  dayjs,
  TZ,
  now,
  todayISO,
  toDateOnly,
  isWeekend,
  weekStart,
  eachDayInclusive,
  asDay,
};
