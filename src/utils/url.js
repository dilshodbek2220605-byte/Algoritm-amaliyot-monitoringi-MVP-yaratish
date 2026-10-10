'use strict';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Tashqi havolani xavfsiz tarzda tekshiradi.
 * Faqat http/https qabul qilinadi. javascript:, data:, vbscript:, file: va
 * boshqa xavfli sxemalar serverda keskin rad etiladi.
 */
const validateExternalUrl = (rawUrl, { field = 'result_link' } = {}) => {
  if (rawUrl === null || rawUrl === undefined || rawUrl === '') {
    return null;
  }

  if (typeof rawUrl !== 'string') {
    throw new Error(`${field}: havola matn ko'rinishida bo'lishi kerak.`);
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 1000) {
    throw new Error(`${field}: havola juda uzun (maksimal 1000 belgi).`);
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (_err) {
    throw new Error(`${field}: havola formati noto'g'ri.`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(
      `${field}: faqat http yoki https protokolli havolalarga ruxsat beriladi.`
    );
  }

  if (!parsed.hostname) {
    throw new Error(`${field}: havolada manzil (host) bo'lishi shart.`);
  }

  return parsed.toString();
};

module.exports = { validateExternalUrl, ALLOWED_PROTOCOLS };
