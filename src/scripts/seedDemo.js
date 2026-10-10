'use strict';

/**
 * Demo ma'lumotlar: koordinator, mentor, 2 ta amaliyotchi, kompaniya va
 * namuna amaliyot. `npm run seed:demo` orqali ishga tushiriladi.
 * (Avval `npm run db:migrate` bajarilgan bo'lishi kerak.)
 */

const { sequelize, User, Company, Deployment, DailyLog, WeeklyReport } = require('../models');
const { hashPassword } = require('../utils/password');
const { todayISO, weekStart, dayjs } = require('../utils/time');

const upsertUser = async (payload) => {
  const [user] = await User.findOrCreate({
    where: { email: payload.email },
    defaults: payload,
  });
  return user;
};

const run = async () => {
  await sequelize.authenticate();

  const passwordHash = await hashPassword('Password123!');

  const coordinator = await upsertUser({
    full_name: 'Bosh Koordinator',
    email: 'coordinator@algoritm.uz',
    password_hash: passwordHash,
    role: 'coordinator',
    is_active: true,
  });

  const mentor = await upsertUser({
    full_name: 'Aziz Mentor',
    email: 'mentor@algoritm.uz',
    password_hash: passwordHash,
    role: 'mentor',
    is_active: true,
  });

  const intern = await upsertUser({
    full_name: 'Dilnoza Amaliyotchi',
    email: 'intern@algoritm.uz',
    password_hash: passwordHash,
    role: 'intern',
    is_active: true,
  });

  const [company] = await Company.findOrCreate({
    where: { name: 'Algoritm Tech MChJ' },
    defaults: {
      name: 'Algoritm Tech MChJ',
      industry: 'Dasturiy ta\'minot',
      address: 'Toshkent sh., Amir Temur ko\'chasi 1',
      contact_info: '+998 71 200 00 00',
      is_active: true,
    },
  });

  const start = dayjs(todayISO()).subtract(10, 'day').format('YYYY-MM-DD');
  const end = dayjs(todayISO()).add(20, 'day').format('YYYY-MM-DD');

  const [deployment] = await Deployment.findOrCreate({
    where: { student_id: intern.id, company_id: company.id },
    defaults: {
      student_id: intern.id,
      company_id: company.id,
      mentor_id: mentor.id,
      start_date: start,
      end_date: end,
      planned_hours: 120,
      status: 'in_progress',
      hiring_status: 'Kutilmoqda',
    },
  });

  const monday = weekStart(todayISO());
  await WeeklyReport.findOrCreate({
    where: { deployment_id: deployment.id, week_start_date: monday },
    defaults: {
      deployment_id: deployment.id,
      week_start_date: monday,
      student_summary: 'React komponentlari va REST API bilan tanishdim.',
      challenges: 'Testlashda vaqt yetishmadi.',
      next_week_plan: 'Testlarni yozish, kod sifatini oshirish.',
    },
  });

  for (let i = 1; i <= 3; i += 1) {
    const date = dayjs(todayISO()).subtract(i, 'day').format('YYYY-MM-DD');
    if (dayjs(date).isoWeekday() >= 6) continue;
    await DailyLog.findOrCreate({
      where: { deployment_id: deployment.id, date },
      defaults: {
        deployment_id: deployment.id,
        date,
        hours_worked: 8,
        attendance: 'present',
        task_description: `Amaliy topshiriq #${i}`,
        result_link: 'https://github.com/algoritm/demo',
        status: 'submitted',
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('[seed:demo] Tayyor. Login: coordinator@algoritm.uz / Password123!');
  // eslint-disable-next-line no-console
  console.log('  mentor@algoritm.uz, intern@algoritm.uz — parol: Password123!');
  await sequelize.close();
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:demo] xato:', err);
  process.exit(1);
});
