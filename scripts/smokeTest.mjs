/**
 * Backend API smoke-testi (end-to-end).
 *
 * Ishlatish:
 *   1) Toza bazani tayyorlang:  npm run db:reset   (backend papkasida)
 *   2) Serverni ishga tushiring: npm run dev
 *   3) Boshqa terminalda:        npm run test:api
 *
 * Manzilni o'zgartirish uchun: API_URL=http://host:port npm run test:api
 */

const base = (process.env.API_URL || 'http://localhost:4000') + '/api';
let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, msg) {
  if (cond) { pass++; console.log('  \u2713', msg); }
  else { fail++; failures.push(msg); console.log('  \u2717 FAIL:', msg); }
}

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();
  return { status: res.status, data, headers: res.headers };
}

const login = async (email, password) => {
  const r = await req('/auth/login', { method: 'POST', body: { email, password } });
  return r.data?.data?.token;
};

const dateAdd = (iso, days) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const isoWeekday = (iso) => {
  const d = new Date(iso + 'T00:00:00Z').getUTCDay();
  return d === 0 ? 7 : d;
};
const mondayOf = (iso) => dateAdd(iso, -(isoWeekday(iso) - 1));

const run = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const stamp = Date.now();

  console.log('\n== Auth ==');
  const coord = await login('coordinator@algoritm.uz', 'Password123!');
  const intern = await login('intern@algoritm.uz', 'Password123!');
  const mentor = await login('mentor@algoritm.uz', 'Password123!');
  ok(!!coord, 'koordinator login');
  ok(!!intern, 'amaliyotchi login');
  ok(!!mentor, 'mentor login');

  const badLogin = await req('/auth/login', { method: 'POST', body: { email: 'coordinator@algoritm.uz', password: 'wrong' } });
  ok(badLogin.status === 401, 'noto\'g\'ri parol 401 qaytaradi');

  const me = await req('/auth/me', { token: coord });
  ok(me.status === 200 && me.data.data.user.role === 'coordinator', '/auth/me koordinator');
  ok(me.data.data.user.password_hash === undefined, 'password_hash javobda yo\'q');

  const noAuth = await req('/users');
  ok(noAuth.status === 401, 'tokensiz so\'rov 401');

  console.log('\n== Deployments ==');
  const depList = await req('/deployments', { token: coord });
  ok(depList.status === 200, 'koordinator amaliyotlar ro\'yxati');
  const dep = depList.data.data.items[0];
  ok(!!dep, 'kamida bitta amaliyot mavjud');

  const depDetail = await req(`/deployments/${dep.id}`, { token: coord });
  ok(depDetail.status === 200 && depDetail.data.data.progress, 'amaliyot progress bilan');

  console.log('\n== Cross-role xavfsizlik ==');
  const internListDep = await req('/deployments', { token: intern });
  ok(internListDep.data.data.items.every((d) => d.student_id === dep.student_id), 'intern faqat o\'z amaliyotini ko\'radi');
  const internTryUsers = await req('/users', { token: intern });
  ok(internTryUsers.status === 403, 'intern /users ga kira olmaydi (403)');
  const internTryAudit = await req('/audit-logs', { token: intern });
  ok(internTryAudit.status === 403, 'intern auditga kira olmaydi (403)');

  console.log('\n== Kunlik qaydlar: validatsiya ==');
  const logs = await req(`/daily-logs?deployment_id=${dep.id}`, { token: coord });
  const usedDates = new Set(logs.data.data.items.map((l) => l.date));
  let freeDate = null;
  for (let i = 0; i <= 30; i++) {
    const d = dateAdd(dep.start_date, i);
    if (d > today) break;
    if (!usedDates.has(d)) { freeDate = d; break; }
  }
  ok(!!freeDate, `qayd uchun bo'sh kun topildi (${freeDate})`);

  const badLink = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 8, attendance: 'present', result_link: 'javascript:alert(1)' } });
  ok(badLink.status === 422, 'javascript: havola rad etildi (422)');

  const badLink2 = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 8, result_link: 'data:text/html,x' } });
  ok(badLink2.status === 422, 'data: havola rad etildi (422)');

  const badHours = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 8.3, attendance: 'present' } });
  ok(badHours.status === 422, '0.5 qadam bo\'lmagan soat rad etildi (422)');

  const absentHours = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 8, attendance: 'unexcused' } });
  ok(absentHours.status === 422, 'sababsiz kelmagan kunda soat>0 rad etildi (422)');

  const createLog = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 7.5, attendance: 'present', task_description: 'Test vazifa', result_link: 'https://github.com/test/repo' } });
  ok(createLog.status === 201, 'to\'g\'ri qayd yaratildi (201)');
  const logId = createLog.data.data.log.id;
  ok(createLog.data.data.log.status === 'draft', 'qayd draft holatida');

  const dupLog = await req('/daily-logs', { method: 'POST', token: intern, body: { date: freeDate, hours_worked: 5, attendance: 'present' } });
  ok(dupLog.status === 409, 'bir kunga ikki marta qayd -> 409');

  const submitLog = await req(`/daily-logs/${logId}/submit`, { method: 'POST', token: intern });
  ok(submitLog.status === 200 && submitLog.data.data.log.status === 'submitted', 'qayd tekshiruvga yuborildi');

  console.log('\n== Mentor tasdiq/rad ==');
  const mentorReviews = await req('/daily-logs?status=submitted', { token: mentor });
  ok(mentorReviews.status === 200 && mentorReviews.data.data.items.some((l) => l.id === logId), 'mentor yuborilgan qaydni ko\'radi');

  const rejectNoReason = await req(`/daily-logs/${logId}/reject`, { method: 'POST', token: mentor, body: {} });
  ok(rejectNoReason.status === 422, 'sababsiz rad etish -> 422');

  const reject = await req(`/daily-logs/${logId}/reject`, { method: 'POST', token: mentor, body: { reason: 'Natija havolasi yetarli emas' } });
  ok(reject.status === 200 && reject.data.data.log.status === 'rejected', 'mentor izoh bilan qaytardi');

  const resubmit = await req(`/daily-logs/${logId}/submit`, { method: 'POST', token: intern });
  ok(resubmit.status === 200, 'qayta yuborish mumkin (rejected -> submitted)');

  const approve = await req(`/daily-logs/${logId}/approve`, { method: 'POST', token: mentor });
  ok(approve.status === 200 && approve.data.data.log.status === 'approved', 'mentor tasdiqladi');

  const internEditApproved = await req(`/daily-logs/${logId}`, { method: 'PATCH', token: intern, body: { hours_worked: 3 } });
  ok(internEditApproved.status === 400, 'tasdiqlangan qaydni tahrirlab bo\'lmaydi (400)');

  console.log('\n== Koordinator nomidan kiritish ==');
  let freeDate2 = null;
  for (let i = 0; i <= 30; i++) {
    const d = dateAdd(dep.start_date, i);
    if (d > today) break;
    if (!usedDates.has(d) && d !== freeDate) { freeDate2 = d; break; }
  }
  if (freeDate2) {
    const onBehalf = await req('/daily-logs', { method: 'POST', token: coord, body: { deployment_id: dep.id, date: freeDate2, hours_worked: 6, attendance: 'present', task_description: 'Koordinator kiritdi', reason: 'Tizim nosozligi' } });
    ok(onBehalf.status === 201 && onBehalf.data.data.log.entered_by_coordinator === true, 'koordinator nomidan kiritish belgilandi');
    const excusedZero = await req('/daily-logs', { method: 'POST', token: coord, body: { deployment_id: dep.id, date: dateAdd(freeDate2, 1), hours_worked: 0, attendance: 'excused' } });
    ok(excusedZero.status === 201, 'excused + 0 soat qabul qilindi');
  }

  console.log('\n== Haftalik hisobot va baholash ==');
  const weekMonday = mondayOf(today);
  const saveReport = await req('/weekly-reports', { method: 'POST', token: intern, body: { week_start_date: weekMonday, student_summary: 'Yaxshi hafta', challenges: 'Vaqt', next_week_plan: 'Tezroq' } });
  ok([200, 201].includes(saveReport.status), 'intern haftalik hisobot saqladi');
  const reportId = saveReport.data.data.report.id;

  const evalNoScores = await req(`/weekly-reports/${reportId}/evaluate`, { method: 'POST', token: mentor, body: {} });
  ok(evalNoScores.status === 422, 'bahosiz va izohsiz baholash -> 422');

  const evalBad = await req(`/weekly-reports/${reportId}/evaluate`, { method: 'POST', token: mentor, body: { score_discipline: 9 } });
  ok(evalBad.status === 422, '0..5 dan tashqari baho -> 422');

  const evalOk = await req(`/weekly-reports/${reportId}/evaluate`, { method: 'POST', token: mentor, body: { score_discipline: 5, score_quality: 4, score_deadline: 4, score_independence: 3, score_teamwork: 5, mentor_feedback: 'Yaxshi' } });
  ok(evalOk.status === 200, 'mentor 5 mezon bo\'yicha baholadi');
  ok(evalOk.data.data.report.average_score === 4.2, `o'rtacha ball to'g'ri (${evalOk.data.data.report.average_score})`);

  console.log('\n== Progress hisoblash ==');
  const prog = await req(`/deployments/${dep.id}/progress`, { token: coord });
  ok(prog.data.data.progress.approved_hours >= 7.5, `tasdiqlangan soat hisoblandi (${prog.data.data.progress.approved_hours})`);
  ok(prog.data.data.progress.progress_percent <= 100, 'progress 100% bilan cheklangan');

  console.log('\n== Holat boshqaruvi ==');
  const pauseNoReason = await req(`/deployments/${dep.id}/status`, { method: 'POST', token: coord, body: { status: 'paused' } });
  ok(pauseNoReason.status === 422, 'sababsiz to\'xtatish -> 422');
  const pause = await req(`/deployments/${dep.id}/status`, { method: 'POST', token: coord, body: { status: 'paused', reason: 'Ta\'til' } });
  ok(pause.status === 200 && pause.data.data.deployment.status === 'paused', 'sabab bilan to\'xtatildi');
  const resume = await req(`/deployments/${dep.id}/status`, { method: 'POST', token: coord, body: { status: 'in_progress' } });
  ok(resume.status === 200, 'davom ettirildi');

  console.log('\n== CSV eksport ==');
  const csvRes = await fetch(base + '/export/deployments.csv', { headers: { Authorization: `Bearer ${coord}` } });
  const csvBuf = new Uint8Array(await csvRes.arrayBuffer());
  ok(csvRes.status === 200 && (csvRes.headers.get('content-type') || '').includes('text/csv'), 'deployments.csv yuklandi');
  ok(csvBuf[0] === 0xef && csvBuf[1] === 0xbb && csvBuf[2] === 0xbf, 'CSV UTF-8 BOM bilan boshlanadi (EF BB BF)');
  const attRes = await fetch(base + '/export/attendance.csv', { headers: { Authorization: `Bearer ${coord}` } });
  const attBuf = new Uint8Array(await attRes.arrayBuffer());
  ok(attRes.status === 200 && attBuf[0] === 0xef && attBuf[1] === 0xbb && attBuf[2] === 0xbf, 'attendance.csv BOM bilan');

  console.log('\n== Eslatmalar, Audit ==');
  const reminders = await req('/reminders', { token: coord });
  ok(reminders.status === 200, 'eslatmalar ro\'yxati');
  const runRem = await req('/reminders/run', { method: 'POST', token: coord });
  ok(runRem.status === 200, 'eslatmalarni tekshirish');
  const audit = await req('/audit-logs?limit=200', { token: coord });
  ok(audit.status === 200 && audit.data.data.items.some((a) => a.action === 'daily_log_entered_by_coordinator'), 'auditda koordinator nomidan kiritish qayd etildi');
  ok(audit.data.data.items.some((a) => a.action === 'daily_log_rejected'), 'auditda rad etish qayd etildi');

  console.log('\n== Foydalanuvchi yaratish + invite ==');
  const newInternEmail = `intern_${stamp}@algoritm.uz`;
  const createUser = await req('/users', { method: 'POST', token: coord, body: { full_name: 'Yangi Amaliyotchi', email: newInternEmail, role: 'intern' } });
  ok(createUser.status === 201 && createUser.data.data.invite?.link, 'invite havolasi qaytarildi');
  const inviteToken = createUser.data.data.invite.link.split('/invite/')[1];
  const inviteInfo = await req(`/auth/invite/${inviteToken}`);
  ok(inviteInfo.status === 200 && inviteInfo.data.data.email === newInternEmail, 'invite ma\'lumoti ko\'rinadi');

  const acceptBad = await req('/auth/invite/accept', { method: 'POST', body: { token: 'invalidtoken', password: 'StrongPass1' } });
  ok(acceptBad.status === 400, 'yaroqsiz invite token -> 400');

  const accept = await req('/auth/invite/accept', { method: 'POST', body: { token: inviteToken, password: 'StrongPass1', full_name: 'Yangi Amaliyotchi' } });
  ok(accept.status === 200 && accept.data.data.token, 'invite qabul qilindi va token berildi');

  const reuse = await req('/auth/invite/accept', { method: 'POST', body: { token: inviteToken, password: 'OtherPass1' } });
  ok(reuse.status === 400, 'bir martalik token qayta ishlatilmaydi');

  const newInternLogin = await login(newInternEmail, 'StrongPass1');
  ok(!!newInternLogin, 'yangi intern parol bilan kirdi');

  console.log('\n== Boshqa amaliyotchiga kirish taqiqlangan ==');
  const tryOtherDep = await req(`/deployments/${dep.id}`, { token: newInternLogin });
  ok(tryOtherDep.status === 404, 'boshqa amaliyotni ko\'rish -> 404');

  console.log('\n== Parol o\'zgartirish ==');
  const chgWrong = await req('/auth/change-password', { method: 'POST', token: newInternLogin, body: { current_password: 'nope', new_password: 'BrandNew1' } });
  ok(chgWrong.status === 400, 'noto\'g\'ri joriy parol -> 400');
  const chg = await req('/auth/change-password', { method: 'POST', token: newInternLogin, body: { current_password: 'StrongPass1', new_password: 'BrandNew1' } });
  ok(chg.status === 200, 'parol o\'zgartirildi');
  const relogin = await login(newInternEmail, 'BrandNew1');
  ok(!!relogin, 'yangi parol bilan login');

  console.log('\n== Ro\'yxatdan o\'tish (sign up) ==');
  const regBadRole = await req('/auth/register', { method: 'POST', body: { full_name: 'T T', email: `x_${stamp}@t.uz`, password: 'Password123!', role: 'coordinator' } });
  ok(regBadRole.status === 422, 'koordinator sifatida ro\'yxatdan o\'tish taqiqlangan (422)');
  const regWeak = await req('/auth/register', { method: 'POST', body: { full_name: 'T T', email: `y_${stamp}@t.uz`, password: '123', role: 'intern' } });
  ok(regWeak.status === 422, 'kuchsiz parol rad etildi (422)');
  const regDup = await req('/auth/register', { method: 'POST', body: { full_name: 'T T', email: 'coordinator@algoritm.uz', password: 'Password123!', role: 'intern' } });
  ok(regDup.status === 409, 'band email -> 409');
  const regEmail = `signup_${stamp}@t.uz`;
  const regOk = await req('/auth/register', { method: 'POST', body: { full_name: 'Signup Test', email: regEmail, password: 'Password123!', role: 'intern' } });
  ok(regOk.status === 201 && regOk.data.data.pending === true, 'ro\'yxatdan o\'tish (tasdiq kutmoqda)');
  ok(regOk.data.data.user.password_hash === undefined, 'signup javobida password_hash yo\'q');
  const regLogin = await req('/auth/login', { method: 'POST', body: { email: regEmail, password: 'Password123!' } });
  ok(regLogin.status === 403, 'tasdiqlanmagan hisob kira olmaydi (403)');

  console.log(`\n===== NATIJA: ${pass} o'tdi, ${fail} muvaffaqiyatsiz =====`);
  if (fail > 0) { console.log('Muvaffaqiyatsiz testlar:'); failures.forEach((f) => console.log('  -', f)); }
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((e) => { console.error('TEST XATOSI:', e); process.exit(1); });
