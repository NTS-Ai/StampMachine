/* ---------- kaart: werelden, levels en draken ----------
   Elke week is een wereld. De lessen van die week zijn de levels; aan het eind van elke
   wereld wacht een draak. Je mag alles bekijken, maar spelen kan pas als het vorige gehaald is:
   - level 1 van wereld 1 is altijd open;
   - het volgende level gaat open als het vorige minstens 1 ster heeft;
   - de draak gaat open als alle levels van de wereld gehaald zijn;
   - een nieuwe wereld gaat open als de draak van de vorige wereld verslagen is.
   Voortgang staat in S.map (sterren per level) en S.dragons (verslagen draken). */

/** Hoeveel vragen een level heeft (minder als de les er minder heeft). */
const LEVEL_SIZE = 8;
/** Hoeveel raak je moet slaan om een draak te verslaan. */
const DRAGON_HP = 12;

/**
 * @typedef {Object} Level
 * @property {string} id        Sectie-id, bijvoorbeeld "1.2"; ook de sleutel in S.map.
 * @property {number} week
 * @property {number} index     0-gebaseerde positie in de wereld.
 * @property {string} title
 */

/** De levels van een wereld: alle lessen van de week met vragen, behalve de losse eindopdracht (N.A). @param {number} week @returns {Level[]} */
function worldLevels(week) {
  const w = weekOf(week);
  if (!w) return [];
  return (w.sections || [])
    .filter(s => !/\.A$/.test(s.id))
    .map((s, index) => ({ id: s.id, week, index, title: s.title }));
}

/** @param {string} id */
const levelStars = id => (S.map && S.map[id]) || 0;
/** @param {string} id */
const levelDone = id => levelStars(id) > 0;
/** @param {number} week */
const dragonDefeated = week => !!(S.dragons && S.dragons[week]);

/** Een wereld is open als het de eerste is of als de draak van de vorige wereld verslagen is. @param {number} week */
const worldOpen = week => week === 1 || dragonDefeated(week - 1);

/** @param {Level} level */
function levelUnlocked(level) {
  if (!worldOpen(level.week)) return false;
  if (level.index === 0) return true;
  const prev = worldLevels(level.week)[level.index - 1];
  return !!prev && levelDone(prev.id);
}

/** De draak is te bevechten als alle levels van zijn wereld gehaald zijn. @param {number} week */
const dragonUnlocked = week => worldOpen(week) && worldLevels(week).every(l => levelDone(l.id));

/** Hoe ver ben je in een wereld: gehaalde levels en of de draak verslagen is. @param {number} week */
function worldProgress(week) {
  const levels = worldLevels(week);
  const done = levels.filter(l => levelDone(l.id)).length;
  const stars = levels.reduce((n, l) => n + levelStars(l.id), 0);
  return { levels: levels.length, done, stars, maxStars: levels.length * 3, dragon: dragonDefeated(week) };
}

/**
 * De volgende stap op de kaart: het eerste level dat open maar nog niet gehaald is, anders de draak.
 * @returns {{ type: 'level', level: Level } | { type: 'dragon', week: number } | { type: 'done' }}
 */
function nextStep() {
  for (const w of WEEKS) {
    if (!worldOpen(w.week)) break;
    const open = worldLevels(w.week).find(l => !levelDone(l.id));
    if (open) return { type: 'level', level: open };
    if (!dragonDefeated(w.week)) return { type: 'dragon', week: w.week };
  }
  return { type: 'done' };
}

/** De wereld waar je nu bent (voor de kaart en de home). */
function currentWorld() {
  const step = nextStep();
  if (step.type === 'level') return step.level.week;
  if (step.type === 'dragon') return step.week;
  return WEEKS.length;
}

/** Totalen voor de home en het profiel. */
function mapTotals() {
  const all = WEEKS.flatMap(w => worldLevels(w.week));
  return {
    levels: all.length,
    done: all.filter(l => levelDone(l.id)).length,
    stars: all.reduce((n, l) => n + levelStars(l.id), 0),
    dragons: WEEKS.filter(w => dragonDefeated(w.week)).length,
  };
}

/** Sterren voor een gespeeld level: 3 zonder fouten, 2 met één fout, anders 1. @param {number} mistakes */
const starsFor = mistakes => mistakes <= 0 ? 3 : mistakes === 1 ? 2 : 1;

/** Bewaart het beste resultaat van een level. @param {string} id @param {number} stars */
function recordLevel(id, stars) {
  if (!S.map) S.map = {};
  S.map[id] = Math.max(levelStars(id), Math.max(1, Math.min(3, stars)));
  save();
}

/** @param {number} week */
function recordDragon(week) {
  if (!S.dragons) S.dragons = {};
  S.dragons[week] = true;
  save();
}

/**
 * Vragen voor een level: quiz- en typvragen en puzzels van die les.
 * @param {string} id
 * @returns {(Question | Puzzle)[]}
 */
const levelPool = id => [...ALLQ, ...ALLT, ...ALLP].filter(q => q.section === id);

/** Alle vragen van een wereld, voor het gevecht met de draak. @param {number} week */
const dragonPool = week => [...ALLQ, ...ALLT, ...ALLP].filter(q => q.week === week);

/* ---------- oefenen (gedeeld door home, oefenen en zoeken) ---------- */

/** Vragen uit quiz en typ-modus die je laatst fout had. */
const weakItems = () => ALLQ.concat(ALLT).filter(isWeak);

/** Aantal typvragen in een week: de typvragen uit de quiz plus de extra typvragen. @param {Week} w */
const typingCount = w => w.questions.filter(q => q.type === 'type').length + w.typing.length;
