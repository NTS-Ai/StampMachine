/* ---------- voortgang: opslaan, automatisch wissen, bakjes en levels ----------
   Alles staat alleen in localStorage van deze browser. Er is geen server. */

/** Niet wijzigen: anders verliezen bestaande spelers hun voortgang. */
const STORE_KEY = 'fayora-stamp-v1';
/** Na zoveel dagen zonder spelen wordt de voortgang gewist. */
const KEEP_DAYS = 30;
const KEEP_MS = KEEP_DAYS * 24 * 60 * 60 * 1000;

/**
 * Per vraag: b = bakje (0 = net fout, 3 = zit erin), s = aantal keer gezien.
 * @typedef {{ b: number, s: number }} ItemStat
 */

/**
 * @typedef {Object} SaveState
 * @property {number} xp
 * @property {Object<string, ItemStat>} m          Bakjes per vraag-id.
 * @property {Object<string, number>} best         Records per modus en week, plus bossWins.
 * @property {Object<string, number>} fc           Flashcards die je als 'zit erin' markeerde.
 * @property {{ count: number, day: string }} streak  Dagen op rij en de laatste speeldag.
 * @property {boolean} sound
 * @property {number} last                         Tijdstip (ms) van de laatste keer spelen.
 * @property {string[]} [days]                     Oud formaat; wordt bij laden omgezet naar streak.
 */

/** @returns {SaveState} */
const freshState = () => ({ xp: 0, m: {}, best: {}, fc: {}, streak: { count: 0, day: '' }, sound: true, last: Date.now() });

/** De voortgang van de speler. @type {SaveState} */
let S = freshState();
/** True als de oude voortgang bij het laden te oud was en is gewist. */
let progressWasCleared = false;

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
  if (!raw) return;

  let saved;
  try { saved = Object.assign(freshState(), JSON.parse(raw)); } catch (e) { return; }

  if (Date.now() - saved.last > KEEP_MS) {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* negeren */ }
    progressWasCleared = true;
    return;
  }

  // Oud formaat: een lijst met speeldagen. We bewaren alleen nog de reeks zelf.
  if (Array.isArray(saved.days)) {
    saved.streak = streakFromDays(saved.days);
    delete saved.days;
  }
  S = saved;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* opslag vol of geblokkeerd */ }
}

/** Wist alles uit deze browser en begint opnieuw. */
function resetProgress() {
  try { localStorage.removeItem(STORE_KEY); } catch (e) { /* negeren */ }
  S = freshState();
}

/* ---------- dagen op rij ---------- */

/** @param {string[]} days */
function streakFromDays(days) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  const lastDay = dayKey(d);
  let count = 0;
  while (set.has(dayKey(d))) { count++; d.setDate(d.getDate() - 1); }
  return { count, day: count ? lastDay : '' };
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Aantal dagen op rij; 0 als je gisteren en vandaag niet speelde. */
function currentStreak() {
  const { count, day } = S.streak;
  return day === dayKey() || day === yesterdayKey() ? count : 0;
}

/** Aanroepen bij elk antwoord: houdt de reeks en de bewaartermijn bij. */
function markPlayed() {
  S.last = Date.now();
  const today = dayKey();
  if (S.streak.day === today) return;
  const count = S.streak.day === yesterdayKey() ? S.streak.count + 1 : 1;
  S.streak = { count, day: today };
}

/* ---------- bakjes (spaced repetition) ---------- */

/** @param {string} id */
const box = id => (S.m[id] && S.m[id].b) || 0;

/** Een vraag is 'gezien en fout' als hij in bakje 0 staat. @param {Question} q */
const isWeak = q => !!S.m[q.id] && S.m[q.id].b === 0;

/**
 * Werkt het bakje van een vraag bij.
 * @param {string} id
 * @param {'right' | 'almost' | 'wrong'} outcome
 */
function recordAnswer(id, outcome) {
  const stat = S.m[id] || { b: 0, s: 0 };
  stat.s++;
  if (outcome === 'right') stat.b = Math.min(3, stat.b + 1);
  if (outcome === 'wrong') stat.b = 0;
  S.m[id] = stat;
}

/**
 * Kiest n vragen, met voorrang voor lage bakjes (plus wat toeval).
 * @param {Question[]} pool
 * @param {number} n
 */
function weighted(pool, n) {
  return pool
    .map(q => ({ q, r: box(q.id) + Math.random() * 1.6 }))
    .sort((a, b) => a.r - b.r)
    .slice(0, n)
    .map(x => x.q);
}

/** Gemiddeld bakje als fractie van 0 tot 1. @param {Question[]} pool */
function mastery(pool) {
  if (!pool.length) return 0;
  return pool.reduce((sum, q) => sum + box(q.id), 0) / (3 * pool.length);
}

/* ---------- XP en levels ---------- */

const TITLES = ['Stagiair', 'Script-schrijver', 'Junior dev', 'Junior+ dev', 'Medior dev', 'Medior+ dev', 'Senior dev', 'Staff engineer', 'Principal engineer', 'CTO-materiaal'];
const XP_PER_LEVEL = 400;

function levelInfo() {
  const level = Math.floor(S.xp / XP_PER_LEVEL);
  return {
    number: level + 1,
    title: TITLES[Math.min(level, TITLES.length - 1)],
    progress: (S.xp % XP_PER_LEVEL) / XP_PER_LEVEL,
  };
}

loadState();
