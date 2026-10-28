/* Notarquiz – Lern-App für Notarassessoren
   Eine Datei, kein Framework. Reihenfolge: Daten → Lernlogik → Sync → Ansichten → Start. */
'use strict';

/* ========== Konfiguration ========== */
const VERSION = '1.1.0';
const LS_KEY = 'notarquiz_v1';
const FIREBASE_KONFIG = {
  apiKey: "AIzaSyDEHNm4XPxgA52EzHaPLxjWS_I-7W2uaOg",
  authDomain: "mikas-fussballquiz.firebaseapp.com",
  projectId: "mikas-fussballquiz",
  storageBucket: "mikas-fussballquiz.firebasestorage.app",
  messagingSenderId: "608975822915",
  appId: "1:608975822915:web:3c980f4714ce223e06f4f6"
};
const SAMMLUNG = 'notarquiz';
const WISSEN_URL = 'https://app.notarius.legal/#/tenant/wissen/';
const INTERVALLE = [0, 1, 3, 7, 16, 35];           // Tage je Leitner-Box 0–5
const XP_GRAD = { 1: 10, 2: 15, 3: 20 };
const LEVEL = [
  [0, 'Kandidat'], [200, 'Notarassessor'], [500, 'Notarvertreter'], [1000, 'Notar'],
  [1800, 'Notar mit Erfahrung'], [3000, 'Amtsprüfer'], [4800, 'Dozent im Assessorenkurs'],
  [7200, 'Kammervorstand'], [10500, 'Kammerpräsident'], [15000, 'Ehrenpräsident']
];
const ABZEICHEN = [
  { id: 'start', name: 'Erste Sitzung', text: 'Eine Lernrunde abgeschlossen', test: s => s.sitzungen >= 1 },
  { id: 'f100', name: '100 Fragen', text: '100 Fragen beantwortet', test: s => s.beantwortet >= 100 },
  { id: 'f500', name: '500 Fragen', text: '500 Fragen beantwortet', test: s => s.beantwortet >= 500 },
  { id: 'f1000', name: '1.000 Fragen', text: '1.000 Fragen beantwortet', test: s => s.beantwortet >= 1000 },
  { id: 's7', name: 'Eine Woche', text: '7 Tage in Folge gelernt', test: s => s.streakBest >= 7 },
  { id: 's30', name: 'Ein Monat', text: '30 Tage in Folge gelernt', test: s => s.streakBest >= 30 },
  { id: 's100', name: 'Hundert Tage', text: '100 Tage in Folge gelernt', test: s => s.streakBest >= 100 },
  { id: 'rein', name: 'Fehlerfrei', text: 'Runde mit 10+ Fragen ohne Fehler', test: s => s.fehlerfreiRunde },
  { id: 'blitz', name: 'Blitzmerker', text: '20 richtige in einer Blitzrunde', test: s => s.blitzBest >= 20 },
  { id: 'meister1', name: 'Gebietsmeister', text: 'Ein Rechtsgebiet zu 80 % beherrscht', test: s => s.gemeistert >= 1 },
  { id: 'meister5', name: 'Fünf Gebiete', text: 'Fünf Rechtsgebiete zu 80 % beherrscht', test: s => s.gemeistert >= 5 },
  { id: 'alle', name: 'Vollständig', text: 'Alle Rechtsgebiete zu 80 % beherrscht', test: s => s.gemeistert >= s.gebieteGesamt && s.gebieteGesamt > 0 },
  { id: 'fall10', name: 'Fallpraktiker', text: '10 Fälle vollständig richtig gelöst', test: s => s.faelleRichtig >= 10 },
  { id: 'sanierer', name: 'Sanierer', text: '50 ehemals falsche Fragen wieder sicher', test: s => s.saniert >= 50 }
];
const ZIELE = [10, 15, 20, 30, 50];

/* ========== Zustand ========== */
let FRAGEN = [];                // alle Fragen
let KAPITEL = [];               // [{slug,titel,anzahl}]
let KAP = {};                   // slug -> titel
let P = null;                   // Fortschritt
let ansicht = 'home';
let sitzung = null;             // laufende Runde
let db = null, cloudDoc = null, syncTimer = null, syncStatus = 'aus';

