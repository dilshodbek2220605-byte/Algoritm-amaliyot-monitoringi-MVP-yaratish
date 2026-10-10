'use strict';

/**
 * .env mavjud bo'lmasa, .env.example dan nusxa yaratadi.
 * Bu yangi o'rnatishda "DB_PASSWORD topilmadi" kabi chalkash xatolarning oldini oladi.
 * Skript hech qachon xato bilan to'xtamaydi (exit 0).
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const examplePath = path.join(rootDir, '.env.example');

try {
  if (fs.existsSync(envPath)) {
    process.exit(0);
  }
  if (!fs.existsSync(examplePath)) {
    console.warn('[env] Ogohlantirish: .env va .env.example topilmadi.');
    process.exit(0);
  }
  fs.copyFileSync(examplePath, envPath);
  console.warn('[env] .env yaratildi (.env.example asosida).');
  console.warn('[env] Iltimos, undagi DB_PASSWORD va JWT_SECRET qiymatlarini tekshiring.');
} catch (err) {
  console.warn('[env] .env yaratishda xatolik:', err.message);
}

process.exit(0);
