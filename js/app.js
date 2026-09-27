'use strict';
/*
 * نظام إدارة الجودة — نسخة ثابتة (HTML/CSS/JS عادي بدون أي إطار عمل أو أداة بناء).
 * التخزين: localStorage بمفاتيح تحاكي أسماء مجموعات Firestore في النظام الأصلي
 * (emp/ev/log/cfg) — راجع STORE أدناه عند الرغبة بالربط مع Firebase لاحقاً:
 *   1) استبدلي load()/save() بنداءات onSnapshot/setDoc بنفس المفاتيح.
 *   2) استبدلي CURRENT_USER بمستخدم Firebase Auth حقيقي ودوره من مجموعة roles/{uid}.
 */

/* ============================== التخزين ============================== */
const STORAGE_PREFIX = 'quality-system:';
function load(key, fallback) {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch { /* تجاهل */ }
}
const CURRENT_USER = { uid: 'local-demo', name: 'مديرة الجودة', role: 'admin' };

/* ============================== البيانات التجريبية ============================== */
const EMPLOYEES_SEED = [
  { id: 'e1', name: 'سارة العتيبي', role: 'أخصائية خدمة عملاء', active: true, avatarColor: '#c3a5ef' },
  { id: 'e2', name: 'ريم القحطاني', role: 'قائدة فريق', active: true, avatarColor: '#f59ab6' },
  { id: 'e3', name: 'نورة الحربي', role: 'أخصائية خدمة عملاء', active: true, avatarColor: '#9fd9b6' },
  { id: 'e4', name: 'جود المطيري', role: 'أخصائية خدمة عملاء', active: true, avatarColor: '#f3c77b' },
  { id: 'e5', name: 'لينا الغامدي', role: 'أخصائية خدمة عملاء', active: false, avatarColor: '#9fc5df' },
  { id: 'e6', name: 'هدى الزهراني', role: 'أخصائية خدمة عملاء', active: true, avatarColor: '#e8a7d1' },
];
const EVALS_SEED = [
  { id: 'v1', date: '2025-06-11', employeeId: 'e1', calls: 128, quality: 94, fcr: 91, adherence: 97, csat: 4.8, complaints: 1, note: 'استماع ممتاز وشرح واضح للحل.' },
  { id: 'v2', date: '2025-06-10', employeeId: 'e2', calls: 116, quality: 91, fcr: 88, adherence: 95, csat: 4.6, complaints: 2, note: 'تحتاج إلى توثيق الخطوة الأخيرة بشكل أدق.' },
  { id: 'v3', date: '2025-06-09', employeeId: 'e3', calls: 142, quality: 88, fcr: 86, adherence: 92, csat: 4.5, complaints: 3, note: 'هدوء رائع في الحالات الحساسة.' },
  { id: 'v4', date: '2025-06-08', employeeId: 'e4', calls: 109, quality: 82, fcr: 79, adherence: 89, csat: 4.1, complaints: 5, note: 'جلسة تدريب مقترحة حول الإغلاق.' },
  { id: 'v5', date: '2025-06-07', employeeId: 'e6', calls: 134, quality: 86, fcr: 84, adherence: 93, csat: 4.3, complaints: 3, note: 'تقدم ثابت ومميز في رضا العملاء.' },
  { id: 'v6', date: '2025-05-28', employeeId: 'e1', calls: 121, quality: 92, fcr: 90, adherence: 95, csat: 4.7, complaints: 1, note: 'تواصل دافئ وفعّال.' },
];
const ACTIVITY_SEED = [
  { id: 'a1', at: '2025-06-11T10:48:00.000Z', uid: 'local-demo', user: 'أنتِ', action: 'أضافت تقييماً', detail: 'سارة العتيبي · 11 يونيو' },
  { id: 'a2', at: '2025-06-11T10:00:00.000Z', uid: 'demo-reem', user: 'ريم القحطاني', action: 'حدّثت ملاحظة تدريب', detail: 'جود المطيري · متابعة الإغلاق' },
  { id: 'a3', at: '2025-06-10T16:30:00.000Z', uid: 'local-demo', user: 'أنتِ', action: 'صدّرت التقرير الرسمي', detail: 'تقرير مايو ٢٠٢٥' },
  { id: 'a4', at: '2025-06-10T11:15:00.000Z', uid: 'system', user: 'نظام الجودة', action: 'رصد تنبيه', detail: 'انخفاض FCR لفريق المساء' },
];
const DEFAULT_CONFIG = { weights: { quality: 40, fcr: 20, adherence: 20, csat: 20 }, targets: { quality: 90, fcr: 85, adherence: 94, csat: 4.5 }, thresholds: { excellent: 90, needs: 80 } };

/* ============================== الحالة ============================== */
let employees = load('employees', EMPLOYEES_SEED);
let evaluations = load('evaluations', EVALS_SEED);
let activities = load('activities', ACTIVITY_SEED);
let config = load('config', DEFAULT_CONFIG);