function heute() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function tagPlus(datum, n) { const d = new Date(datum + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function tageDiff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
function mische(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(n) { return Number(n || 0).toLocaleString('de-DE'); }

function leererFortschritt() {
  return { v: 1, fragen: {}, xp: 0, tage: {}, abz: {}, einst: { ziel: 10, theme: 'system', code: '' }, zaehler: { sitzungen: 0, faelleRichtig: 0, blitzBest: 0, fehlerfreiRunde: false, saniert: 0 }, aktualisiert: 0 };
}
function ladeLokal() {
  try { const r = localStorage.getItem(LS_KEY); if (r) { const p = JSON.parse(r); return Object.assign(leererFortschritt(), p, { einst: Object.assign({ ziel: 10, theme: 'system', code: '' }, p.einst || {}), zaehler: Object.assign({ sitzungen: 0, faelleRichtig: 0, blitzBest: 0, fehlerfreiRunde: false, saniert: 0 }, p.zaehler || {}) }); } } catch (e) { }
  return leererFortschritt();
}
function speichere() {
  P.aktualisiert = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) { }
  cloudSpaeter();
}

/* ========== Lernlogik ========== */
function eintrag(id) { return P.fragen[id] || { b: 0, d: '', n: 0, f: 0, l: 0 }; }
function istFaellig(id, tag) { const e = P.fragen[id]; return !!e && e.n > 0 && e.d <= tag; }
function istNeu(id) { const e = P.fragen[id]; return !e || e.n === 0; }

function verbuche(q, richtig, sicher) {
  const tag = heute();
  const e = Object.assign({ b: 0, d: '', n: 0, f: 0, l: 0 }, P.fragen[q.id] || {});
  e.n++; e.l = Date.now();
  let xp = 0;
  if (richtig) {
    if (sicher) {
      if (e.f > 0 && e.b < 3 && e.b + 1 >= 3) P.zaehler.saniert++;
      e.b = Math.min(5, e.b + 1);
      xp = XP_GRAD[q.schwierigkeit] || 12;
    } else {
      e.b = Math.max(1, Math.min(e.b, 2));
      xp = Math.round((XP_GRAD[q.schwierigkeit] || 12) * 0.6);
    }
    e.u = sicher ? 0 : 1;
  } else {
    e.f++; e.b = 0; e.u = 1;
  }
  e.d = tagPlus(tag, INTERVALLE[e.b]);
  P.fragen[q.id] = e;
  P.xp += xp;
  const t = P.tage[tag] || { n: 0, r: 0 };
  t.n++; if (richtig) t.r++;
  P.tage[tag] = t;
  return xp;
}

function streakBerechnen() {
  const tage = Object.keys(P.tage).filter(k => P.tage[k].n > 0).sort();
  if (!tage.length) return { aktuell: 0, best: 0 };
  let best = 1, lauf = 1, dispensAm = null;
  for (let i = 1; i < tage.length; i++) {
    const d = tageDiff(tage[i - 1], tage[i]);
    if (d === 1) lauf++;
    else if (d === 2 && lauf >= 5 && (!dispensAm || tageDiff(dispensAm, tage[i]) > 14)) { lauf++; dispensAm = tage[i]; }
    else lauf = 1;
    best = Math.max(best, lauf);
  }
  const letzter = tage[tage.length - 1], h = heute();
  const abstand = tageDiff(letzter, h);
  const dispensFrei = lauf >= 5 && (!dispensAm || tageDiff(dispensAm, h) > 14);
  const aktuell = abstand <= 1 ? lauf : (abstand === 2 && dispensFrei) ? lauf : 0;
  return { aktuell, best, dispensFrei, gefaehrdet: abstand === 2 && dispensFrei };
}
function levelInfo(xp = P.xp) {
  let i = 0; while (i + 1 < LEVEL.length && xp >= LEVEL[i + 1][0]) i++;
  const von = LEVEL[i][0], bis = i + 1 < LEVEL.length ? LEVEL[i + 1][0] : null;
  return { stufe: i + 1, titel: LEVEL[i][1], von, bis, anteil: bis ? (xp - von) / (bis - von) : 1 };
}
function gebietStand(slug) {
  const qs = FRAGEN.filter(q => q.kapitel === slug);
  if (!qs.length) return { prozent: 0, gesehen: 0, gesamt: 0, faellig: 0, schwach: 0 };
  let summe = 0, gesehen = 0, faellig = 0, schwach = 0; const tag = heute();
  qs.forEach(q => { const e = P.fragen[q.id]; if (e && e.n > 0) { gesehen++; summe += e.b / 5; if (e.d <= tag) faellig++; if (e.f > 0 && e.b < 3) schwach++; } });
  return { prozent: Math.round(summe / qs.length * 100), gesehen, gesamt: qs.length, faellig, schwach };
}
function statistikZusammen() {
  let beantwortet = 0, richtig = 0; Object.values(P.tage).forEach(t => { beantwortet += t.n; richtig += t.r; });
  const st = streakBerechnen();
  const gemeistert = KAPITEL.filter(k => gebietStand(k.slug).prozent >= 80).length;
  return Object.assign({ beantwortet, richtig, streak: st.aktuell, streakBest: st.best, gemeistert, gebieteGesamt: KAPITEL.length }, P.zaehler);
}
function abzeichenPruefen() {
  const s = statistikZusammen(); const neu = [];
  ABZEICHEN.forEach(a => { if (!P.abz[a.id] && a.test(s)) { P.abz[a.id] = Date.now(); neu.push(a); } });
  return neu;
}

/* ========== Frage des Tages ========== */
function frageDesTages() {
  const pool = FRAGEN.filter(q => q.typ === 'mc' || q.typ === 'rf'); if (!pool.length) return null;
  let h = 0; for (const c of heute()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
function tagesfrageErledigt() { return (P.tagesfrage || {}).datum === heute(); }

/* ========== Runden zusammenstellen ========== */
function faelligeIds() { const tag = heute(); return FRAGEN.filter(q => istFaellig(q.id, tag)).sort((a, b) => (P.fragen[a.id].d < P.fragen[b.id].d ? -1 : 1)); }
function neueFragen(filter) { return mische(FRAGEN.filter(q => istNeu(q.id) && (!filter || filter(q)))); }
function schwachstellen() { return FRAGEN.filter(q => { const e = P.fragen[q.id]; return e && e.f > 0 && e.b < 3; }).sort((a, b) => (P.fragen[b.id].f - P.fragen[b.id].b) - (P.fragen[a.id].f - P.fragen[a.id].b)); }

const WDH_MAX = 5;
function themaHeute() {
  const t = P.thema; const tag = heute();
  if (t && t.datum === tag && KAPITEL.some(k => k.slug === t.slug)) return t.slug;
  const kand = KAPITEL.map(k => ({ k, s: gebietStand(k.slug) })).filter(x => x.s.gesamt >= 5);
  kand.sort((a, b) => a.s.prozent - b.s.prozent || a.k.slug.localeCompare(b.k.slug));
  const slug = (kand[0] || { k: KAPITEL[0] }).k.slug;
  P.thema = { datum: tag, slug }; speichere();
  return slug;
}
function rundeTagesziel(n, slug) {
  const tag = heute();
  const pool = FRAGEN.filter(q => q.typ !== 'fall' && q.kapitel === slug);
  const thema = mische(pool.filter(q => istNeu(q.id))).concat(mische(pool.filter(q => !istNeu(q.id) && !istFaellig(q.id, tag)))).slice(0, n);
  const wdh = faelligeIds().filter(q => q.typ !== 'fall' && !thema.includes(q)).slice(0, WDH_MAX);
  return { thema: mische(thema), wdh };
}
function rundeZufall(n, filter) {
  const pool = FRAGEN.filter(q => q.typ !== 'fall' && (!filter || filter(q)));
  const tag = heute();
  const prio = pool.filter(q => istFaellig(q.id, tag) || istNeu(q.id));
  let liste = mische(prio).slice(0, n);
  if (liste.length < n) liste = liste.concat(mische(pool.filter(q => !liste.includes(q))).slice(0, n - liste.length));
  return mische(liste);
}

/* ========== Cloud-Sync (Firestore, Sync-Code) ========== */
async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('notarquiz:' + text.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function cloudInit() {
  try { if (typeof firebase === 'undefined') return false; if (!firebase.apps.length) firebase.initializeApp(FIREBASE_KONFIG); db = firebase.firestore(); return true; } catch (e) { return false; }
}
async function cloudVerbinden(code) {
  cloudDoc = null; syncStatus = 'aus';
  if (!code || !db) return;
  try { cloudDoc = db.collection(SAMMLUNG).doc(await hash(code)); syncStatus = 'verbinde'; await cloudAbgleich(); } catch (e) { syncStatus = 'fehler'; }
}
function verschmelze(a, b) {
  const r = leererFortschritt();
  r.einst = Object.assign({}, a.einst, { ziel: a.einst.ziel, theme: a.einst.theme, code: a.einst.code });
  const ids = new Set([...Object.keys(a.fragen), ...Object.keys(b.fragen)]);
  ids.forEach(id => { const x = a.fragen[id], y = b.fragen[id]; r.fragen[id] = !x ? y : !y ? x : (y.l > x.l ? y : x); });
  const tage = new Set([...Object.keys(a.tage), ...Object.keys(b.tage)]);
  tage.forEach(t => { const x = a.tage[t] || { n: 0, r: 0 }, y = b.tage[t] || { n: 0, r: 0 }; r.tage[t] = { n: Math.max(x.n, y.n), r: Math.max(x.r, y.r) }; });
  r.xp = Math.max(a.xp || 0, b.xp || 0);
  r.abz = Object.assign({}, b.abz, a.abz);
  const za = a.zaehler || {}, zb = b.zaehler || {};
  r.zaehler = { sitzungen: Math.max(za.sitzungen || 0, zb.sitzungen || 0), faelleRichtig: Math.max(za.faelleRichtig || 0, zb.faelleRichtig || 0), blitzBest: Math.max(za.blitzBest || 0, zb.blitzBest || 0), fehlerfreiRunde: !!(za.fehlerfreiRunde || zb.fehlerfreiRunde), saniert: Math.max(za.saniert || 0, zb.saniert || 0) };
  r.thema = a.thema || b.thema;
  r.aktualisiert = Math.max(a.aktualisiert || 0, b.aktualisiert || 0);
  return r;
}
async function cloudAbgleich() {
  if (!cloudDoc) return;
  try {
    const snap = await cloudDoc.get();
    if (snap.exists) {
      const fern = snap.data();
      const fernP = Object.assign(leererFortschritt(), fern, { einst: P.einst });
      P = verschmelze(P, fernP);
      try { localStorage.setItem(LS_KEY, JSON.stringify(P)); } catch (e) { }
    }
    await cloudDoc.set(cloudPaket(), { merge: false });
    syncStatus = 'an';
  } catch (e) { syncStatus = 'fehler'; console.warn('Sync', e); }
  if (ansicht === 'profil' || ansicht === 'home') render();
}
function cloudPaket() { const p = JSON.parse(JSON.stringify(P)); delete p.einst.code; delete p.einst.theme; p._zeit = Date.now(); return p; }
function cloudSpaeter() { if (!cloudDoc) return; clearTimeout(syncTimer); syncTimer = setTimeout(async () => { try { await cloudDoc.set(cloudPaket()); syncStatus = 'an'; } catch (e) { syncStatus = 'fehler'; } }, 2500); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloudDoc) { clearTimeout(syncTimer); cloudDoc.set(cloudPaket()).catch(() => { }); } });

/* ========== Ansichten ========== */
const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
function zeigeToast(text, ms = 2200) { const t = document.getElementById('toast'); t.textContent = text; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => t.hidden = true, ms); }
function setzeTab(name) { ansicht = name; tabbar.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === name)); render(); window.scrollTo(0, 0); }
tabbar.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) setzeTab(b.dataset.tab); });

