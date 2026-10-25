/* কোণ ও দিক রূপান্তর — DMS ↔ দশমিক ডিগ্রি, অ্যাজিমুথ (WCB) ↔ কোয়াড্র্যান্ট বেয়ারিং।
   স্বাধীন ক্যালকুলেটর: অন্য কোনো ক্যালকুলেটরের ডেটা বা সূত্র ব্যবহার/পরিবর্তন করে না।
   সব কোণ-হিসাব পূর্ণসংখ্যা (সেকেন্ডের ভগ্নাংশ-একক) গাণিতিক পদ্ধতিতে করা হয়, যাতে
   ফ্লোটিং-পয়েন্ট ত্রুটি, ৬০″→১′ ক্যারি এবং চতুর্থাংশ-সীমা (০°, ৯০°, ১৮০°, ২৭০°) নির্ভুল থাকে। */
(() => {
  'use strict';

  const MAX_DEG = 3600;               // নিরাপদ সর্বোচ্চ ইনপুট (ডিগ্রি)
  const SEC_PER_DEG = 3600;
  const FULL_SEC = 360 * SEC_PER_DEG; // ১,২৯৬,০০০ আর্ক-সেকেন্ড
  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

  /* ---------- ইনপুট পার্সিং ---------- */
  const normalize = s => String(s ?? '')
    .trim()
    .replace(/[০-৯]/g, c => String(BN_DIGITS.indexOf(c)))
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '');

  // {empty:true} | {error:'neg'|'bad'} | {value:Number}
  function parseNum(raw, signed) {
    const s = normalize(raw);
    if (s === '') return { empty: true };
    if (!signed && /^-/.test(s)) return { error: 'neg' };
    const re = signed ? /^[+-]?(\d+\.?\d*|\.\d+)$/ : /^\+?(\d+\.?\d*|\.\d+)$/;
    if (!re.test(s)) return { error: 'bad' };
    const v = Number(s);
    return Number.isFinite(v) ? { value: v } : { error: 'bad' };
  }

  // ডিগ্রি/মিনিট/সেকেন্ড (অ-ঋণাত্মক) → মোট আর্ক-সেকেন্ড
  function dmsToSeconds(dRaw, mRaw, sRaw, label) {
    const parts = [['ডিগ্রি', dRaw], ['মিনিট', mRaw], ['সেকেন্ড', sRaw]].map(([name, raw]) => ({ name, r: parseNum(raw, false) }));
    for (const p of parts) {
      if (p.r.error === 'neg') return { ok: false, msg: `${label}: ${p.name} ঋণাত্মক হতে পারবে না (ঋণাত্মক কোণের জন্য চিহ্ন নির্বাচন করুন)।` };
      if (p.r.error) return { ok: false, msg: `${label}: ${p.name} ঘরে শুধু সংখ্যা দিন।` };
    }
    if (parts.every(p => p.r.empty)) return { ok: false, msg: `${label}: ডিগ্রি, মিনিট বা সেকেন্ডের অন্তত একটি ঘরে মান দিন।` };
    const [d, m, s] = parts.map(p => (p.r.empty ? 0 : p.r.value));
    if (m >= 60) return { ok: false, msg: `${label}: মিনিট ০ থেকে ৫৯.৯৯৯… এর মধ্যে হতে হবে (৬০ বা বেশি হতে পারবে না)।` };
    if (s >= 60) return { ok: false, msg: `${label}: সেকেন্ড ০ থেকে ৫৯.৯৯৯… এর মধ্যে হতে হবে (৬০ বা বেশি হতে পারবে না)।` };
    if ((m !== 0 || s !== 0) && !Number.isInteger(d)) return { ok: false, msg: `${label}: মিনিট/সেকেন্ড দিলে ডিগ্রি অবশ্যই পূর্ণসংখ্যা হতে হবে।` };
    if (s !== 0 && !Number.isInteger(m)) return { ok: false, msg: `${label}: সেকেন্ড দিলে মিনিট অবশ্যই পূর্ণসংখ্যা হতে হবে।` };
    const sec = d * SEC_PER_DEG + m * 60 + s;
    if (sec > MAX_DEG * SEC_PER_DEG) return { ok: false, msg: `${label}: মান ${MAX_DEG}° এর বেশি হতে পারবে না।` };
    return { ok: true, sec, d, m, s };
  }

  /* ---------- রাউন্ডিং ও ফরম্যাট ---------- */
  // sec (আর্ক-সেকেন্ড) → পূর্ণসংখ্যা, একক = 10^-p সেকেন্ড। ফ্লোটিং নয়েজ (…4999999) দূর করা হয়।
  const scaled = (sec, p) => Math.round(Number((sec * Math.pow(10, p)).toPrecision(14)));

  // পূর্ণসংখ্যা-স্কেলড মান → "D° MM′ SS.ss″"
  function fmtDMS(S, p) {
    const unit = Math.pow(10, p);
    const degUnit = SEC_PER_DEG * unit;
    const deg = Math.floor(S / degUnit);
    let rem = S - deg * degUnit;
    const min = Math.floor(rem / (60 * unit));
    rem -= min * 60 * unit;
    const secVal = rem / unit;
    const ss = (p ? secVal.toFixed(p) : String(Math.round(secVal))).padStart(p ? 3 + p : 2, '0');
    return `${deg}° ${String(min).padStart(2, '0')}′ ${ss}″`;
  }

  function trimNum(x, digits) {
    let s = x.toFixed(digits);
    if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
    if (s === '' || s === '-' || s === '-0') s = '0';
    return s;
  }
  const fmtDeg = x => trimNum(x, 8) + '°';

  /* ---------- দিক-নির্ণয় (সব হিসাব পূর্ণসংখ্যায়) ---------- */
  // Tn: উত্তর থেকে ঘড়ির কাঁটার দিকে অ্যাজিমুথ, স্কেলড পূর্ণসংখ্যা, 0 ≤ Tn < full
  function quadFromAzimuth(Tn, unit) {
    const q = 90 * SEC_PER_DEG * unit;
    if (Tn === 0) return { due: 'N' };
    if (Tn === q) return { due: 'E' };
    if (Tn === 2 * q) return { due: 'S' };
    if (Tn === 3 * q) return { due: 'W' };
    if (Tn < q) return { ns: 'N', ew: 'E', a: Tn, quad: 'NE (0°–90°)' };
    if (Tn < 2 * q) return { ns: 'S', ew: 'E', a: 2 * q - Tn, quad: 'SE (90°–180°)' };
    if (Tn < 3 * q) return { ns: 'S', ew: 'W', a: Tn - 2 * q, quad: 'SW (180°–270°)' };
    return { ns: 'N', ew: 'W', a: 4 * q - Tn, quad: 'NW (270°–360°)' };
  }

  // কোয়াড্র্যান্ট বেয়ারিং (ns, a, ew) → উত্তর-ভিত্তিক অ্যাজিমুথ (স্কেলড)
  function azimuthFromQuad(ns, a, ew, unit) {
    const q = 90 * SEC_PER_DEG * unit;
    const full = 4 * q;
    let T;
    if (ns === 'N' && ew === 'E') T = a;
    else if (ns === 'S' && ew === 'E') T = 2 * q - a;
    else if (ns === 'S' && ew === 'W') T = 2 * q + a;
    else T = 4 * q - a;           // N … W
    return ((T % full) + full) % full;
  }

  const DUE_BN = { N: 'ঠিক উত্তর (N)', E: 'ঠিক পূর্ব (E)', S: 'ঠিক দক্ষিণ (S)', W: 'ঠিক পশ্চিম (W)' };
  const NS_BN = { N: 'উত্তর', S: 'দক্ষিণ' };
  const EW_BN = { E: 'পূর্বে', W: 'পশ্চিমে' };

  const quadText = (r, p) => (r.due ? DUE_BN[r.due] : `${r.ns} ${fmtDMS(r.a, p)} ${r.ew}`);
  const quadWords = (r, p) => (r.due
    ? `দিক: ${DUE_BN[r.due]} — কোনো পূর্ব/পশ্চিম বা উত্তর/দক্ষিণ বিচ্যুতি নেই`
    : `${NS_BN[r.ns]} দিক থেকে ${fmtDMS(r.a, p)} ${EW_BN[r.ew]}`);

  /* ---------- জনসাধারণের API (পরীক্ষা/পুনর্ব্যবহারের জন্য) ---------- */
  const api = {
    parseNum, dmsToSeconds, scaled, fmtDMS, fmtDeg, trimNum,
    quadFromAzimuth, azimuthFromQuad, quadText, quadWords, FULL_SEC, MAX_DEG
  };
  try { (typeof window !== 'undefined' ? window : globalThis).SAHAngleConvert = api; } catch (e) { /* noop */ }
  if (typeof document === 'undefined') return;

  /* ---------- UI ---------- */
  const $ = id => document.getElementById(id);
  const panel = $('panel-angle-convert');
  if (!panel) return;

  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const resultEl = $('acResult');
  const modeEl = $('acMode');
  const precEl = $('acPrecision');

  const item = (strong, span, primary) =>
    `<div class="result-item${primary ? ' result-item-primary' : ''}"><strong>${esc(strong)}</strong><span>${esc(span)}</span></div>`;
  const warn = msg => `<div class="warning">${esc(msg)}</div>`;
  const list = items => `<div class="result-list">${items.join('')}</div>`;
  const mainLine = text => `<div class="result-main">${esc(text)}</div>`;
  const precisionNote = p => `<p class="conversion-note">সেকেন্ড ${p === 0 ? 'পূর্ণসংখ্যা পর্যন্ত' : `দশমিকের পর ${p} ঘর পর্যন্ত`} রাউন্ড করে দেখানো হয়েছে। ১° = ৬০′ = ৩৬০০″।</p>`;

  const getP = () => {
    const v = Number(precEl.value);
    return Number.isInteger(v) && v >= 0 && v <= 4 ? v : 2;
  };

  function otherUnits(ddAbs, sign) {
    const sg = sign < 0 && ddAbs !== 0 ? '−' : '';
    const rad = ddAbs * Math.PI / 180;
    const gon = ddAbs * 10 / 9;
    return [
      item(`${sg}${trimNum(rad, 8)} rad`, 'রেডিয়ান', false),
      item(`${sg}${trimNum(gon, 8)} gon`, 'গ্রেড / গন (১ সমকোণ = ১০০ গন)', false)
    ];
  }

  // মোড ১: DMS → দশমিক ডিগ্রি
  function modeDmsToDd() {
    const r = dmsToSeconds($('acA_d').value, $('acA_m').value, $('acA_s').value, 'ইনপুট কোণ');
    if (!r.ok) return warn(r.msg);
    const neg = $('acA_sign').value === '-' && r.sec !== 0;
    const dd = r.sec / SEC_PER_DEG;
    const sgn = neg ? '−' : '';
    const breakdown = `${r.d}° + ${trimNum(r.m, 6)}′/60 + ${trimNum(r.s, 6)}″/3600`;
    return mainLine(`${sgn}${trimNum(dd, 8)}°`) +
      list([
        item(`${sgn}${trimNum(dd, 8)}°`, 'দশমিক ডিগ্রি', true),
        item(`${sgn}${trimNum(r.d, 8)}° ${trimNum(r.m, 8)}′ ${trimNum(r.s, 8)}″`, 'ইনপুট (ডিগ্রি–মিনিট–সেকেন্ড)', false),
        item(breakdown, 'গণনা: ডিগ্রি + মিনিট/৬০ + সেকেন্ড/৩৬০০', false),
        ...otherUnits(dd, neg ? -1 : 1)
      ]) +
      '<p class="conversion-note">দশমিক ডিগ্রি ৮ দশমিক স্থান পর্যন্ত দেখানো হয়েছে। ১° = ৬০′ = ৩৬০০″।</p>';
  }

  // মোড ২: দশমিক ডিগ্রি → DMS
  function modeDdToDms() {
    const p = getP();
    const r = parseNum($('acB_dd').value, true);
    if (r.empty) return warn('দশমিক ডিগ্রির মান দিন।');
    if (r.error) return warn('দশমিক ডিগ্রি ঘরে শুধু সংখ্যা দিন (যেমন 45.5083333 বা -12.75)।');
    if (Math.abs(r.value) > MAX_DEG) return warn(`মান ${MAX_DEG}° এর বেশি হতে পারবে না।`);
    const S = scaled(Math.abs(r.value) * SEC_PER_DEG, p);
    const neg = r.value < 0 && S !== 0;
    const sgn = neg ? '−' : '';
    return mainLine(`${sgn}${fmtDMS(S, p)}`) +
      list([
        item(`${sgn}${fmtDMS(S, p)}`, 'ডিগ্রি–মিনিট–সেকেন্ড (DMS)', true),
        item(`${neg ? '−' : ''}${trimNum(Math.abs(r.value), 8)}°`, 'ইনপুট দশমিক ডিগ্রি', false),
        ...otherUnits(Math.abs(r.value), neg ? -1 : 1)
      ]) + precisionNote(p);
  }

  // মোড ৩/৪ এর সাধারণ রিপোর্ট
  function directionReport(Tn, p, focus) {
    const unit = Math.pow(10, p);
    const full = FULL_SEC * unit;
    const half = full / 2;
    const q = quadFromAzimuth(Tn, unit);
    const Ts = (Tn + half) % full;               // দক্ষিণ-ভিত্তিক অ্যাজিমুথ = উত্তর-ভিত্তিক + ১৮০°
    const qBack = quadFromAzimuth(Ts, unit);     // বিপরীত বেয়ারিং (Back bearing)
    const ddOf = S => S / (SEC_PER_DEG * unit);
    const items = [
      item(quadText(q, p), 'কোয়াড্র্যান্ট (ফোর) বেয়ারিং — Reduced Bearing', focus === 'quad'),
      item(`${fmtDMS(Tn, p)} = ${fmtDeg(ddOf(Tn))}`, 'অ্যাজিমুথ / পূর্ণবৃত্ত বেয়ারিং (WCB) — উত্তর থেকে ঘড়ির কাঁটার দিকে', focus === 'az'),
      item(`${fmtDMS(Ts, p)} = ${fmtDeg(ddOf(Ts))}`, 'দক্ষিণ থেকে মাপা অ্যাজিমুথ (বিপরীত/Back WCB-এরও একই মান)', false),
      item(quadText(qBack, p), 'বিপরীত বেয়ারিং (Back Bearing) — কোয়াড্র্যান্ট রূপে', false)
    ];
    if (!q.due) {
      items.push(item(`${fmtDMS(q.a, p)} = ${fmtDeg(ddOf(q.a))}`, 'বেয়ারিং কোণ (০°–৯০°)', false));
      items.push(item(q.quad, 'চতুর্থাংশ', false));
    }
    const main = focus === 'quad' ? quadText(q, p) : `${fmtDMS(Tn, p)} = ${fmtDeg(ddOf(Tn))}`;
    return mainLine(main) + `<p class="conversion-note">${esc(quadWords(q, p))}</p>` + list(items) + precisionNote(p);
  }

  // মোড ৩: অ্যাজিমুথ → কোয়াড্র্যান্ট বেয়ারিং
  function modeAzToQuad() {
    const p = getP();
    const unit = Math.pow(10, p);
    const full = FULL_SEC * unit;
    const r = dmsToSeconds($('acC_d').value, $('acC_m').value, $('acC_s').value, 'অ্যাজিমুথ');
    if (!r.ok) return warn(r.msg);
    let T = scaled(r.sec, p);
    if (T > full) return warn('অ্যাজিমুথ ০° থেকে ৩৬০° এর মধ্যে হতে হবে।');
    let note = '';
    if (T === full) { T = 0; note = '৩৬০° ও ০° একই দিক — ০° ধরে হিসাব করা হয়েছে।'; }
    if ($('acC_ref').value === 'south') T = (T + full / 2) % full;   // দক্ষিণ-ভিত্তিক → উত্তর-ভিত্তিক
    return directionReport(T, p, 'quad') + (note ? `<p class="conversion-note">${esc(note)}</p>` : '');
  }

  // মোড ৪: কোয়াড্র্যান্ট বেয়ারিং → অ্যাজিমুথ
  function modeQuadToAz() {
    const p = getP();
    const unit = Math.pow(10, p);
    const r = dmsToSeconds($('acD_d').value, $('acD_m').value, $('acD_s').value, 'বেয়ারিং কোণ');
    if (!r.ok) return warn(r.msg);
    const a = scaled(r.sec, p);
    if (a > 90 * SEC_PER_DEG * unit) return warn('কোয়াড্র্যান্ট বেয়ারিং-এর কোণ ০° থেকে ৯০° এর মধ্যে হতে হবে (যেমন N 45° E)।');
    const T = azimuthFromQuad($('acD_ns').value, a, $('acD_ew').value, unit);
    return directionReport(T, p, 'az');
  }

  /* ---------- মোড/ভিউ নিয়ন্ত্রণ ---------- */
  const MODES = {
    dms2dd: { group: 'acGrpA', run: modeDmsToDd, hint: 'দশমিক ডিগ্রি = ডিগ্রি + মিনিট ÷ ৬০ + সেকেন্ড ÷ ৩৬০০' },
    dd2dms: { group: 'acGrpB', run: modeDdToDms, hint: 'ডিগ্রি = পূর্ণ অংশ; মিনিট = (ভগ্নাংশ × ৬০) এর পূর্ণ অংশ; সেকেন্ড = অবশিষ্ট × ৬০' },
    az2quad: { group: 'acGrpC', run: modeAzToQuad, hint: '০°–৯০° → N θ E | ৯০°–১৮০° → S (১৮০°−θ) E | ১৮০°–২৭০° → S (θ−১৮০°) W | ২৭০°–৩৬০° → N (৩৬০°−θ) W' },
    quad2az: { group: 'acGrpD', run: modeQuadToAz, hint: 'N θ E → θ | S θ E → ১৮০°−θ | S θ W → ১৮০°+θ | N θ W → ৩৬০°−θ' }
  };

  function showMode() {
    const cur = MODES[modeEl.value] || MODES.dms2dd;
    Object.values(MODES).forEach(m => { const g = $(m.group); if (g) g.hidden = m.group !== cur.group; });
    $('acHint').textContent = cur.hint;
    resultEl.innerHTML = '';
  }

  function run() {
    const cur = MODES[modeEl.value] || MODES.dms2dd;
    resultEl.innerHTML = cur.run();
  }

  function clearAll() {
    panel.querySelectorAll('input').forEach(i => { i.value = ''; });
    $('acA_sign').value = '+';
    $('acC_ref').value = 'north';
    $('acD_ns').value = 'N';
    $('acD_ew').value = 'E';
    resultEl.innerHTML = '';
  }

  modeEl.addEventListener('change', showMode);
  $('acRun').addEventListener('click', run);
  $('acClear').addEventListener('click', clearAll);
  precEl.addEventListener('change', () => { if (resultEl.innerHTML) run(); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') { e.preventDefault(); run(); }
  });
  showMode();
})();