function persist() { save('employees', employees); save('evaluations', evaluations); save('activities', activities); save('config', config); }
function addActivity(action, detail) {
  activities = [{ id: 'a' + Date.now(), at: new Date().toISOString(), uid: CURRENT_USER.uid, user: 'أنتِ', action, detail }, ...activities];
  persist();
}
function score(e) {
  return Math.round(
    e.quality * (config.weights.quality / 100) +
    e.fcr * (config.weights.fcr / 100) +
    e.adherence * (config.weights.adherence / 100) +
    (e.csat / 5 * 100) * (config.weights.csat / 100)
  );
}
function statusOf(s) { return s >= config.thresholds.excellent ? ['ممتاز', 'mint'] : s >= config.thresholds.needs ? ['جيد', 'peach'] : ['يحتاج تحسين', 'pink']; }
function barClass(s) { return s >= config.thresholds.excellent ? '' : s >= config.thresholds.needs ? 'warn' : 'bad'; }
function avg(list, key) { const f = typeof key === 'function' ? key : e => e[key]; return list.length ? Math.round(list.reduce((a, e) => a + f(e), 0) / list.length) : 0; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(iso) { try { return new Date(iso + 'T00:00:00').toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; } }
function fmtDateTime(iso) { try { return new Date(iso).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } }

/* ============================== أيقونات SVG صغيرة ============================== */
const ICONS = {
  dashboard: 'M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z',
  evaluations: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  bulk: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  employees: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  report: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  monthly: 'M18 20V10M12 20V4M6 20v-6',
  activity: 'M13 2 3 14h9l-1 8 10-12h-9z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  menu: 'M3 12h18M3 6h18M3 18h18',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54z',
  chevron: 'M15 18l-6-6 6-6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  sparkles: 'M12 3v4M3 12h4M19 12h2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  trending: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9z',
};
function icon(name, size) { size = size || 17; return `<svg class="i" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${ICONS[name] || ''}"/></svg>`; }

/* ============================== أدوات التصدير ============================== */
async function exportElementToPdf(el, filename) {
  if (!window.html2canvas || !window.jspdf) { alert('تعذّر تحميل مكتبة PDF — تحققي من الاتصال بالإنترنت. يمكنك استخدام «طباعة» بدلاً من ذلك.'); return; }
  try {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: bg });
    const pageH = Math.floor(canvas.width * 297 / 210);
    for (let y = 0, page = 0; y < canvas.height; y += pageH, page++) {
      const h = Math.min(pageH, canvas.height - y);
      const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = h;
      const ctx = slice.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, slice.width, h);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page) doc.addPage();
      doc.addImage(slice.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 210, h * 210 / canvas.width);
    }
    doc.save(filename);
  } catch { alert('تعذّر إنشاء ملف PDF.'); }
}
function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
function downloadJSON(filename, data) { downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); }
function exportExcel() {
  if (!window.XLSX) { alert('تعذّر تحميل مكتبة Excel.'); return; }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employees.map(e => ({ الموظف: e.name, المسمى: e.role, الحالة: e.active ? 'نشطة' : 'متوقفة مؤقتاً' }))), 'الموظفون');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evaluations.map(e => { const emp = employees.find(x => x.id === e.employeeId); const s = score(e); return { التاريخ: e.date, الموظف: emp ? emp.name : e.employeeId, 'عدد المكالمات': e.calls, 'Quality %': e.quality, 'FCR %': e.fcr, 'Adherence %': e.adherence, 'CSAT %': e.csat, الشكاوى: e.complaints, 'الدرجة المركبة %': s, الحالة: statusOf(s)[0], ملاحظات: e.note }; })), 'التقييمات');
  downloadBlob(`quality-backup-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' }));
  addActivity('صدّرت نسخة Excel', 'الموظفون والتقييمات');
}
async function importExcel(file) {
  if (!window.XLSX) { alert('تعذّر تحميل مكتبة Excel.'); return; }
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    let rows = [];
    for (const name of wb.SheetNames) { const r = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null }); if (r.length && (('الموظف' in r[0]) || ('الموظفة' in r[0])) && 'التاريخ' in r[0]) { rows = r; break; } }
    if (!rows.length) throw new Error('لم أجد ورقة تحتوي عمودي «الموظف» و«التاريخ»');
    const pct = v => { const n = parseFloat(v ?? 0) || 0; return +(n <= 1 ? n * 100 : n).toFixed(2); };
    const asDate = v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);
    let created = 0;
    for (const r of rows) {
      const name = String(r['الموظف'] ?? r['الموظفة'] ?? '').trim();
      const date = r['التاريخ'] ? asDate(r['التاريخ']) : '';
      if (!name || !date) continue;
      let emp = employees.find(x => x.name === name);
      if (!emp) { emp = { id: 'e' + Date.now() + created, name, role: 'أخصائية خدمة عملاء', active: true, avatarColor: '#c3a5ef' }; employees.push(emp); }
      const data = { date, employeeId: emp.id, calls: parseFloat(r['عدد المكالمات'] ?? 0) || 0, quality: pct(r['Quality %']), fcr: pct(r['FCR %']), adherence: pct(r['Adherence %'] ?? r['الالتزام %']), csat: pct(r['CSAT %']), complaints: parseFloat(r['الشكاوى'] ?? 0) || 0, note: String(r['ملاحظات'] ?? '') };
      const idx = evaluations.findIndex(v => v.employeeId === emp.id && v.date === date);
      if (idx >= 0) evaluations[idx] = { ...evaluations[idx], ...data }; else evaluations.push({ id: 'v' + Date.now() + created, ...data });
      created++;
    }
    persist(); addActivity('استوردت من Excel', `${created} تقييم`); alert(`تم استيراد ${created} تقييم بنجاح`); render();
  } catch (err) { alert(err.message || 'تعذّر استيراد الملف'); }
}

/* ============================== التوجيه ============================== */
const NAV = [
  { href: '/', label: 'نظرة عامة', icon: 'dashboard' },
  { href: '/evaluations', label: 'التقييمات', icon: 'evaluations' },
  { href: '/bulk-entry', label: 'إدخال جماعي', icon: 'bulk' },
  { href: '/employees', label: 'الموظفون', icon: 'employees' },
  { href: '/employee-report', label: 'تقارير الموظفين', icon: 'report' },
  { href: '/monthly-report', label: 'التقرير الشهري', icon: 'monthly' },
  { href: '/activity', label: 'سجل النشاط', icon: 'activity' },
];
function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  return { path: path || '/', params };
}
function navigate(href) { location.hash = '#' + href; }

/* ============================== الإطار العام ============================== */
function shell(pageHtml, title) {
  const { path } = parseHash();
  const current = NAV.find(n => n.href === path);
  return `
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="brand-badge">${icon('shield', 22)}</div><div><div class="brand-title display">الجودة</div><div class="brand-sub">نظام إدارة الجودة</div></div></div>
    <div class="nav-label">مساحة العمل</div>
    <nav>${NAV.map(n => `<a class="nav-link ${path === n.href ? 'active' : ''}" data-route="${n.href}" href="#${n.href}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}</nav>
    <div style="margin-top:18px;border-top:1px solid var(--border);padding-top:14px">
      <div class="nav-label">الإدارة</div>
      <a class="nav-link ${path === '/settings' ? 'active' : ''}" href="#/settings">${icon('settings')}<span>الإعدادات</span></a>
    </div>
    <div class="sidebar-footer">
      <div class="row" style="color:#416c55"><span>${icon('sparkles', 16)}</span><b style="font-size:13px">نظام إدارة الجودة</b></div>
      <p>كل تغييراتك محفوظة محلياً في متصفحك ويمكنك تجربتها بأمان.</p>
    </div>
    <div class="sidebar-user"><div class="avatar sm" style="background:#c3a5ef">${CURRENT_USER.name[0]}</div><div style="flex:1;min-width:0"><div class="name">${esc(CURRENT_USER.name)}</div><div class="role">وضع تجريبي</div></div></div>
  </aside>
  <div class="main">
    <header class="topbar">
      <div class="row"><button class="icon-btn" id="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">${icon('menu', 20)}</button>
        <div><p class="crumb">نظام إدارة الجودة / ${esc(title)}</p><h1>${esc(title)}</h1></div>
      </div>
      <div class="row"><button class="icon-btn" aria-label="التنبيهات">${icon('bell', 18)}</button></div>
    </header>
    <div class="page">${pageHtml}</div>
  </div>`;
}

/* ============================== لوحة التحليل ============================== */
function pageDashboard() {
  const active = employees.filter(e => e.active);
  const ranking = active.map(e => ({ e, s: avg(evaluations.filter(v => v.employeeId === e.id), score) })).sort((a, b) => b.s - a.s);
  const overall = avg(evaluations, score);
  const fcrAvg = avg(evaluations, 'fcr'), adhAvg = avg(evaluations, 'adherence'), complaints = evaluations.reduce((a, e) => a + e.complaints, 0);
  const flagged = ranking.filter(r => r.s < config.thresholds.needs);
  return `
  <section class="card" style="background:var(--mint-soft);margin-bottom:20px">
    <div class="row" style="color:#4f8068;font-size:13px;font-weight:800;margin-bottom:8px">${icon('sparkles', 16)} أهلاً بكِ</div>
    <h2 class="display" style="font-size:32px;margin:0;color:#355b48">نظام إدارة الجودة<br><span style="color:#a85f7a">نبض فريقك اليوم</span></h2>
    <p style="color:#567664;font-size:13px;max-width:420px;margin-top:10px">كل مراجعة صغيرة تصنع تجربة أكبر — ${active.length} عضوة نشطة الآن.</p>
  </section>
  <div class="between" style="margin-bottom:16px">
    <div><h3 class="section-title">لمحة هذا الشهر</h3><p class="muted" style="font-size:13px;margin:4px 0 0">أداء الفريق حسب آخر التقييمات المسجّلة</p></div>
    <div class="actions"><a class="btn" href="#/evaluations">${icon('plus', 16)} تقييم جديد</a></div>
  </div>
  <div class="grid cols-4" style="margin-bottom:20px">
    ${kpiCard('mint-soft', overall + '%', 'الدرجة المركبة', 'متوسط كل التقييمات')}
    ${kpiCard('lavender', fcrAvg + '%', 'FCR', 'هدف ' + config.targets.fcr + '%')}
    ${kpiCard('pink-soft', adhAvg + '%', 'الالتزام', 'هدف ' + config.targets.adherence + '%')}
    ${kpiCard('peach-soft', complaints, 'الشكاوى المرصودة', 'إجمالي كل الفترات')}
  </div>
  <div class="grid cols-2">
    <div class="card"><div class="between" style="margin-bottom:14px"><h3 class="section-title">ترتيب الفريق</h3><a href="#/employee-report" style="font-size:12px;font-weight:800;color:#a26a86">التقرير الكامل ${icon('chevron', 13)}</a></div>
      ${ranking.slice(0, 5).map((r, i) => `<a class="row" href="#/employee-report?employee=${r.e.id}" style="padding:8px;border-radius:16px;margin-bottom:2px">
        <span style="width:20px;text-align:center;font-weight:800;color:#b89fa5">${i + 1}</span>
        <span class="avatar sm" style="background:${r.e.avatarColor}">${r.e.name[0]}</span>
        <span style="flex:1;min-width:0"><div style="font-weight:800;font-size:13px">${esc(r.e.name)}</div><div class="muted" style="font-size:11px">${esc(r.e.role)}</div></span>
        <span style="text-align:left"><div class="display" style="font-size:17px;font-weight:800">${r.s}%</div><div style="font-size:10px;color:#6aa278;font-weight:800">${statusOf(r.s)[0]}</div></span>
      </a>`).join('') || emptyBlock('لا توجد بيانات بعد', 'أضيفي أول تقييم لعرض الترتيب')}
    </div>
    <div class="card" style="background:var(--pink-soft)">
      <div class="row" style="margin-bottom:14px"><div style="background:#fff4ee99;border-radius:14px;padding:10px;color:#a65c78">${icon('activity', 19)}</div><div><h3 class="section-title" style="color:#643e51">آخر ما حدث</h3><p style="font-size:11px;color:#986c7b;margin:2px 0 0">نشاط فريق الجودة</p></div></div>
      ${activities.slice(0, 4).map(a => `<div class="row" style="align-items:flex-start;margin-bottom:12px"><div style="width:9px;height:9px;border-radius:99px;background:#e98aaa;margin-top:6px;flex-shrink:0"></div><div><p style="margin:0;font-size:13px;font-weight:800;color:#6d4757">${esc(a.user)} <span style="font-weight:400">${esc(a.action)}</span></p><p style="margin:2px 0 0;font-size:11px;color:#9a6f7f">${esc(a.detail)} · ${fmtDateTime(a.at)}</p></div></div>`).join('')}
      <a href="#/activity" style="font-size:11px;font-weight:800;color:#8a536a">فتح سجل النشاط كاملاً ${icon('chevron', 12)}</a>
      ${flagged.length ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0c3d3"><b style="font-size:12px;color:#673e51">تحتاج متابعة</b>${flagged.map(f => `<div style="font-size:12px;margin-top:6px;color:#8a536a">• ${esc(f.e.name)} — ${f.s}%</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}
function kpiCard(bg, value, label, note) { return `<div class="card" style="background:var(--${bg})"><div class="display" style="font-size:28px;font-weight:800">${value}</div><div style="font-weight:800;font-size:13px;margin-top:4px">${label}</div><div class="muted" style="font-size:11px;margin-top:2px">${note}</div></div>`; }
function emptyBlock(title, detail) { return `<div class="empty"><b>${esc(title)}</b><span>${esc(detail)}</span></div>`; }

/* ============================== التقييمات ============================== */
let evalQuery = '';
function pageEvaluations() {
  const rows = [...evaluations].filter(e => { const emp = employees.find(x => x.id === e.employeeId); return !evalQuery || (emp && emp.name.includes(evalQuery)); }).sort((a, b) => b.date.localeCompare(a.date));
  return `
  <div class="page-header"><div><h2>التقييمات</h2><p>راجعي جودة التفاعلات، أضيفي ملاحظاتك، واحتفظي بسياق كل مكالمة.</p></div>
    <div class="actions"><button class="btn" onclick="openEvalForm()">${icon('plus', 16)} تقييم جديد</button></div>
  </div>
  <div class="row" style="margin-bottom:16px"><input id="eval-search" placeholder="ابحثي عن موظف..." value="${esc(evalQuery)}" style="flex:1;max-width:320px;border:1px solid #eadbd3;background:var(--cream);border-radius:16px;padding:10px 14px;outline:none" /></div>
  <div class="card" style="padding:0;overflow:hidden">
    <div class="eval-row eval-head"><span>الموظف / التاريخ</span><span>الدرجة المركبة</span><span>Quality</span><span>FCR</span><span>CSAT</span><span>الشكاوى</span><span></span></div>
    ${rows.map(e => { const emp = employees.find(x => x.id === e.employeeId); const s = score(e); return `
    <div class="eval-row">
      <div class="eval-emp"><span class="avatar sm" style="background:${emp ? emp.avatarColor : '#ccc'}">${emp ? emp.name[0] : '?'}</span><span><div class="name">${esc(emp ? emp.name : '—')}</div><div class="date">${e.date}</div></span></div>
      <div><span class="display" style="font-size:18px;font-weight:800">${s}%</span><div class="bar ${barClass(s)}" style="width:80px;margin-top:4px"><i style="width:${s}%"></i></div></div>
      <div style="font-weight:700;font-size:13px">${e.quality}%</div><div style="font-weight:700;font-size:13px">${e.fcr}%</div><div style="font-weight:700;font-size:13px">${e.csat}</div><div style="font-weight:700;font-size:13px">${e.complaints}</div>
      <div class="row"><button class="icon-btn" onclick="openEvalForm('${e.id}')">${icon('edit', 15)}</button><button class="icon-btn danger" onclick="deleteEval('${e.id}')">${icon('trash', 15)}</button></div>
      <div class="eval-note">ملاحظة: ${esc(e.note) || 'لا توجد ملاحظة'}</div>
    </div>`; }).join('') || emptyBlock('لا توجد تقييمات', 'جرّبي كلمة بحث مختلفة أو أضيفي تقييماً جديداً')}
  </div>`;
}
function deleteEval(id) { const e = evaluations.find(x => x.id === id); if (!confirm('حذف هذا التقييم؟')) return; const emp = employees.find(x => x.id === e.employeeId); evaluations = evaluations.filter(x => x.id !== id); persist(); addActivity('حذفت تقييماً', `${emp ? emp.name : ''} · ${e.date}`); render(); }
function openEvalForm(id) {
  const initial = id ? evaluations.find(e => e.id === id) : null;
  const activeEmp = employees.filter(e => e.active);
  openModal(`
    <div class="modal-head"><div><h3>${initial ? 'تعديل التقييم' : 'تقييم جديد'}</h3><p>أضيفي تفاصيل المكالمة بدقة ودفء</p></div><button class="icon-btn" onclick="closeModal()">${icon('x', 18)}</button></div>
    <form id="eval-form" class="grid cols-2">
      <label class="field"><span>تاريخ التقييم</span><input type="date" name="date" required value="${initial ? initial.date : new Date().toISOString().slice(0, 10)}" /></label>
      <label class="field"><span>الموظف</span><select name="employeeId" required>${activeEmp.map(e => `<option value="${e.id}" ${initial && initial.employeeId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
      <label class="field"><span>عدد المكالمات</span><input type="number" name="calls" required value="${initial ? initial.calls : 100}" /></label>
      <label class="field"><span>Quality %</span><input type="number" name="quality" required value="${initial ? initial.quality : 90}" /></label>
      <label class="field"><span>FCR %</span><input type="number" name="fcr" required value="${initial ? initial.fcr : 85}" /></label>
      <label class="field"><span>Adherence %</span><input type="number" name="adherence" required value="${initial ? initial.adherence : 90}" /></label>
      <label class="field"><span>CSAT / 5</span><input type="number" step="0.1" name="csat" required value="${initial ? initial.csat : 4.5}" /></label>
      <label class="field"><span>الشكاوى</span><input type="number" name="complaints" required value="${initial ? initial.complaints : 0}" /></label>
      <label class="field" style="grid-column:1/-1"><span>ملاحظة المديرة</span><textarea name="note" rows="3" placeholder="ما الذي لفت انتباهك؟">${initial ? esc(initial.note) : ''}</textarea></label>
      <div class="actions" style="grid-column:1/-1;justify-content:flex-end">
        <button type="button" class="btn ghost" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn">${icon('check', 16)} حفظ التقييم</button>
      </div>
    </form>`);
  document.getElementById('eval-form').onsubmit = ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const data = { date: f.get('date'), employeeId: f.get('employeeId'), calls: +f.get('calls'), quality: +f.get('quality'), fcr: +f.get('fcr'), adherence: +f.get('adherence'), csat: +f.get('csat'), complaints: +f.get('complaints'), note: f.get('note') };
    const emp = employees.find(x => x.id === data.employeeId);
    if (initial) { evaluations = evaluations.map(x => x.id === initial.id ? { ...data, id: initial.id } : x); addActivity('عدّلت تقييماً', emp ? emp.name : ''); }
    else { evaluations = [{ ...data, id: 'v' + Date.now() }, ...evaluations]; addActivity('أضافت تقييماً', emp ? emp.name : ''); }
    persist(); closeModal(); render();
  };
}

/* ============================== إدخال جماعي ============================== */
let bulkDate = new Date().toISOString().slice(0, 10);
let bulkValues = {};
function pageBulk() {
  const active = employees.filter(e => e.active);
  return `
  <div class="page-header"><div><h2>إدخال جماعي</h2><p>أنشئي قياسات يوم واحد للفريق في دقائق، مع الحفاظ على مرونة التعديل لاحقاً.</p></div>
    <div class="actions"><button class="btn" onclick="saveBulk()">${icon('check', 16)} حفظ الكل</button></div>
  </div>
  <label class="field" style="max-width:220px"><span>تاريخ التقييم</span><input type="date" id="bulk-date" value="${bulkDate}" onchange="bulkDate=this.value;render()" /></label>
  <div class="card" style="background:var(--lilac-soft);color:#5d4773;margin-bottom:16px"><div class="row">${icon('bulk', 20)}<div><b>تقييمات ${bulkDate}</b><div style="font-size:12px;opacity:.75">أدخلي درجة Quality الأساسية لكل موظفة، ثم عودي لاحقاً للتفاصيل.</div></div></div></div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px">
    ${active.map((e, i) => { const existing = evaluations.find(v => v.employeeId === e.id && v.date === bulkDate); const val = bulkValues[e.id] ?? (existing ? existing.quality : 90); return `
    <div class="row" style="background:#fcf6ed;border-radius:16px;padding:12px;flex-wrap:wrap">
      <span style="width:20px;font-weight:800;color:#b39ba0">${i + 1}</span>
      <span class="avatar sm" style="background:${e.avatarColor}">${e.name[0]}</span>
      <span style="min-width:140px"><div style="font-weight:800;font-size:13px">${esc(e.name)}</div><div class="muted" style="font-size:11px">${esc(e.role)}</div></span>
      <span style="width:120px"><label style="font-size:11px;font-weight:700;color:#92787f">Quality %</label><input type="number" value="${val}" oninput="bulkValues['${e.id}']=this.value" style="width:100%;margin-top:2px;border:1px solid #e5d6cf;background:var(--cream);border-radius:10px;padding:6px 10px;font-weight:800" /></span>
      <span class="muted" style="font-size:11px">${existing ? 'تم إدخاله مسبقاً — سيُحدّث عند الحفظ' : 'لم يتم إدخال تقييم لهذا اليوم'}</span>
    </div>`; }).join('')}
  </div>`;
}
function saveBulk() {
  const active = employees.filter(e => e.active);
  active.forEach(emp => {
    const old = evaluations.find(v => v.employeeId === emp.id && v.date === bulkDate);
    const data = { date: bulkDate, employeeId: emp.id, calls: old ? old.calls : 120, quality: Number(bulkValues[emp.id] ?? (old ? old.quality : 90)), fcr: old ? old.fcr : 86, adherence: old ? old.adherence : 94, csat: old ? old.csat : 4.5, complaints: old ? old.complaints : 1, note: old ? old.note : 'إدخال جماعي — يحتاج مراجعة التفاصيل.' };
    if (old) evaluations = evaluations.map(x => x.id === old.id ? { ...data, id: old.id } : x); else evaluations = [{ ...data, id: 'v' + Date.now() + emp.id }, ...evaluations];
  });
  persist(); addActivity('حفظ إدخالات جماعية', `${active.length} موظفات · ${bulkDate}`); bulkValues = {}; alert('تم حفظ إدخالات الفريق بنجاح'); render();
}

/* ============================== الموظفون ============================== */
function pageEmployees() {
  return `
  <div class="page-header"><div><h2>الموظفون</h2><p>دليل فريقك في لمحة. تابعي الحالة، المسؤوليات، واتركي مساحة للنمو.</p></div>
    <div class="actions"><button class="btn" onclick="openEmployeeForm()">${icon('plus', 16)} إضافة موظف</button></div>
  </div>
  <div class="row" style="margin-bottom:16px"><span class="badge mint">${employees.filter(e => e.active).length} نشطة</span><span class="badge peach">${employees.filter(e => !e.active).length} متوقفة مؤقتاً</span></div>
  <div class="grid cols-3">
    ${employees.map(e => { const hasEval = evaluations.some(v => v.employeeId === e.id); return `
    <div class="card" style="${e.active ? '' : 'opacity:.65'}">
      <div class="between" style="margin-bottom:16px"><span class="avatar lg" style="background:${e.avatarColor}">${e.name[0]}</span>
        <div class="row"><button class="icon-btn" onclick='openEmployeeForm(${JSON.stringify(e.id)})'>${icon('edit', 15)}</button><button class="icon-btn" onclick="toggleEmployee('${e.id}')">${icon('zap', 15)}</button><button class="icon-btn danger" ${hasEval ? 'disabled title="لا يمكن حذف موظف لديه تقييمات"' : ''} onclick="deleteEmployee('${e.id}')">${icon('trash', 15)}</button></div>
      </div>
      <div style="font-weight:800;font-size:15px">${esc(e.name)}</div>
      <div class="muted" style="font-size:12px;margin-top:2px">${esc(e.role)}</div>
      <div class="between" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><span class="badge ${e.active ? 'mint' : 'peach'}">${e.active ? 'نشطة' : 'متوقفة مؤقتاً'}</span><a href="#/employee-report?employee=${e.id}" style="font-size:11px;font-weight:800;color:#a36982">عرض التقرير ${icon('chevron', 12)}</a></div>
    </div>`; }).join('')}
  </div>`;
}
function toggleEmployee(id) { const e = employees.find(x => x.id === id); employees = employees.map(x => x.id === id ? { ...x, active: !x.active } : x); persist(); addActivity(e.active ? 'أوقفت موظفاً مؤقتاً' : 'فعّلت موظفاً', e.name); render(); }
function deleteEmployee(id) { const e = employees.find(x => x.id === id); if (!confirm(`حذف ${e.name} نهائياً؟`)) return; employees = employees.filter(x => x.id !== id); persist(); addActivity('حذفت موظفاً', e.name); render(); }
function openEmployeeForm(id) {
  const initial = id ? employees.find(e => e.id === id) : null;
  const colors = ['#c3a5ef', '#f59ab6', '#9fd9b6', '#f3c77b', '#9fc5df'];
  openModal(`
    <div class="modal-head"><h3>${initial ? 'تعديل موظف' : 'موظف جديد'}</h3><button class="icon-btn" onclick="closeModal()">${icon('x', 18)}</button></div>
    <form id="emp-form">
      <label class="field"><span>الاسم</span><input name="name" required placeholder="مثال: مها السالم" value="${initial ? esc(initial.name) : ''}" /></label>
      <label class="field"><span>المسمى الوظيفي</span><input name="role" required value="${initial ? esc(initial.role) : 'أخصائية خدمة عملاء'}" /></label>
      <div class="field"><span>لون الصورة</span><div class="row" id="color-pick">${colors.map(c => `<button type="button" data-c="${c}" onclick="pickColor('${c}')" style="width:34px;height:34px;border-radius:10px;background:${c};border:${initial && initial.avatarColor === c || (!initial && c === colors[0]) ? '2px solid #6d5577' : 'none'}"></button>`).join('')}</div></div>
      <input type="hidden" name="avatarColor" value="${initial ? initial.avatarColor : colors[0]}" />
      <div class="actions" style="justify-content:flex-end;margin-top:10px"><button type="button" class="btn ghost" onclick="closeModal()">إلغاء</button><button type="submit" class="btn">${icon('check', 16)} حفظ</button></div>
    </form>`);
  document.getElementById('emp-form').onsubmit = ev => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const data = { name: f.get('name'), role: f.get('role'), avatarColor: f.get('avatarColor'), active: initial ? initial.active : true };
    if (initial) { employees = employees.map(x => x.id === initial.id ? { ...data, id: initial.id } : x); addActivity('عدّلت بيانات موظف', data.name); }
    else { employees = [...employees, { ...data, id: 'e' + Date.now() }]; addActivity('أضافت موظفاً', data.name); }
    persist(); closeModal(); render();
  };
}
function pickColor(c) { document.querySelector('#emp-form [name=avatarColor]').value = c; document.querySelectorAll('#color-pick button').forEach(b => b.style.border = b.dataset.c === c ? '2px solid #6d5577' : 'none'); }

/* ============================== تقرير الموظف ============================== */
function pageEmployeeReport(params) {
  const active = employees.filter(e => e.active);
  if (!active.length) return emptyBlock('لا يوجد موظفون نشطون', 'أضيفي موظفاً أولاً');
  const selected = active.find(e => e.id === params.get('employee')) || active[0];
  const own = evaluations.filter(e => e.employeeId === selected.id);
  const team = avg(evaluations, score), ownScore = avg(own, score);
  const rows = [
    ['Quality', own.length ? Math.round(own.reduce((a, e) => a + e.quality, 0) / own.length) : 0, config.targets.quality],
    ['FCR', own.length ? Math.round(own.reduce((a, e) => a + e.fcr, 0) / own.length) : 0, config.targets.fcr],
    ['Adherence', own.length ? Math.round(own.reduce((a, e) => a + e.adherence, 0) / own.length) : 0, config.targets.adherence],
    ['CSAT', own.length ? Math.round(own.reduce((a, e) => a + e.csat, 0) / own.length * 20) : 0, Math.round(config.targets.csat * 20)],
  ];
  return `
  <div class="page-header"><div><h2>تقرير الموظف</h2><p>صورة واضحة تساعدك على تحويل الأرقام إلى محادثة تدريبية جيدة.</p></div>
    <div class="actions"><button class="btn soft" onclick="window.print()">${icon('printer', 16)} طباعة</button><button class="btn" onclick="exportElementToPdf(document.getElementById('emp-report-area'),'employee-report-${selected.id}.pdf')">${icon('download', 16)} تصدير PDF</button></div>
  </div>
  <div class="row" style="flex-wrap:wrap;margin-bottom:20px">${active.map(e => `<a class="chip ${e.id === selected.id ? 'active' : ''}" href="#/employee-report?employee=${e.id}"><span class="avatar sm" style="width:22px;height:22px;font-size:10px;background:${e.avatarColor}">${e.name[0]}</span>${esc(e.name)}</a>`).join('')}</div>
  <div id="emp-report-area">
    <div class="grid cols-2">
      <div class="card" style="background:var(--lilac)">
        <div class="row"><span class="avatar lg" style="background:${selected.avatarColor}">${selected.name[0]}</span><div><h3 class="display" style="font-size:20px;margin:0;color:#4f3b5c">${esc(selected.name)}</h3><p style="font-size:12px;color:#806988;margin:2px 0 0">${esc(selected.role)}</p></div></div>
        <div style="margin:26px 0 6px" class="row"><span class="display" style="font-size:52px;font-weight:800;color:#503a5d">${ownScore}</span><span style="font-size:18px;font-weight:700;color:#775c7f">%</span></div>
        <div style="font-size:13px;font-weight:800;color:#71587a">الدرجة المركبة</div>
        <div class="row" style="margin-top:12px;font-size:12px;font-weight:800;color:#567761">${icon('trending', 15)} أعلى من متوسط الفريق بـ ${Math.max(0, ownScore - team)} نقاط</div>
      </div>
      <div class="card">
        <div class="between" style="margin-bottom:16px"><h3 class="section-title">مقارنة الأداء</h3><span class="badge mint">آخر التقييمات</span></div>
        ${rows.map(([label, value, target]) => `<div style="margin-bottom:18px"><div class="between" style="font-size:13px;font-weight:700;margin-bottom:6px"><span>${label}</span><span class="muted">${value}% <span style="font-size:11px">/ هدف ${target}%</span></span></div><div class="bar"><i style="width:${Math.min(100, value)}%"></i></div></div>`).join('')}
      </div>
    </div>
    <div class="card" style="background:var(--pink-soft);margin-top:16px">
      <div class="row" style="margin-bottom:16px"><div style="background:#fff4ee99;border-radius:14px;padding:10px;color:#a65c78">${icon('report', 19)}</div><div><h3 class="section-title" style="color:#643e51">ملاحظات التدريب</h3><p style="font-size:11px;color:#986c7b;margin:2px 0 0">مساحة للمحادثات التي تصنع فرقاً</p></div></div>
      <div class="grid cols-2">${own.slice(0, 4).map(e => `<div style="background:#fff7ef99;border-radius:14px;padding:14px"><div style="font-size:11px;font-weight:800;color:#a2697f;margin-bottom:6px">${e.date}</div><p style="font-size:13px;font-weight:700;line-height:1.7;color:#704c5d;margin:0">"${esc(e.note)}"</p></div>`).join('') || emptyBlock('لا توجد ملاحظات بعد', 'ابدئي بتقييم الموظف لإضافة سياق تدريبي')}</div>
    </div>
  </div>`;
}

/* ============================== التقرير الشهري ============================== */
function pageMonthly() {
  const month = evaluations.length ? evaluations[0].date.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const monthEvals = evaluations.filter(e => e.date.startsWith(month));
  const scoreNow = avg(monthEvals.length ? monthEvals : evaluations, score);
  const goals = [
    { label: 'Quality', value: avg(monthEvals, 'quality') || avg(evaluations, 'quality'), target: config.targets.quality, color: '#b69be5' },
    { label: 'FCR', value: avg(monthEvals, 'fcr') || avg(evaluations, 'fcr'), target: config.targets.fcr, color: '#e99ab6' },
    { label: 'Adherence', value: avg(monthEvals, 'adherence') || avg(evaluations, 'adherence'), target: config.targets.adherence, color: '#83c69a' },
    { label: 'CSAT', value: Math.round((avg(monthEvals, 'csat') || avg(evaluations, 'csat')) * 20), target: Math.round(config.targets.csat * 20), color: '#f1bc77' },
  ];
  const calls = evaluations.reduce((a, e) => a + e.calls, 0), complaints = evaluations.reduce((a, e) => a + e.complaints, 0);
  return `
  <div class="page-header"><div><h2>التقرير الشهري الرسمي</h2><p>نسخة رسمية قابلة للمشاركة عن نبض جودة الخدمة.</p></div>
    <div class="actions"><button class="btn soft" onclick="window.print()">${icon('printer', 16)} طباعة</button><button class="btn" onclick="exportElementToPdf(document.getElementById('monthly-report-area'),'monthly-report.pdf')">${icon('download', 16)} تصدير PDF</button></div>
  </div>
  <div class="report-box" id="monthly-report-area">
    <div class="report-head">
      <div><div class="row" style="color:#9c6d84;margin-bottom:8px">${icon('shield', 20)}<span class="display" style="font-size:18px">نظام إدارة الجودة</span></div>
        <h2 class="display" style="font-size:30px;margin:0">التقرير الشهري الرسمي</h2><p class="muted" style="font-size:13px;margin-top:6px">${month} · خدمات ما بعد البيع</p></div>
      <div class="report-score"><div class="num">${scoreNow}%</div><div style="font-size:11px;font-weight:800;color:#7d6690">النتيجة النهائية</div></div>
    </div>
    <div class="grid cols-4" style="margin:26px 0">${goals.map(g => `<div class="goal-card"><div style="font-weight:800;font-size:13px">${g.label}</div><div class="val" style="color:${g.color}">${g.value}%</div><div class="muted" style="font-size:11px">الهدف ${g.target}%</div><div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, g.value)}%;background:${g.color}"></i></div></div>`).join('')}</div>
    <div class="grid cols-2">
      <div><h3 class="section-title" style="margin-bottom:12px">ملخص تنفيذي</h3><p class="card" style="background:var(--mint-soft);font-size:13px;font-weight:700;line-height:1.9;color:#45614f">حافظ الفريق على مسار إيجابي خلال هذه الفترة، مع ${scoreNow >= config.thresholds.excellent ? 'أداء ممتاز يستحق الاحتفال' : scoreNow >= config.thresholds.needs ? 'أداء جيد ومساحة واضحة للتحسين' : 'حاجة فعلية لجلسات دعم مركّزة'}. نوصي بالاستمرار في جلسات الاستماع الأسبوعية.</p></div>
      <div><h3 class="section-title" style="margin-bottom:12px">القدرة التشغيلية</h3><div class="card" style="background:var(--pink-soft);display:flex;flex-direction:column;gap:10px">
        <div class="between" style="font-size:13px"><span>المكالمات المراجعة</span><b>${calls.toLocaleString('ar-SA')}</b></div>
        <div class="between" style="font-size:13px"><span>الفريق النشط</span><b>${employees.filter(e => e.active).length} موظفات</b></div>
        <div class="between" style="font-size:13px"><span>الشكاوى المرصودة</span><b>${complaints}</b></div>
      </div></div>
    </div>
    <div style="margin-top:26px;border-top:1px solid var(--border);padding-top:16px;text-align:center;font-size:11px;font-weight:800;color:#ac9298">أُعدّ بواسطة نظام إدارة الجودة · ${new Date().toLocaleDateString('ar-SA')}</div>
  </div>`;
}

/* ============================== سجل النشاط ============================== */
function pageActivity() {
  return `
  <div class="page-header"><div><h2>سجل النشاط</h2><p>كل تغيير مهم، في مكان واضح يمكن الرجوع إليه.</p></div>
    <div class="actions"><button class="btn soft" onclick='downloadJSON("quality-activity-"+new Date().toISOString().slice(0,10)+".json", activities)'>${icon('download', 16)} تصدير السجل</button></div>
  </div>
  <div class="card">
    <div class="row" style="margin-bottom:20px"><div style="background:var(--mint-soft);border-radius:14px;padding:10px;color:#4c8a68">${icon('zap', 19)}</div><div><h3 class="section-title">الحركات الأخيرة</h3><p class="muted" style="font-size:11px">مسجّلة تلقائياً في متصفحك</p></div></div>
    <div class="timeline">${activities.map(a => `<div class="item"><div class="between" style="flex-wrap:wrap;gap:6px"><div><div style="font-size:13px;font-weight:800">${esc(a.user)} <span style="font-weight:400;color:#816d74">${esc(a.action)}</span></div><div style="margin-top:3px;font-size:13px;color:#8d747c">${esc(a.detail)}</div></div><div class="t">${fmtDateTime(a.at)}</div></div></div>`).join('') || emptyBlock('لا يوجد نشاط بعد', '')}</div>
  </div>`;
}

/* ============================== الإعدادات ============================== */
function pageSettings() {
  ensurePending();
  return `
  <div class="page-header"><div><h2>الإعدادات</h2><p>اضبطي ما تعنيه الجودة لفريقك، واحتفظي بنسخة من إعداداتك.</p></div>
    <div class="actions"><button class="btn" id="save-settings-btn" onclick="saveSettings()">${icon('check', 16)} حفظ التغييرات</button></div>
  </div>
  <div class="grid cols-2">
    <div class="card"><div class="row" style="margin-bottom:16px"><div style="background:var(--lavender);border-radius:14px;padding:10px;color:#73578b">${icon('dashboard', 19)}</div><div><h3 class="section-title">أوزان المؤشرات</h3><p class="muted" style="font-size:11px">كيف تُحسب الدرجة المركبة؟</p></div></div>
      ${sliderRow('weights', 'quality', 'Quality', config.weights.quality, '%', 100)}
      ${sliderRow('weights', 'fcr', 'FCR', config.weights.fcr, '%', 100)}
      ${sliderRow('weights', 'adherence', 'Adherence', config.weights.adherence, '%', 100)}
      ${sliderRow('weights', 'csat', 'CSAT', config.weights.csat, '%', 100)}
    </div>
    <div class="card"><div class="row" style="margin-bottom:16px"><div style="background:var(--lavender);border-radius:14px;padding:10px;color:#73578b">${icon('report', 19)}</div><div><h3 class="section-title">الأهداف الشهرية</h3><p class="muted" style="font-size:11px">المستوى الذي يحتفل به فريقك</p></div></div>
      ${sliderRow('targets', 'quality', 'Quality', config.targets.quality, '%', 100)}
      ${sliderRow('targets', 'fcr', 'FCR', config.targets.fcr, '%', 100)}
      ${sliderRow('targets', 'adherence', 'Adherence', config.targets.adherence, '%', 100)}
      ${sliderRow('targets', 'csat', 'CSAT', config.targets.csat, '/ 5', 5, .1)}
    </div>
    <div class="card"><div class="row" style="margin-bottom:16px"><div style="background:var(--lavender);border-radius:14px;padding:10px;color:#73578b">${icon('shield', 19)}</div><div><h3 class="section-title">حدود التقييم</h3><p class="muted" style="font-size:11px">متى نحتاج إلى احتفال أو جلسة دعم؟</p></div></div>
      ${sliderRow('thresholds', 'excellent', 'ممتاز من', config.thresholds.excellent, '%', 100)}
      ${sliderRow('thresholds', 'needs', 'يحتاج دعماً تحت', config.thresholds.needs, '%', 100)}
    </div>
    <div class="card"><div class="row" style="margin-bottom:16px"><div style="background:var(--lavender);border-radius:14px;padding:10px;color:#73578b">${icon('upload', 19)}</div><div><h3 class="section-title">النسخ والاستيراد</h3><p class="muted" style="font-size:11px">استعيدي بيانات النظام أو احفظيها في ملف مستقل</p></div></div>
      <div class="grid cols-2">
        <button class="btn soft" onclick='downloadJSON("quality-backup-"+new Date().toISOString().slice(0,10)+".json", {employees,evaluations,activities,config}); addActivity("صدّرت نسخة احتياطية","بيانات النظام كاملة")'>${icon('download', 16)} تصدير JSON</button>
        <label class="btn soft" style="cursor:pointer;justify-content:center">${icon('upload', 16)} استيراد JSON<input type="file" accept=".json" class="hidden" onchange="importJSON(this.files[0]);this.value=''" /></label>
        <button class="btn soft" onclick="exportExcel()">${icon('download', 16)} تصدير Excel</button>
        <label class="btn soft" style="cursor:pointer;justify-content:center">${icon('upload', 16)} استيراد Excel<input type="file" accept=".xlsx,.xls" class="hidden" onchange="importExcel(this.files[0]);this.value=''" /></label>
      </div>
      <div class="card" style="background:var(--lavender);margin-top:16px;font-size:11px;font-weight:700;line-height:1.7;color:#685477">تتضمن النسخة الموظفات والتقييمات وسجل النشاط والإعدادات، ويمكن نقلها بين نسخ النظام.</div>
    </div>
  </div>`;
}
function sliderRow(group, key, label, value, suffix, max, step) {
  return `<label class="slider-row"><div class="top"><span>${label}</span><b>${value}${suffix}</b></div><input type="range" min="0" max="${max}" step="${step || 1}" value="${value}" oninput="this.previousElementSibling.querySelector('b').textContent=this.value+'${suffix}';pendingSettings['${group}']['${key}']=Number(this.value)" /></label>`;
}
let pendingSettings = null;
function ensurePending() { if (!pendingSettings) pendingSettings = JSON.parse(JSON.stringify(config)); return pendingSettings; }
function saveSettings() { config = pendingSettings || config; pendingSettings = null; persist(); addActivity('حدّثت الإعدادات', 'الأوزان والأهداف'); const btn = document.getElementById('save-settings-btn'); if (btn) { const old = btn.innerHTML; btn.innerHTML = icon('check', 16) + ' تم الحفظ'; setTimeout(() => render(), 1500); } }
async function importJSON(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.employees) || !Array.isArray(data.evaluations) || !data.config) throw new Error('invalid');
    employees = data.employees; evaluations = data.evaluations; if (Array.isArray(data.activities)) activities = data.activities; config = data.config;
    persist(); addActivity('استوردت نسخة احتياطية', 'تم استعادة بيانات النظام'); alert('تم استيراد النسخة الاحتياطية بنجاح'); render();
  } catch { alert('ملف النسخة الاحتياطية غير صالح'); }
}

/* ============================== النافذة المنبثقة ============================== */
function openModal(html) { closeModal(); const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'modal-overlay'; ov.innerHTML = `<div class="modal">${html}</div>`; ov.addEventListener('click', e => { if (e.target === ov) closeModal(); }); document.body.appendChild(ov); }
function closeModal() { const ov = document.getElementById('modal-overlay'); if (ov) ov.remove(); }

/* ============================== التوجيه والعرض ============================== */
const ROUTES = { '/': { page: pageDashboard, title: 'نظرة عامة' }, '/evaluations': { page: pageEvaluations, title: 'التقييمات' }, '/bulk-entry': { page: pageBulk, title: 'إدخال جماعي' }, '/employees': { page: pageEmployees, title: 'الموظفون' }, '/employee-report': { page: pageEmployeeReport, title: 'تقرير الموظف' }, '/monthly-report': { page: pageMonthly, title: 'التقرير الشهري' }, '/activity': { page: pageActivity, title: 'سجل النشاط' }, '/settings': { page: pageSettings, title: 'الإعدادات' } };
function render() {
  const { path, params } = parseHash();
  const route = ROUTES[path] || ROUTES['/'];
  if (path === '/settings') pendingSettings = null;
  const html = route.page.length ? route.page(params) : route.page();
  document.getElementById('app').innerHTML = shell(html, route.title);
  document.querySelectorAll('.nav-link').forEach(a => a.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open')));
  const search = document.getElementById('eval-search');
  if (search) { search.oninput = e => { evalQuery = e.target.value; render(); setTimeout(() => { const s = document.getElementById('eval-search'); if (s) { s.focus(); s.selectionStart = s.selectionEnd = s.value.length; } }, 0); }; }
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);