function render() {
  app.classList.toggle('full', !!sitzung);
  tabbar.hidden = !!sitzung || ansicht === 'einstieg';
  if (sitzung) return renderSitzung();
  switch (ansicht) {
    case 'einstieg': return renderEinstieg();
    case 'gebiete': return renderGebiete();
    case 'gebiet': return renderGebiet();
    case 'statistik': return renderStatistik();
    case 'profil': return renderProfil();
    case 'wahl': return renderWahl();
    default: return renderHome();
  }
}
const ICON = {
  ziel: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
  zufall: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-4 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-4 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill-rule="evenodd"/></svg>',
  schwach: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zm-1 6h2v6h-2zm0 7h2v2h-2z"/></svg>',
  blitz: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  fall: '<svg viewBox="0 0 24 24"><path d="M5 3h9l5 5v13H5zm8 1v5h5zM7 12h10v2H7zm0 4h10v2H7z"/></svg>',
  gebiet: '<svg viewBox="0 0 24 24"><path d="M3 5h18v3H3zm0 5h18v3H3zm0 5h18v3H3z"/></svg>',
  medaille: '<svg viewBox="0 0 24 24"><path d="M12 2 9.5 7.5 3.5 8l4.5 4-1.3 6L12 15l5.3 3-1.3-6 4.5-4-6-.5z"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>'
};

function renderEinstieg() {
  app.innerHTML = `<div class="einstieg">
    <div class="marke">Notarquiz<small>${fmt(FRAGEN.length)} Fragen aus dem Handbuch mit Notarwissen</small></div>
    <p>Dein Fortschritt wird auf diesem Gerät gespeichert. Mit einem Sync-Code läuft er auf Handy und iPad gemeinsam weiter. Den Code wählst du selbst, zum Beispiel ein Wort mit Zahl; auf dem zweiten Gerät gibst du denselben ein.</p>
    <div class="feld"><label for="code">Sync-Code (optional)</label><input type="text" id="code" autocomplete="off" autocapitalize="off" placeholder="z. B. urkunde-2026">
      <div class="hint">Der Code wird nicht gespeichert, sondern nur als Prüfsumme verwendet. Wer den Code kennt, sieht deinen Fortschritt.</div></div>
    <button class="weiter" id="los">Lernen beginnen</button>
  </div>`;
  document.getElementById('los').onclick = async () => {
    const code = document.getElementById('code').value.trim();
    P.einst.code = code; P.einst.begonnen = 1; speichere();
    if (code) { zeigeToast('Verbinde …'); await cloudVerbinden(code); }
    setzeTab('home');
  };
}

function renderHome() {
  const tag = heute(); const t = P.tage[tag] || { n: 0, r: 0 }; const ziel = P.einst.ziel;
  const anteil = Math.min(1, t.n / ziel); const U = 2 * Math.PI * 64;
  const st = streakBerechnen(); const faellig = faelligeIds().length; const schwach = schwachstellen().length;
  const lv = levelInfo(); const thema = themaHeute();
  const datum = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  app.innerHTML = `
    <div class="kopf"><h1>Notarquiz</h1><span class="datum">${esc(datum)}</span></div>
    <div class="siegel-wrap">
      <div class="siegel ${t.n >= ziel ? 'fertig' : ''}">
        <svg viewBox="0 0 148 148"><circle class="bg" cx="74" cy="74" r="64"/><circle class="fg" cx="74" cy="74" r="64" stroke-dasharray="${U}" stroke-dashoffset="${U * (1 - anteil)}"/></svg>
        <div class="mitte"><div class="zahl">${t.n}</div><div class="von">von ${ziel}</div></div>
        <div class="stempel">GESIEGELT</div>
      </div>
      <div class="siegel-text">
        <h2>${t.n >= ziel ? 'Tagesziel erreicht' : t.n ? 'Noch ' + (ziel - t.n) + ' bis zum Siegel' : 'Heute noch nichts gelernt'}</h2>
        <p>${lv.titel} · ${fmt(P.xp)} XP</p>
        <div class="streak"><div><b>${st.aktuell}</b><span>Tage in Folge${st.gefaehrdet ? ' · Dispens' : ''}</span></div><div><b>${faellig}</b><span>fällig</span></div><div><b>${schwach}</b><span>schwach</span></div></div>
      </div>
    </div>
    ${tagesfrageHtml()}
    <div class="modi">
      <button class="modus primaer" data-modus="tagesziel"><span class="ikon">${ICON.ziel}</span><span><h3>Tagesrunde</h3><div class="sub">${esc(KAP[thema] || '')}${faellig ? ' · plus ' + Math.min(faellig, WDH_MAX) + ' Wiederholung' + (Math.min(faellig, WDH_MAX) > 1 ? 'en' : '') : ''}</div></span><span class="zahl">${ziel}<small>Fragen</small></span></button>
      <label class="thema-zeile">Thema heute<select id="thema">${KAPITEL.map(k => `<option value="${k.slug}" ${k.slug === thema ? 'selected' : ''}>${esc(k.titel)}</option>`).join('')}</select></label>
      <button class="modus" data-modus="zufall"><span class="ikon">${ICON.zufall}</span><span><h3>Zufall</h3><div class="sub">Quer durch alle Gebiete</div></span><span class="zahl">${fmt(FRAGEN.length)}<small>im Pool</small></span></button>
      <button class="modus" data-modus="gebiete"><span class="ikon">${ICON.gebiet}</span><span><h3>Rechtsgebiet</h3><div class="sub">Gezielt ein Kapitel, wählbare Schwierigkeit</div></span><span class="zahl">${KAPITEL.length}<small>Gebiete</small></span></button>
      <button class="modus" data-modus="schwach" ${schwach < 3 ? 'disabled style="opacity:.55"' : ''}><span class="ikon">${ICON.schwach}</span><span><h3>Schwachstellen</h3><div class="sub">${schwach < 3 ? 'Erst ab drei falsch beantworteten Fragen' : 'Fragen, die zuletzt daneben gingen'}</div></span><span class="zahl">${schwach}<small>offen</small></span></button>
      <button class="modus" data-modus="blitz"><span class="ikon">${ICON.blitz}</span><span><h3>Blitzrunde</h3><div class="sub">60 Sekunden, Serienbonus</div></span><span class="zahl">${P.zaehler.blitzBest}<small>Rekord</small></span></button>
      <button class="modus" data-modus="fall"><span class="ikon">${ICON.fall}</span><span><h3>Fallstudien</h3><div class="sub">Mehrstufige Fälle mit Gestaltungsfragen</div></span><span class="zahl">${FRAGEN.filter(q => q.typ === 'fall').length}<small>Fälle</small></span></button>
    </div>`;
  app.querySelectorAll('[data-modus]').forEach(b => b.onclick = () => starteModus(b.dataset.modus));
  document.getElementById('thema').onchange = e => { P.thema = { datum: heute(), slug: e.target.value }; speichere(); renderHome(); };
  const tf = document.getElementById('tagesfrage'); if (tf) tf.onclick = () => { const q = frageDesTages(); starteSitzung({ modus: 'tagesfrage', titel: 'Frage des Tages', fragen: [q] }); };
}
function tagesfrageHtml() {
  const q = frageDesTages(); if (!q) return '';
  const t = P.tagesfrage || {}; const erledigt = t.datum === heute();
  return `<div class="tagesfrage ${erledigt ? (t.richtig ? 'ok' : 'nein') : ''}">
    <div class="tf-kopf"><span>Frage des Tages</span><span>${t.serie ? t.serie + ' in Folge' : ''}</span></div>
    <div class="tf-text">${esc(q.frage)}</div>
    ${erledigt ? `<div class="tf-stand">${t.richtig ? 'Heute richtig beantwortet' : 'Heute daneben – morgen gibt es eine neue'}</div>` : `<button class="tf-start" id="tagesfrage">Beantworten</button>`}
  </div>`;
}

