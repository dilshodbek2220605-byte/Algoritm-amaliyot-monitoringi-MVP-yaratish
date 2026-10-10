'use strict';

const cron = require('node-cron');

const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');
const { buildRemindersReport } = require('./services/attendance.service');

const startReminderJob = () => {
  // Har kuni ertalab 09:00 (Asia/Tashkent) da qayd qilinmagan kunlarni tekshiradi.
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const report = await buildRemindersReport({});
        if (report.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[reminders] ${report.length} ta amaliyotda qayd qilinmagan kunlar mavjud.`
          );
        } else {
          // eslint-disable-next-line no-console
          console.log('[reminders] Barcha kunlik qaydlar joyida.');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[reminders] xato:', err.message);
      }
    },
    { timezone: env.timezone }
  );
};

const bootstrap = async () => {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('[db] PostgreSQL ulanish muvaffaqiyatli.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] Ulanib bo\'lmadi:', err.message);
  }

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] http://localhost:${env.port} da ishga tushdi (${env.nodeEnv}).`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(
        `[server] ${env.port}-port band. Boshqa jarayonni to'xtating yoki .env dagi PORT qiymatini o'zgartiring.`
      );
    } else {
      // eslint-disable-next-line no-console
      console.error('[server] xato:', err.message);
    }
    process.exit(1);
  });

  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('\n[server] To\'xtatilmoqda...');
    server.close(() => {
      sequelize.close().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  startReminderJob();
};

bootstrap();

module.exports = app;