let wahl = { kapitel: null, grad: 0, n: 15, modus: 'gebiet' };
function renderWahl() {
  const k = KAPITEL.find(x => x.slug === wahl.kapitel);
  const s = gebietStand(wahl.kapitel);
  app.innerHTML = `
    <div class="fkopf"><button class="zurueck" id="zur">${ICON.zurueck}</button><h2 style="font-size:17px">${esc(k.titel)}</h2></div>
    <div class="blatt"><h3>Schwierigkeit</h3><div class="chips">
      ${[[0, 'Gemischt'], [1, 'Grundwissen'], [2, 'Anwendung'], [3, 'Vertiefung']].map(([g, l]) => `<button class="chip ${wahl.grad === g ? 'an' : ''}" data-grad="${g}">${l}</button>`).join('')}
    </div></div>
    <div class="blatt"><h3>Anzahl</h3><div class="zahlwahl">${[10, 15, 20, 30].map(n => `<button class="chip ${wahl.n === n ? 'an' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>
    <div class="blatt"><h3>Stand</h3><p style="font-size:14px;color:var(--text-2)">${s.gesehen} von ${s.gesamt} Fragen gesehen · ${s.prozent} % beherrscht · ${s.faellig} fällig · ${s.schwach} schwach</p></div>
    <button class="weiter" id="start">Runde starten</button>`;
  document.getElementById('zur').onclick = () => setzeTab('gebiete');
  app.querySelectorAll('[data-grad]').forEach(b => b.onclick = () => { wahl.grad = +b.dataset.grad; renderWahl(); });
  app.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { wahl.n = +b.dataset.n; renderWahl(); });
  document.getElementById('start').onclick = () => {
    const liste = rundeZufall(wahl.n, q => q.kapitel === wahl.kapitel && (!wahl.grad || q.schwierigkeit === wahl.grad));
    if (!liste.length) return zeigeToast('Keine passenden Fragen.');
    starteSitzung({ modus: 'gebiet', titel: k.titel, fragen: liste });
  };
}

function renderGebiete() {
  app.innerHTML = `<div class="kopf"><h1>Rechtsgebiete</h1></div><div class="gebiete">${KAPITEL.map(k => {
    const s = gebietStand(k.slug); const U = 2 * Math.PI * 20;
    return `<button class="gebiet ${s.prozent >= 80 ? 'gemeistert' : ''}" data-k="${k.slug}">
      <span class="ring"><svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20" stroke-dasharray="${U}" stroke-dashoffset="${U * (1 - s.prozent / 100)}"/></svg><span class="pz">${s.prozent}</span></span>
      <span><h3>${esc(k.titel)}</h3><div class="sub">${s.gesamt} Fragen${s.faellig ? ' · ' + s.faellig + ' fällig' : ''}${s.schwach ? ' · ' + s.schwach + ' schwach' : ''}</div></span>
      <span class="chev">›</span></button>`;
  }).join('')}</div>`;
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { wahl.kapitel = b.dataset.k; ansicht = 'wahl'; render(); window.scrollTo(0, 0); });
}

function renderStatistik() {
  const s = statistikZusammen(); const quote = s.beantwortet ? Math.round(s.richtig / s.beantwortet * 100) : 0;
  const boxen = [0, 0, 0, 0, 0, 0]; let gesehen = 0;
  FRAGEN.forEach(q => { const e = P.fragen[q.id]; if (e && e.n > 0) { boxen[e.b]++; gesehen++; } });
  boxen[0] += 0; const maxBox = Math.max(1, ...boxen, FRAGEN.length - gesehen);
  const h = heute(); const zellen = []; for (let i = 90; i >= 0; i--) { const d = tagPlus(h, -i); const t = P.tage[d]; const n = t ? t.n : 0; zellen.push(`<i class="${n ? (n >= 40 ? 'l4' : n >= 25 ? 'l3' : n >= 12 ? 'l2' : 'l1') : ''} ${d === h ? 'heute' : ''}" title="${d}: ${n}"></i>`); }
  app.innerHTML = `<div class="kopf"><h1>Statistik</h1></div>
    <div class="stat-grid">
      <div class="stat"><b>${fmt(s.beantwortet)}</b><span>Antworten gesamt</span></div>
      <div class="stat"><b>${quote} %</b><span>Trefferquote</span></div>
      <div class="stat"><b>${s.streak}</b><span>Tage in Folge (Rekord ${s.streakBest})</span></div>
      <div class="stat"><b>${gesehen}<small style="font-size:14px;color:var(--text-2)"> / ${fmt(FRAGEN.length)}</small></b><span>Fragen gesehen</span></div>
    </div>
    <div class="abschnitt-titel">Letzte 13 Wochen</div>
    <div class="blatt" style="margin-top:0"><div class="heatmap">${zellen.join('')}</div></div>
    <div class="abschnitt-titel">Wiederholungsstufen</div>
    <div class="blatt" style="margin-top:0;padding-top:28px"><div class="boxen">
      <div class="box b0" style="height:${(FRAGEN.length - gesehen) / maxBox * 100}%"><span>${fmt(FRAGEN.length - gesehen)}</span></div>
      ${boxen.map((n, i) => i === 0 ? '' : `<div class="box b${i}" style="height:${n / maxBox * 100}%"><span>${n}</span></div>`).join('')}
      <div class="box" style="height:${boxen[0] / maxBox * 100}%;background:var(--siegel)"><span>${boxen[0]}</span></div>
    </div><div class="boxen-lbl"><span>neu</span><span>1 Tag</span><span>3 Tage</span><span>1 Wo.</span><span>16 T.</span><span>35 T.</span><span>falsch</span></div></div>
    <div class="abschnitt-titel">Abzeichen</div>
    <div class="abzeichen-liste">${ABZEICHEN.map(a => `<div class="abz ${P.abz[a.id] ? 'hat' : ''}"><span class="medaille">${ICON.medaille}</span><span><b>${a.name}</b><span>${a.text}</span></span></div>`).join('')}</div>`;
  // Reihenfolge der Stufen-Balken: neu, 1–5, falsch -> Spalten sind 7, Grid hat 6: anpassen
  const bx = app.querySelector('.boxen'); bx.style.gridTemplateColumns = 'repeat(7,1fr)'; app.querySelector('.boxen-lbl').style.gridTemplateColumns = 'repeat(7,1fr)';
}

function renderProfil() {
  const lv = levelInfo(); const s = statistikZusammen();
  app.innerHTML = `<div class="kopf"><h1>Profil</h1></div>
    <div class="level-karte"><div class="titel">${lv.titel}</div><div class="sub">Stufe ${lv.stufe} von ${LEVEL.length} · ${fmt(P.xp)} XP</div>
      <div class="balken"><i style="width:${Math.round(lv.anteil * 100)}%"></i></div>
      <div class="xp"><span>${fmt(lv.von)}</span><span>${lv.bis ? 'nächste Stufe bei ' + fmt(lv.bis) : 'Höchste Stufe'}</span></div></div>
    <div class="feld"><label for="code">Sync-Code</label><input type="text" id="code" value="${esc(P.einst.code)}" autocomplete="off" autocapitalize="off" placeholder="Code für Handy und iPad">
      <div class="sync-status ${syncStatus === 'an' ? 'an' : syncStatus === 'fehler' ? 'fehler' : ''}"><i></i>${{ an: 'Verbunden – Fortschritt wird abgeglichen', fehler: 'Keine Verbindung (offline oder Regel fehlt); lokal gespeichert', verbinde: 'Verbinde …', aus: 'Kein Sync – nur dieses Gerät' }[syncStatus]}</div>
      <div class="reihe"><button class="primaer" id="codeSpeichern">Verbinden</button><button id="syncJetzt" ${!cloudDoc ? 'disabled' : ''}>Jetzt abgleichen</button></div></div>
    <div class="feld">
      <div class="schalter"><span>Tagesziel</span><select id="ziel">${ZIELE.map(z => `<option value="${z}" ${P.einst.ziel === z ? 'selected' : ''}>${z} Fragen</option>`).join('')}</select></div>
      <div class="schalter"><span>Darstellung</span><select id="theme"><option value="system" ${P.einst.theme === 'system' ? 'selected' : ''}>Automatisch</option><option value="light" ${P.einst.theme === 'light' ? 'selected' : ''}>Hell</option><option value="dark" ${P.einst.theme === 'dark' ? 'selected' : ''}>Dunkel</option></select></div>
    </div>
    <div class="feld"><div style="font-size:13px;color:var(--text-2)">${fmt(FRAGEN.length)} Fragen · ${KAPITEL.length} Rechtsgebiete · ${s.sitzungen} Runden · Version ${VERSION}<br>Quelle: Handbuch mit Notarwissen (Notarius). Jede Auflösung verlinkt die Handbuchseite.</div></div>
    <div class="feld"><button class="gefahr" id="reset">Fortschritt auf diesem Gerät löschen</button></div>`;
  document.getElementById('codeSpeichern').onclick = async () => { const c = document.getElementById('code').value.trim(); P.einst.code = c; speichere(); if (c) { zeigeToast('Verbinde …'); await cloudVerbinden(c); } else { cloudDoc = null; syncStatus = 'aus'; } renderProfil(); };
  document.getElementById('syncJetzt').onclick = async () => { zeigeToast('Gleiche ab …'); await cloudAbgleich(); renderProfil(); zeigeToast(syncStatus === 'an' ? 'Abgeglichen' : 'Abgleich fehlgeschlagen'); };
  document.getElementById('ziel').onchange = e => { P.einst.ziel = +e.target.value; speichere(); };
  document.getElementById('theme').onchange = e => { P.einst.theme = e.target.value; themeAnwenden(); speichere(); };
  document.getElementById('reset').onclick = () => { if (confirm('Fortschritt auf diesem Gerät wirklich löschen? Ein verbundener Cloud-Stand bleibt erhalten und wird beim nächsten Verbinden wieder geladen.')) { const code = P.einst.code; localStorage.removeItem(LS_KEY); P = leererFortschritt(); P.einst.code = code; P.einst.begonnen = 1; speichere(); cloudDoc = null; syncStatus = 'aus'; renderProfil(); } };
}
function themeAnwenden() { const t = P.einst.theme; if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

/* ========== Runde ========== */
function starteModus(m) {
  const n = P.einst.ziel;
  if (m === 'tagesziel') { const slug = themaHeute(); const r = rundeTagesziel(n, slug); return starteSitzung({ modus: 'tagesziel', titel: 'Tagesrunde', fragen: r.thema.concat(r.wdh), wdhAb: r.thema.length }); }
  if (m === 'zufall') return starteSitzung({ modus: 'zufall', titel: 'Zufall', fragen: rundeZufall(n) });
  if (m === 'gebiete') return setzeTab('gebiete');
  if (m === 'schwach') return starteSitzung({ modus: 'schwach', titel: 'Schwachstellen', fragen: mische(schwachstellen()).slice(0, n) });
  if (m === 'blitz') return starteSitzung({ modus: 'blitz', titel: 'Blitzrunde', fragen: mische(FRAGEN.filter(q => q.typ === 'mc' || q.typ === 'rf')), zeit: 60 });
  if (m === 'fall') { const f = FRAGEN.filter(q => q.typ === 'fall'); if (!f.length) return zeigeToast('Noch keine Fälle im Pool.'); const tag = heute(); const prio = f.filter(q => istNeu(q.id) || istFaellig(q.id, tag)); let l = mische(prio).slice(0, 3); if (l.length < 3) l = l.concat(mische(f.filter(q => !l.includes(q))).slice(0, 3 - l.length)); return starteSitzung({ modus: 'fall', titel: 'Fallstudien', fragen: l }); }
}
function starteSitzung(cfg) {
  if (!cfg.fragen.length) return zeigeToast('Keine Fragen für diese Runde.');
  sitzung = Object.assign({ idx: 0, richtig: 0, falsch: 0, xp: 0, serie: 0, serieBest: 0, fehler: [], nachschub: [], start: Date.now(), beantwortet: 0, blitzRichtig: 0 }, cfg);
  if (cfg.zeit) { sitzung.ende = Date.now() + cfg.zeit * 1000; sitzung.timer = setInterval(() => { const rest = sitzung.ende - Date.now(); const bar = document.getElementById('zeitbar'); if (bar) bar.style.width = Math.max(0, rest / (cfg.zeit * 1000) * 100) + '%'; if (rest <= 0) { clearInterval(sitzung.timer); beendeSitzung(); } }, 250); }
  render(); window.scrollTo(0, 0);
}
function abbrechen() { if (sitzung.timer) clearInterval(sitzung.timer); if (sitzung.beantwortet > 0) return beendeSitzung(); sitzung = null; setzeTab('home'); }
function gradHtml(g) { return `<span class="grad" title="Schwierigkeit ${g}">${[1, 2, 3].map(i => `<i class="${i <= g ? 'an' : ''}"></i>`).join('')}</span>`; }
function quelleHtml(q) { return `<div class="quelle">${esc(q.seite)} · <a href="${WISSEN_URL}${esc(q.quelle)}" target="_blank" rel="noopener">im Handbuch nachlesen</a></div>`; }
function normenHtml(q) { return q.normen && q.normen.length ? `<div class="normen">${q.normen.map(n => `<button class="norm" data-norm="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''; }
document.addEventListener('click', e => { const b = e.target.closest('[data-norm]'); if (b) { e.preventDefault(); e.stopPropagation(); oeffneNorm(b.dataset.norm); } }, true);

/* ========== Gesetzestexte (Overlay) ========== */
const GESETZ_SLUG = { BGB: 'bgb', BNotO: 'bnoto', BeurkG: 'beurkg', GBO: 'gbo', GNotKG: 'gnotkg', GmbHG: 'gmbhg', HGB: 'hgb', InsO: 'inso', FamFG: 'famfg', ZPO: 'zpo', ZVG: 'zvg', UmwG: 'umwg-1995', ErbStG: 'erbstg-1974', GrEStG: 'grestg-1983', GwG: 'gwg-2017', WEG: 'woeigg', WoEigG: 'woeigg', ErbbauRG: 'erbbauv', ErbbauVO: 'erbbauv', BauGB: 'bbaug', AktG: 'aktg', GenG: 'geng', PartGG: 'partgg', LPartG: 'lpartg', NotAktVV: 'notaktvv', PStG: 'pstg', VwVfG: 'vwvfg', BewG: 'bewg', GBV: 'gbvfg', GrdstVG: 'grdstvg', GVO: 'grdstvv', VRegV: 'vregv', ZTRV: 'ztrv', WHG: 'whg-2009', RSiedlG: 'rsiedlg', BNatSchG: 'bnatschg-2009', MaBV: 'mabv', EGBGB: 'egbgb', GewO: 'gewo', EStG: 'estg', AO: 'ao', GG: 'gg', StGB: 'stgb', SGB: 'sgb', VersAusglG: 'versausglg', LebensPartG: 'lpartg', EuErbVO: 'euerbvo', EGGVG: 'eggvg', HausbauVO: 'hausbauvo', DONot: 'donot', SigG: 'sigg', VDG: 'vdg', eIDAS: 'eidas', GBMaßnG: 'gbmassng', RPflG: 'rpflg', GVG: 'gvg', KostO: 'kosto', UStG: 'ustg', BDSG: 'bdsg', DSGVO: 'dsgvo', TKG: 'tkg', BGBEG: 'egbgb', UrhG: 'urhg', GKG: 'gkg', RVG: 'rvg', EGHGB: 'eghgb', EGInsO: 'eginso', SchuldRAnpG: 'schuldranpg', SachenRBerG: 'sachenrberg', LwVG: 'lwvg', HöfeO: 'hoefeo', AGGVG: 'aggvg', LBO: 'lbo', FlurbG: 'flurbg', BewG1991: 'bewg' };
let NORMEN = null;
let NORM_RE = null;
function nt(text) {
  if (!NORM_RE) NORM_RE = new RegExp('(?:§§?|Art\\.)\\s*\\d+[a-z]?(?:(?:\\s*(?:,|und|bis|–|-)\\s*|\\s+)(?:Abs\\.|Absatz|S\\.|Satz|Nr\\.|Alt\\.|Hs\\.|Var\\.)?\\s*\\d+[a-z]?)*\\s+(?:' + Object.keys(GESETZ_SLUG).sort((a, b) => b.length - a.length).join('|') + ')(?![A-Za-zÄÖÜäöüß])', 'g');
  return esc(text).replace(NORM_RE, m => `<span class="norm-in" role="link" tabindex="0" data-norm="${m}">${m}</span>`);
}
function normParsen(text) {
  // "§ 3 Abs. 1 Nr. 2 MaBV", "§§ 24, 28 Abs. 1 S. 2 BauGB", "Art. 244 EGBGB", "§ 1944 Abs. 2 BGB i. V. m. §§ 348, 350 FamFG"
  const teile = text.split(/\s*(?:i\.\s?V\.\s?m\.|iVm|;|\bund\b(?=\s*§)|\bsowie\b)\s*/i);
  const ergebnis = [];
  teile.forEach(t => {
    const gesetz = (t.match(/([A-ZÄÖÜ][A-Za-zÄÖÜäöüß]*[A-Za-z]*(?:\s\d{4})?)\s*$/) || [])[1];
    if (!gesetz) return;
    const kurz = gesetz.replace(/\s\d{4}$/, '').trim();
    const nummern = []; const re = /(§§?|Art\.?|Artikel)\s*((?:\d+[a-z]?(?:\s*(?:,|bis|–|-)\s*)?)+)/g; let m;
    while ((m = re.exec(t))) { m[2].split(/\s*(?:,|bis|–|-)\s*/).forEach(n => { if (/^\d+[a-z]?$/.test(n)) nummern.push({ art: /Art/.test(m[1]) ? 'Art.' : '§', n }); }); }
    const abs = (t.match(/Abs(?:atz|\.)\s*(\d+)/) || [])[1];
    nummern.forEach(x => ergebnis.push({ gesetz: kurz, art: x.art, n: x.n, abs, slug: (GESETZ_SLUG[kurz] || kurz.toLowerCase()) + '/' + x.n }));
  });
  return ergebnis;
}
async function normenLaden() { if (NORMEN) return NORMEN; try { const r = await fetch('data/normen.json?v=' + VERSION); NORMEN = await r.json(); } catch (e) { NORMEN = {}; } return NORMEN; }
function normText(md, abs) {
  // Markdown-lite: Überschrift, Absätze, Listen; Quelle-Zeile entfernen; Absatz (N) hervorheben
  const zeilen = md.replace(/\n---[\s\S]*$/, '').replace(/([a-zäöüß])([a-h]\))([A-Za-zäöüÄÖÜ])/g, '$1 $2 $3').split(/\n{2,}/);
  return zeilen.map(z => {
    z = z.trim(); if (!z || z.startsWith('## ')) return '';
    if (/^\d+\.\s/m.test(z)) return `<ol>${z.split(/\n(?=\d+\.\s)/).map(li => `<li>${esc(li.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
    const hit = abs && z.startsWith('(' + abs + ')');
    return `<p class="${hit ? 'abs-hit' : ''}">${esc(z)}</p>`;
  }).join('');
}
async function oeffneNorm(text) {
  const liste = normParsen(text);
  const alt = document.querySelector('.norm-overlay'); if (alt) alt.remove();
  const o = document.createElement('div'); o.className = 'norm-overlay';
  o.innerHTML = `<div class="norm-blatt"><div class="norm-kopf"><span>${esc(text)}</span><button class="norm-zu" aria-label="Schließen">${ICON.zurueck}</button></div><div class="norm-inhalt"><p class="laden-klein">Lade Gesetzestext …</p></div></div>`;
  document.body.appendChild(o); requestAnimationFrame(() => o.classList.add('an'));
  const zu = () => { o.classList.remove('an'); setTimeout(() => o.remove(), 250); };
  o.querySelector('.norm-zu').onclick = zu; o.addEventListener('click', e => { if (e.target === o) zu(); });
  const N = await normenLaden(); const inhalt = o.querySelector('.norm-inhalt');
  if (!liste.length) { inhalt.innerHTML = `<p>Diese Angabe lässt sich keiner einzelnen Vorschrift zuordnen.</p>`; return; }
  inhalt.innerHTML = liste.map(x => {
    const e = N[x.slug];
    if (e) return `<section class="norm-abschnitt"><h3>${esc(e.t)}</h3><div class="norm-gesetz">${esc(e.g)}</div>${normText(e.c, x.abs)}${e.u ? `<a class="norm-link" href="${esc(e.u)}" target="_blank" rel="noopener">Im Original bei gesetze-im-internet.de</a>` : ''}</section>`;
    const such = encodeURIComponent(`${x.art} ${x.n} ${x.gesetz}`);
    return `<section class="norm-abschnitt"><h3>${esc(x.art + ' ' + x.n + ' ' + x.gesetz)}</h3><p>Text nicht hinterlegt.</p><a class="norm-link" href="https://dejure.org/cgi-bin/suche?Suchbegriff=${such}" target="_blank" rel="noopener">Bei dejure.org nachschlagen</a></section>`;
  }).join('');
}

function renderSitzung() {
  const s = sitzung;
  if (s.idx >= s.fragen.length) { if (s.nachschub.length && s.modus !== 'blitz') { s.fragen = s.fragen.concat(s.nachschub); s.nachschub = []; } else return beendeSitzung(); }
  const q = s.fragen[s.idx];
  const kopf = `<div class="fkopf"><button class="zurueck" id="abbr" aria-label="Runde beenden">${ICON.zurueck}</button>
    ${s.zeit ? `<div class="fortschritt zeit"><i id="zeitbar" style="width:${Math.max(0, (s.ende - Date.now()) / (s.zeit * 1000) * 100)}%"></i></div><span class="serie">${s.serie >= 3 ? '×' + Math.min(5, 1 + Math.floor(s.serie / 3)) + ' Serie' : s.blitzRichtig + ' richtig'}</span>`
      : `<div class="fortschritt"><i style="width:${s.idx / s.fragen.length * 100}%"></i></div><span class="zaehler">${s.idx + 1} / ${s.fragen.length}</span>`}
  </div>`;
  let inhalt = '';
  if (q.typ === 'fall') inhalt = fallHtml(q);
  else if (q.typ === 'zuordnung') inhalt = zuordnungHtml(q);
  else inhalt = mcHtml(q);
  app.innerHTML = kopf + `<div class="urkunde"><div class="meta"><span class="fach">${s.wdhAb !== undefined && s.idx >= s.wdhAb ? '<b class="wdh-chip">Wiederholung</b> ' : ''}${esc(KAP[q.kapitel] || q.kapitel)}${q.abschnitt ? ' · ' + esc(q.abschnitt) : ''}</span>${gradHtml(q.schwierigkeit)}</div>${inhalt}</div>`;
  document.getElementById('abbr').onclick = abbrechen;
  if (q.typ === 'fall') bindeFall(q); else if (q.typ === 'zuordnung') bindeZuordnung(q); else bindeMc(q);
}

/* -- Multiple Choice / Richtig-Falsch -- */
function mcHtml(q, schritt) {
  const f = schritt || q;
  if (q.typ === 'rf' && !schritt) return `<div class="frage">${nt(f.frage)}</div><div class="optionen rf"><button class="option" data-i="1"><span class="txt">Richtig</span></button><button class="option" data-i="0"><span class="txt">Falsch</span></button></div><div id="aufl"></div>`;
  const reihe = [0, 1, 2, 3].slice(0, f.optionen.length);
  const perm = f._perm || (f._perm = (f.fest || q.fest) ? reihe : mische(reihe));
  return `<div class="frage">${nt(f.frage)}</div><div class="optionen">${perm.map((oi, k) => `<button class="option" data-i="${oi}"><span class="buchst">${'ABCD'[k]}</span><span class="txt">${nt(f.optionen[oi])}</span></button>`).join('')}</div><div id="aufl"></div>`;
}
function bindeMc(q) {
  app.querySelectorAll('.option').forEach(b => b.onclick = () => {
    const gew = +b.dataset.i; const richtig = q.typ === 'rf' ? (gew === 1) === !!q.antwort : gew === q.antwort;
    app.querySelectorAll('.option').forEach(o => { o.disabled = true; const i = +o.dataset.i; const istRichtig = q.typ === 'rf' ? (i === 1) === !!q.antwort : i === q.antwort; if (istRichtig) o.classList.add('richtig'); else if (i === gew) o.classList.add('falsch'); });
    if (sitzung.modus === 'blitz') return blitzAntwort(q, richtig);
    zeigeAufloesung(q, richtig, q.erklaerung);
  });
}
function zeigeAufloesung(q, richtig, erkl, nachher) {
  const box = document.getElementById('aufl');
  box.innerHTML = `<div class="aufloesung"><div class="urteil ${richtig ? 'ok' : 'nein'}">${richtig ? 'Richtig' : 'Nicht richtig'}</div><div class="erkl">${nt(erkl)}</div>${normenHtml(q)}${quelleHtml(q)}
    ${richtig ? `<div class="sicherheit"><button class="sicher" id="sicher">Sicher gewusst<small>längeres Intervall</small></button><button class="unsicher" id="unsicher">Eher geraten<small>bald wieder vorlegen</small></button></div>` : `<button class="weiter" id="weiter">Weiter</button>`}</div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const fertig = (sicher) => { const xp = verbuche(q, richtig, sicher); sitzungZaehlen(q, richtig, xp); if (nachher) nachher(richtig); else weiter(); };
  if (richtig) { document.getElementById('sicher').onclick = () => fertig(true); document.getElementById('unsicher').onclick = () => fertig(false); }
  else document.getElementById('weiter').onclick = () => fertig(false);
}
function sitzungZaehlen(q, richtig, xp) {
  const s = sitzung; s.beantwortet++; s.xp += xp;
  if (s.modus === 'tagesfrage') { const t = P.tagesfrage || { serie: 0 }; const gestern = t.datum === tagPlus(heute(), -1); P.tagesfrage = { datum: heute(), richtig, serie: richtig ? (gestern || t.datum === heute() ? t.serie + 1 : 1) : 0 }; if (richtig) { P.xp += 10; s.xp += 10; } }
  if (richtig) { s.richtig++; s.serie++; s.serieBest = Math.max(s.serieBest, s.serie); if (navigator.vibrate) navigator.vibrate(12); }
  else { if (navigator.vibrate) navigator.vibrate([40, 40, 40]); s.falsch++; s.serie = 0; s.fehler.push(q); if (s.modus !== 'blitz' && s.modus !== 'fall' && !q._wdh && s.nachschub.length < 5) s.nachschub.push(Object.assign({}, q, { _perm: null, _wdh: true })); }
  if (xp) { const u = app.querySelector('.urkunde'); if (u) { const e = document.createElement('div'); e.className = 'xp-plus'; e.textContent = '+' + xp + ' XP'; u.appendChild(e); } }
  speichere();
}
function weiter() { sitzung.idx++; render(); window.scrollTo(0, 0); }

/* -- Blitz -- */
function blitzAntwort(q, richtig) {
  const s = sitzung; let xp = 0;
  if (richtig) { s.blitzRichtig++; xp = 5 * Math.min(5, 1 + Math.floor(s.serie / 3)); }
  verbuche(q, richtig, richtig); // im Blitz zählt richtig als sicher
  sitzungZaehlen(q, richtig, xp);
  setTimeout(() => { if (sitzung && sitzung.ende > Date.now()) weiter(); }, richtig ? 450 : 1100);
}

/* -- Zuordnung -- */
function zuordnungHtml(q) {
  const links = q.paare.map(p => p[0]); const rechts = q._rechts || (q._rechts = mische(q.paare.map((p, i) => i)));
  return `<div class="frage">${nt(q.frage)}</div><div class="zuordnung">${links.map((l, i) => `<button class="zo l" data-l="${i}">${nt(l)}</button><button class="zo r" data-r="${rechts[i]}">${nt(q.paare[rechts[i]][1])}</button>`).join('')}</div><div id="aufl"></div>`;
}
function bindeZuordnung(q) {
  let aktivL = null, fehler = 0, offen = q.paare.length;
  const alle = app.querySelectorAll('.zo');
  alle.forEach(b => b.onclick = () => {
    if (b.dataset.l !== undefined) { alle.forEach(x => x.classList.remove('aktiv')); aktivL = +b.dataset.l; b.classList.add('aktiv'); return; }
    if (aktivL === null) return;
    const r = +b.dataset.r; const lBtn = app.querySelector(`.zo[data-l="${aktivL}"]`);
    if (r === aktivL) { lBtn.classList.remove('aktiv'); lBtn.classList.add('paar'); b.classList.add('paar'); lBtn.disabled = b.disabled = true; offen--; aktivL = null; if (!offen) { alle.forEach(x => x.disabled = true); zeigeAufloesung(q, fehler === 0, q.erklaerung); } }
    else { fehler++; lBtn.classList.add('fehl'); b.classList.add('fehl'); setTimeout(() => { lBtn.classList.remove('fehl'); b.classList.remove('fehl'); }, 500); }
  });
}

/* -- Fall -- */
function fallHtml(q) {
  q._schritt = q._schritt || 0; q._fehler = q._fehler || 0;
  const st = q.schritte[q._schritt];
  return `<div class="sachverhalt">${nt(q.sachverhalt)}</div><div class="schritt-lbl">${esc(q.frage)} · Schritt ${q._schritt + 1} von ${q.schritte.length}</div>${mcHtml(q, st)}`;
}
function bindeFall(q) {
  const st = q.schritte[q._schritt];
  app.querySelectorAll('.option').forEach(b => b.onclick = () => {
    const gew = +b.dataset.i; const richtig = gew === st.antwort;
    app.querySelectorAll('.option').forEach(o => { o.disabled = true; const i = +o.dataset.i; if (i === st.antwort) o.classList.add('richtig'); else if (i === gew) o.classList.add('falsch'); });
    if (!richtig) q._fehler++;
    const box = document.getElementById('aufl');
    const letzter = q._schritt === q.schritte.length - 1;
    box.innerHTML = `<div class="aufloesung"><div class="urteil ${richtig ? 'ok' : 'nein'}">${richtig ? 'Richtig' : 'Nicht richtig'}</div><div class="erkl">${nt(st.erklaerung)}</div>${letzter ? `<div class="erkl" style="margin-top:8px"><b>Gesamtlösung.</b> ${nt(q.erklaerung)}</div>${normenHtml(q)}${quelleHtml(q)}` : ''}<button class="weiter" id="weiter">${letzter ? 'Fall abschließen' : 'Nächster Schritt'}</button></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const s = sitzung; s.xp += richtig ? 8 : 0; P.xp += richtig ? 8 : 0;
    document.getElementById('weiter').onclick = () => {
      if (!letzter) { q._schritt++; render(); window.scrollTo(0, 0); return; }
      const ganz = q._fehler === 0;
      verbuche(q, ganz, ganz); if (ganz) P.zaehler.faelleRichtig++;
      s.beantwortet++; if (ganz) { s.richtig++; s.serie++; } else { s.falsch++; s.serie = 0; s.fehler.push(q); }
      q._schritt = 0; q._fehler = 0; q.schritte.forEach(x => x._perm = null);
      speichere(); weiter();
    };
  });
}

/* -- Ergebnis -- */
function beendeSitzung() {
  const s = sitzung; if (s.timer) clearInterval(s.timer);
  sitzung = null; ansicht = 'ergebnis';
  const stufeVorher = levelInfo(P.xp - s.xp);
  P.zaehler.sitzungen++;
  const urNr = P.zaehler.sitzungen + '/' + new Date().getFullYear();
  if (s.modus === 'blitz') P.zaehler.blitzBest = Math.max(P.zaehler.blitzBest, s.blitzRichtig);
  if (s.beantwortet >= 10 && s.falsch === 0) P.zaehler.fehlerfreiRunde = true;
  const neu = abzeichenPruefen(); speichere();
  const tag = heute(); const t = P.tage[tag] || { n: 0 }; const ziel = P.einst.ziel; const quote = s.beantwortet ? Math.round(s.richtig / s.beantwortet * 100) : 0;
  const dauer = Math.round((Date.now() - s.start) / 1000); const min = Math.floor(dauer / 60), sek = dauer % 60;
  const kommentar = s.beantwortet === 0 ? 'Keine Antwort gegeben.' : quote === 100 ? 'Fehlerfrei. Weiter so.' : quote >= 80 ? 'Sitzt weitgehend. Die Lücken kommen wieder.' : quote >= 60 ? 'Solide Basis, Wiederholung lohnt.' : 'Schwerer Stoff. Die Fragen kommen morgen wieder.';
  app.classList.remove('full'); tabbar.hidden = false;
  app.innerHTML = `<div class="ergebnis"><div class="gross">${s.modus === 'blitz' ? s.blitzRichtig : quote + '<small> %</small>'}</div><h2>${s.modus === 'blitz' ? (s.blitzRichtig > 0 && s.blitzRichtig >= P.zaehler.blitzBest ? 'Neuer Rekord' : 'richtig in 60 Sekunden') : esc(s.titel) + ' beendet'}</h2><p>${kommentar}</p><p class="urnr">Urkundenrolle Nr. ${urNr}</p></div>
    <div class="kacheln"><div class="kachel"><b>${s.richtig}</b><span>richtig</span></div><div class="kachel"><b>${s.falsch}</b><span>falsch</span></div><div class="kachel"><b>+${s.xp}</b><span>XP</span></div><div class="kachel"><b>${s.serieBest}</b><span>beste Serie</span></div><div class="kachel"><b>${min}:${String(sek).padStart(2, '0')}</b><span>Dauer</span></div><div class="kachel"><b>${Math.min(t.n, ziel)}/${ziel}</b><span>Tagesziel</span></div></div>
    ${neu.map(a => `<div class="abzeichen-neu"><span class="medaille">${ICON.medaille}</span><span><b>Abzeichen: ${a.name}</b><span>${a.text}</span></span></div>`).join('')}
    ${s.fehler.length ? `<div class="fehlerliste"><h3>Zum Nachlesen</h3>${s.fehler.slice(0, 8).map(q => `<div class="fehler"><div class="f">${esc(q.frage)}</div><div class="a">${esc(q.typ === 'mc' ? q.optionen[q.antwort] : q.typ === 'rf' ? (q.antwort ? 'Richtig' : 'Falsch') : q.typ === 'fall' ? 'Fall mit Fehlern' : 'Zuordnung mit Fehlern')}</div>${quelleHtml(q)}</div>`).join('')}</div>` : ''}
    <button class="weiter" id="nochmal" style="margin-top:18px">${s.modus === 'blitz' ? 'Noch eine Blitzrunde' : 'Noch eine Runde'}</button><button class="weiter sekundaer" id="home">Zur Übersicht</button>`;
  document.getElementById('nochmal').onclick = () => starteModus(s.modus === 'gebiet' || s.modus === 'tagesfrage' ? 'zufall' : s.modus);
  document.getElementById('home').onclick = () => setzeTab('home');
  window.scrollTo(0, 0);
  const lvNach = levelInfo();
  if (lvNach.stufe > stufeVorher.stufe) zeigeErnennung(lvNach);
}
function zeigeErnennung(lv) {
  const o = document.createElement('div'); o.className = 'ernennung';
  const datum = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  o.innerHTML = `<div class="urk"><div class="urk-rand"><div class="urk-kopf">Ernennungsurkunde</div>
    <p class="urk-text">Auf Grund von ${fmt(P.xp)} erworbenen Erfahrungspunkten werden Sie mit Wirkung vom ${datum} zur Stufe ${lv.stufe} ernannt:</p>
    <div class="urk-titel">${esc(lv.titel)}</div>
    <div class="urk-siegel">§</div>
    <p class="urk-fuss">Notarquiz · Urkundenrolle Nr. ${P.zaehler.sitzungen}/${new Date().getFullYear()}</p>
    <button class="weiter" id="urkZu">Urkunde annehmen</button></div></div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add('an'));
  o.querySelector('#urkZu').onclick = () => { o.classList.remove('an'); setTimeout(() => o.remove(), 300); };
}

/* ========== Start ========== */
async function start() {
  app.innerHTML = '<div class="laden">Lade Fragen …</div>';
  P = ladeLokal(); themeAnwenden();
  try {
    const r = await fetch('data/fragen.json?v=' + VERSION, { cache: 'no-cache' });
    const d = await r.json();
    FRAGEN = d.fragen; KAPITEL = d.kapitel; KAPITEL.forEach(k => KAP[k.slug] = k.titel);
  } catch (e) { app.innerHTML = '<div class="laden">Fragen konnten nicht geladen werden. Beim ersten Start ist eine Internetverbindung nötig.</div>'; return; }
  cloudInit();
  if (!P.einst.begonnen) { ansicht = 'einstieg'; render(); return; }
  setzeTab('home');
  if (P.einst.code) cloudVerbinden(P.einst.code);
}
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { })); }
start();
