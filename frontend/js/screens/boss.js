/* ---------- gevecht met de draak (kaart) ----------
   Aan het eind van elke wereld wacht een draak. Je verslaat hem met vragen uit alle lessen van die week:
   - goed antwoord: Stampy stempelt raak en de draak verliest 1 HP (2 HP bij 3 of meer goed op rij);
   - fout antwoord: de draak spuwt vuur en Stampy verliest een leven (uitlegvragen kosten nooit een leven);
   - de draak heeft DRAGON_HP levenspunten, Stampy heeft er 3.
   Win je, dan is de wereld bevrijd en gaat de volgende wereld open (recordDragon).
   Zit de draak nog op slot, dan mag je hem wel bekijken, maar niet bevechten. */

/** Levens van Stampy in een gevecht. */
const BOSS_LIVES = 3;
/** XP per goed antwoord, en per goed antwoord tijdens een combo. */
const BOSS_XP = 20;
const BOSS_XP_COMBO = 30;

/**
 * Het lopende gevecht, of null.
 * @type {null | { week: number, phase: 'intro' | 'fight' | 'end' | 'locked', hp: number, lives: number, streak: number,
 *   bestStreak: number, hits: number, misses: number, asked: number, xp: number, queue: PlayItem[], last: string,
 *   timers: number[], bot: any, sayTimer: number }}
 */
let B = null;

const bossCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BOSS_ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z" fill="currentColor"/>',
  stamp: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="#FFC93D" stroke="#131A2F" stroke-width="2"/><path d="M9 14.5l3.2 3.2L19 10.5" fill="none" stroke="#131A2F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  combo: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M15 3L6 16h7l-1 9 9-13h-7z" fill="#FFD84A" stroke="#131A2F" stroke-width="2" stroke-linejoin="round"/></svg>',
  fire: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3c1 5 7 7 7 14a7 7 0 01-14 0c0-4 2-6 3-8 1 3 2 4 3 4 0-4-1-6 1-10z" fill="#FF6A2B" stroke="#131A2F" stroke-width="2" stroke-linejoin="round"/><path d="M14 15c2 2 3 3 3 5a3 3 0 01-6 0c0-2 2-3 3-5z" fill="#FFC93D"/></svg>',
  book: '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 6c3.5-1.5 7-1.5 10 .5v16c-3-2-6.5-2-10-.5zM24 6c-3.5-1.5-7-1.5-10 .5v16c3-2 6.5-2 10-.5z" fill="#A9B8FF" stroke="#131A2F" stroke-width="2" stroke-linejoin="round"/></svg>',
};

/** Stempelafdruk van Stampy op de draak. */
const BOSS_STAMP_MARK = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="rgba(255,226,122,.92)" stroke="#C23052" stroke-width="5"/><circle cx="32" cy="32" r="20" fill="none" stroke="#C23052" stroke-width="2" stroke-dasharray="4 3"/><path d="M21 33l7.5 7.5L44 25" fill="none" stroke="#C23052" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Voert iets later uit, maar alleen als dit gevecht dan nog loopt. @param {() => void} fn @param {number} ms */
function bossLater(fn, ms) {
  const fight = B;
  if (!fight) return;
  fight.timers.push(setTimeout(() => { if (B === fight) fn(); }, ms));
}

/**
 * Start het gevecht met de draak van een wereld. Zit hij nog op slot, dan zie je hem slapen
 * en lees je wat je eerst moet doen.
 * @param {number} week
 */
function startBoss(week) {
  week = Number(week);
  if (!DRAGONS[week - 1]) return;
  leaveBoss();
  const locked = !dragonUnlocked(week);
  B = {
    week, phase: locked ? 'locked' : 'intro', hp: DRAGON_HP, lives: BOSS_LIVES, streak: 0, bestStreak: 0,
    hits: 0, misses: 0, asked: 0, xp: 0, queue: [], last: '', timers: [], bot: null, sayTimer: 0,
  };
  renderBossScreen();
  showScreen('boss');
  if (locked) {
    toast(dragonLockText(week));
    renderBossLocked();
  } else {
    renderBossIntro();
  }
}

/** Stopt een lopend gevecht (bijvoorbeeld bij de terugknop): timers weg, Stampy opgeruimd. */
function leaveBoss() {
  if (!B) return;
  B.timers.forEach(clearTimeout);
  clearTimeout(B.sayTimer);
  if (B.bot) B.bot.destroy();
  B = null;
  const fx = document.getElementById('bossFx');
  if (fx) fx.innerHTML = '';
}

/* ---------- scherm ---------- */

function renderBossScreen() {
  const d = dragonOf(B.week);
  const scene = d.glyphs.map((g, i) => {
    const [x, y, s] = [[8, 16, 13], [36, 30, 11], [16, 46, 12]][i];
    return `<text x="${x}%" y="${y}%" font-size="${s}">${esc(g)}</text>`;
  }).join('');
  $('#boss').innerHTML = `<div class="boss" style="--wc:${hue(B.week)}">
    <div class="boss-top">
      <button class="rbtn" type="button" id="bossQuit" aria-label="${B.phase === 'locked' ? 'Terug' : 'Gevecht stoppen'}">${BOSS_ICON.back}</button>
      <div class="grow">
        <span class="boss-kicker">Wereld ${B.week} · Eindbaas</span>
        <span class="boss-streak" id="bossStreak" aria-live="polite"></span>
      </div>
      <div class="hearts" id="bossHearts" role="img"></div>
    </div>
    <div class="boss-main">
      <div class="boss-arena">
        <div class="boss-plate glass">
          <div class="boss-plate-row"><h1 class="boss-name">${esc(d.name)}</h1><span class="boss-hptext" id="bossHpText"></span></div>
          <p class="boss-title">${esc(d.title)}</p>
          <div class="boss-hpbar" id="bossHp" role="progressbar" aria-label="Levenspunten van de ${esc(d.name)}" aria-valuemin="0" aria-valuemax="${DRAGON_HP}"><i></i></div>
        </div>
        <div class="boss-stage" id="bossStage">
          <svg class="boss-scene" aria-hidden="true">${scene}</svg>
          <div class="boss-dragon" id="bossDragon"></div>
          <p class="boss-say" id="bossSay" aria-hidden="true"></p>
          <div class="boss-stampy" id="bossBot"></div>
          <div class="boss-fx" id="bossFx" aria-hidden="true"></div>
        </div>
      </div>
      <div class="boss-panel glass" id="bossPanel" tabindex="-1"></div>
    </div>
    <p class="sr-only" id="bossLive" aria-live="polite"></p>
  </div>`;
  B.bot = mountBot($('#bossBot'), { bubble: true });
  $('#bossQuit').addEventListener('click', quitBoss);
  setDragon('sleep');
  renderBossStatus();
}

/** Tekent de draak opnieuw in een staat (de HP bepaalt hoe gehavend hij is). @param {string} state */
function setDragon(state) {
  const host = document.getElementById('bossDragon');
  if (!host || !B) return;
  host.innerHTML = dragonSVG(B.week, { state: /** @type {any} */ (state), hp: B.hp });
}

/** De rusthouding: duizelig bij weinig HP, anders klaar voor het gevecht. */
const bossRest = () => (B && B.hp <= Math.ceil(DRAGON_HP / 4) ? 'dizzy' : 'idle');

/** HP-balk, levens en reeks bijwerken. @param {boolean} [lostLife] */
function renderBossStatus(lostLife = false) {
  if (!B) return;
  const frac = B.hp / DRAGON_HP;
  const bar = $('#bossHp');
  bar.setAttribute('aria-valuenow', String(B.hp));
  bar.setAttribute('aria-valuetext', `${B.hp} van ${DRAGON_HP}`);
  bar.dataset.level = frac > .5 ? 'high' : frac > .25 ? 'mid' : 'low';
  /** @type {HTMLElement} */ (bar.firstElementChild).style.width = (frac * 100) + '%';
  $('#bossHpText').textContent = `${B.hp} / ${DRAGON_HP} HP`;

  const hearts = $('#bossHearts');
  hearts.setAttribute('aria-label', `${B.lives} van ${BOSS_LIVES} levens`);
  hearts.innerHTML = Array.from({ length: BOSS_LIVES }, (_, k) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" class="${k < B.lives ? '' : 'lost'}${lostLife && k === B.lives ? ' pop' : ''}">${BOSS_ICON.heart}</svg>`).join('');

  const streak = $('#bossStreak');
  if (B.phase !== 'fight' || B.streak < 2) streak.innerHTML = '';
  else if (B.streak === 2) streak.textContent = '2 goed op rij. Nog 1 voor dubbele schade!';
  else streak.innerHTML = `<span class="combo pop">Combo: ${B.streak} op rij · dubbele schade</span>`;
}

/** Tekstballon van de draak. @param {string} text @param {number} [ms] */
function dragonSay(text, ms = 2800) {
  const el = document.getElementById('bossSay');
  if (!el || !B) return;
  el.textContent = text;
  el.classList.add('on');
  clearTimeout(B.sayTimer);
  B.sayTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/** Meldt iets aan schermlezers. @param {string} text */
const bossAnnounce = text => { const el = document.getElementById('bossLive'); if (el) el.textContent = text; };

/* ---------- op slot: wel kijken, nog niet spelen ---------- */

function renderBossLocked() {
  const d = dragonOf(B.week);
  const open = worldOpen(B.week);
  const levels = worldLevels(B.week);
  const pips = levels.map((l, i) => `<span class="${levelDone(l.id) ? 'done' : ''}" title="${esc(l.title)}">${i + 1}<span class="sr-only">: ${esc(l.title)}, ${levelDone(l.id) ? 'gehaald' : 'nog niet gehaald'}</span></span>`).join('');
  $('#bossPanel').innerHTML = `<div class="boss-intro">
      <span class="badge lock">Op slot</span>
      <h2>De ${esc(d.name)} slaapt nog</h2>
      <p>${esc(dragonLockText(B.week))}</p>
      ${open ? `<div class="boss-pips" aria-label="Levels van wereld ${B.week}">${pips}</div>` : ''}
      <p>Hij bewaakt alles uit week ${B.week}: ${esc(weekOf(B.week).title)}. Zodra je erlangs mag, wordt hij wakker.</p>
      <div class="boss-btns"><button class="cta blue" type="button" id="bossToMap">Naar de kaart</button></div>
    </div>`;
  $('#bossToMap').addEventListener('click', () => navigate('#/kaart/' + B.week));
  B.bot.set('think');
  bossLater(() => B.bot.say(open ? 'Eerst de levels, dan de draak.' : 'Deze wereld zit nog op slot.'), 500);
  focusBossPanel();
}

/* ---------- intro ---------- */

function renderBossIntro() {
  const d = dragonOf(B.week);
  const again = dragonDefeated(B.week);
  $('#bossPanel').innerHTML = `<div class="boss-intro">
      <span class="badge">Eindbaas · wereld ${B.week}</span>
      <h2>${again ? 'Revanche tegen' : 'Versla'} de ${esc(d.name)}</h2>
      <p>Hij bewaakt alles uit week ${B.week}: ${esc(weekOf(B.week).title)}. De vragen komen uit alle lessen van deze week.</p>
      <ul class="boss-rules">
        <li>${BOSS_ICON.stamp}<span><b>Goed:</b> Stampy stempelt raak, de draak verliest 1 HP.</span></li>
        <li>${BOSS_ICON.combo}<span><b>3 goed op rij:</b> combo, dubbele schade.</span></li>
        <li>${BOSS_ICON.fire}<span><b>Fout:</b> vuur! Je verliest een leven. Je hebt er ${BOSS_LIVES}.</span></li>
        <li>${BOSS_ICON.book}<span>Uitlegvragen kosten nooit een leven.</span></li>
      </ul>
      <div class="boss-btns"><button class="cta" type="button" id="bossStart">Start het gevecht</button></div>
    </div>`;
  $('#bossStart').addEventListener('click', beginFight);
  B.bot.set('think');
  // De draak wordt wakker en brult een zinnetje.
  bossLater(() => {
    setDragon('idle');
    dragonSay(dragonLine(B.week, 'intro'), 4200);
    bossAnnounce(`De ${d.name} is wakker.`);
  }, bossCalm() ? 200 : 900);
  bossLater(() => B.bot.say('Daar is hij. Ik ben er klaar voor!'), bossCalm() ? 400 : 1800);
  if (!isTouch()) setTimeout(() => { const b = document.getElementById('bossStart'); if (b) b.focus({ preventScroll: true }); }, 60);
}

function beginFight() {
  if (!B) return;
  B.phase = 'fight';
  B.bot.set('neutral');
  setDragon(bossRest());
  nextBossQuestion();
}

/* ---------- vragen ---------- */

/** Pakt de volgende vraag: zwakke vragen eerst (weighted), zonder dezelfde vraag twee keer achter elkaar. */
function pickBossItem() {
  if (!B.queue.length) {
    const pool = dragonPool(B.week);
    B.queue = weighted(pool, pool.length);
    if (B.queue.length > 1 && B.queue[0].id === B.last) B.queue.push(B.queue.shift());
  }
  const item = B.queue.shift();
  B.last = item.id;
  return item;
}

function nextBossQuestion() {
  if (!B) return;
  const item = pickBossItem();
  B.asked++;
  const panel = $('#bossPanel');
  panel.innerHTML = `<div class="boss-qhead"><span>Vraag ${B.asked}</span><span>${B.hp} HP te gaan</span></div><div class="boss-item" id="bossItem"></div>`;
  renderPlayItem($('#bossItem'), item, { onAnswer: r => answerBoss(item, r) });
  renderBossStatus();
  focusBossPanel();
}

/** Zet de focus op het paneel, zodat Tab en de sneltoetsen meteen bij de vraag beginnen. */
function focusBossPanel() {
  const panel = document.getElementById('bossPanel');
  if (panel && !isTouch()) panel.focus({ preventScroll: true });
}

/**
 * Verwerkt een antwoord: schade aan de draak of vuur op Stampy, daarna de feedback-sheet.
 * @param {PlayItem} item @param {AnswerResult} r
 */
function answerBoss(item, r) {
  if (!B || B.phase !== 'fight') return;
  recordAnswer(item.id, r.outcome);
  markPlayed();
  const d = dragonOf(B.week);
  let title;

  if (r.outcome === 'right') {
    B.streak++;
    B.bestStreak = Math.max(B.bestStreak, B.streak);
    const combo = B.streak >= 3;
    const dmg = combo ? 2 : 1;
    B.hp = Math.max(0, B.hp - dmg);
    B.hits++;
    const gain = combo ? BOSS_XP_COMBO : BOSS_XP;
    B.xp += gain;
    S.xp += gain;
    if (combo) title = 'Combo! Dubbele schade';
    bossHit(dmg, combo);
    bossAnnounce(`Raak! De ${d.name} heeft nog ${B.hp} van ${DRAGON_HP} HP.`);
  } else if (r.open) {
    // Uitlegvragen beoordeel je zelf: geen schade en geen leven kwijt.
    title = r.outcome === 'almost' ? 'Bijna, de draak ontwijkt je' : 'Mis, maar het kost geen leven';
    B.bot.react('think', 'Uitlegvragen kosten geen leven.');
    dragonSay('Hah, net mis!', 2000);
    bossAnnounce('Geen schade. Uitlegvragen kosten geen leven.');
  } else {
    B.streak = 0;
    B.lives = Math.max(0, B.lives - 1);
    B.misses++;
    bossFire();
    bossAnnounce(`Au, vuur! Je hebt nog ${B.lives} van ${BOSS_LIVES} levens.`);
  }
  save();
  renderHud();
  renderBossStatus(r.outcome !== 'right' && !r.open);
  showStageIfHidden();

  const done = B.hp <= 0 || B.lives <= 0;
  const nextLabel = B.hp <= 0 ? 'Bekijk je overwinning' : B.lives <= 0 ? 'Bekijk de uitslag' : 'Volgende vraag';
  bossLater(() => showSheet({ item, result: r, title, nextLabel, onNext: afterBossAnswer }), bossCalm() ? 250 : done ? 1300 : 950);
}

/** Na de sheet: verder vechten, of de uitslag. */
function afterBossAnswer() {
  if (!B || B.phase !== 'fight') return;
  if (B.hp <= 0) bossWon();
  else if (B.lives <= 0) bossLost();
  else nextBossQuestion();
}

/** Op een telefoon staat de arena soms buiten beeld als je onderaan antwoordt: scroll hem terug in beeld. */
function showStageIfHidden() {
  const stage = document.getElementById('bossStage');
  if (!stage) return;
  const r = stage.getBoundingClientRect();
  if (r.bottom < r.height * .6 || r.top > innerHeight) window.scrollTo({ top: 0, behavior: bossCalm() ? 'auto' : 'smooth' });
}

/* ---------- effecten ---------- */

/** Een punt op een element, als fractie van de breedte en hoogte, in coördinaten van de arena. */
function bossPoint(el, fx, fy) {
  const s = $('#bossStage').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - s.left + r.width * fx, y: r.top - s.top + r.height * fy };
}

/** Zet een effect in de arena en haalt het na afloop weer weg. @param {string} html @param {number} ms */
function bossFx(html, ms) {
  const fx = document.getElementById('bossFx');
  if (!fx) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const el = /** @type {HTMLElement} */ (wrap.firstElementChild);
  fx.appendChild(el);
  bossLater(() => el.remove(), ms);
}

/** Stampy valt aan: een stempelstraal naar de draak, die flitst, schudt en HP verliest. @param {number} dmg @param {boolean} combo */
function bossHit(dmg, combo) {
  const d = dragonOf(B.week);
  sfx(combo ? 'combo' : 'ok');
  B.bot.react(combo ? 'combo' : 'ok', combo ? randomOf(['Combo! Dubbele stempel!', 'Drie op rij!', 'Nu gaat ie hard!']) : randomOf(['Stempel erop!', 'Raak!', 'Goedgekeurd!']));
  const calm = bossCalm();
  if (!calm) {
    const bot = $('#bossBot svg'), dragon = $('#bossDragon svg');
    const a = bossPoint(bot, .5, .62), b = bossPoint(dragon, .56, .66);
    const dx = b.x - a.x, dy = b.y - a.y;
    bossFx(`<i class="boss-beam" style="left:${a.x}px;top:${a.y}px;width:${Math.hypot(dx, dy).toFixed(0)}px;--a:${Math.atan2(dy, dx).toFixed(3)}rad"></i>`, 700);
    bossFx(`<span class="boss-stamp" style="left:${b.x}px;top:${b.y}px">${BOSS_STAMP_MARK}</span>`, 1200);
    bossFx(`<b class="boss-dmg${combo ? ' combo' : ''}" style="left:${b.x}px;top:${(b.y - 40).toFixed(0)}px">-${dmg}</b>`, 1200);
  }
  bossLater(() => {
    setDragon('hurt');
    dragonSay(B.hp <= 0 ? dragonLine(B.week, 'lose') : B.hp <= Math.ceil(DRAGON_HP / 4) ? dragonLine(B.week, 'low') : dragonLine(B.week, 'hit'), 2400);
  }, calm ? 0 : 220);
  bossLater(() => {
    setDragon(B.hp <= 0 ? 'defeated' : bossRest());
    if (B.hp <= 0) bossAnnounce(`De ${d.name} gaat neer!`);
  }, calm ? 600 : 820);
}

/** De draak valt aan: vuur naar Stampy, die een leven verliest. */
function bossFire() {
  sfx('bad');
  setDragon('attack');
  dragonSay(dragonLine(B.week, 'miss'), 2400);
  const calm = bossCalm();
  if (!calm) {
    const dragon = $('#bossDragon svg'), bot = $('#bossBot svg');
    const a = bossPoint(dragon, -0.1, .52), b = bossPoint(bot, .5, .5);
    bossFx(`<i class="boss-fireball" style="left:${a.x}px;top:${a.y}px;--dx:${(b.x - a.x).toFixed(0)}px;--dy:${(b.y - a.y).toFixed(0)}px"></i>`, 600);
    bossLater(() => bossFx(`<i class="boss-burn" style="left:${b.x}px;top:${b.y}px"></i>`, 700), 430);
  }
  bossLater(() => {
    const host = document.getElementById('bossBot');
    if (host) { host.classList.remove('hit'); void host.offsetWidth; host.classList.add('hit'); }
    B.bot.react('no', B.lives > 0 ? randomOf(['Au, heet!', 'Oei. Lees de uitleg even.', 'Dat brandde.']) : 'Mijn schild is op...');
  }, calm ? 0 : 450);
  bossLater(() => setDragon(bossRest()), calm ? 700 : 1150);
}

/* ---------- uitslag ---------- */

function bossWon() {
  const d = dragonOf(B.week);
  const first = !dragonDefeated(B.week);
  recordDragon(B.week);
  const bonus = (first ? 150 : 50) + 25 * B.lives;
  B.xp += bonus;
  S.xp += bonus;
  save();
  renderHud();
  B.phase = 'end';
  renderBossStatus();
  setDragon('defeated');
  sfx('win');
  confetti();
  B.bot.react('win', 'We hebben hem! Wereld bevrijd!');
  dragonSay(dragonLine(B.week, 'lose'), 4000);

  const last = B.week >= WEEKS.length;
  const nextWeek = weekOf(B.week + 1);
  const news = last
    ? 'Alle zes draken zijn verslagen. Het hele eiland is bevrijd: je bent klaar voor productie!'
    : first ? `Wereld ${B.week + 1} is open: ${nextWeek.title}.` : `Je versloeg de ${d.name} opnieuw. Wereld ${B.week + 1} wacht op je: ${nextWeek.title}.`;
  $('#bossPanel').innerHTML = `<div class="boss-end">
      <span class="badge win">Draak verslagen</span>
      <h2 id="bossEndTitle" tabindex="-1">${last ? 'Het eiland is bevrijd!' : `Wereld ${B.week} bevrijd!`}</h2>
      <p>${esc(news)}</p>
      <div class="rgrid">
        <div class="rstat"><b>${B.hits}</b><small>keer raak</small></div>
        <div class="rstat"><b>${B.lives}/${BOSS_LIVES}</b><small>levens over</small></div>
        <div class="rstat"><b>+${B.xp}</b><small>XP</small></div>
      </div>
      <div class="boss-btns">
        <button class="cta" type="button" id="bossMap">Naar de kaart</button>
        <button class="cta blue" type="button" id="bossBack">Terug</button>
      </div>
    </div>`;
  const target = last ? B.week : B.week + 1;
  $('#bossMap').addEventListener('click', () => navigate('#/kaart/' + target));
  $('#bossBack').addEventListener('click', () => goHome());
  bossAnnounce(`Gewonnen! ${news}`);
  $('#bossEndTitle').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: bossCalm() ? 'auto' : 'smooth' });
}

function bossLost() {
  const d = dragonOf(B.week);
  B.phase = 'end';
  renderBossStatus();
  sfx('lose');
  setDragon(bossRest());
  dragonSay(dragonLine(B.week, 'win'), 4000);
  B.bot.react('no', 'Volgende keer pakken we hem.');
  bossLater(() => B.bot.set('sad'), 2300);
  const canPractice = typeof startGame === 'function';
  $('#bossPanel').innerHTML = `<div class="boss-end">
      <span class="badge lose">Levens op</span>
      <h2 id="bossEndTitle" tabindex="-1">De draak wint deze keer</h2>
      <p>De ${esc(d.name)} heeft nog ${B.hp} van ${DRAGON_HP} HP. Oefenen helpt echt: de vragen die je fout had, komen bij het oefenen vaker terug, en bij elke vraag staat een link naar de les.</p>
      <div class="rgrid">
        <div class="rstat"><b>${B.hits}</b><small>keer raak</small></div>
        <div class="rstat"><b>${DRAGON_HP - B.hp}</b><small>HP schade</small></div>
        <div class="rstat"><b>+${B.xp}</b><small>XP</small></div>
      </div>
      <div class="boss-btns">
        <button class="cta" type="button" id="bossAgain">Opnieuw</button>
        <button class="cta blue" type="button" id="bossMap">Naar de kaart</button>
        ${canPractice ? `<button class="boss-link" type="button" id="bossPractice">Eerst week ${B.week} oefenen</button>` : ''}
      </div>
    </div>`;
  const week = B.week;
  $('#bossAgain').addEventListener('click', () => startBoss(week));
  $('#bossMap').addEventListener('click', () => navigate('#/kaart/' + week));
  if (canPractice) $('#bossPractice').addEventListener('click', () => { leaveBoss(); startGame('quiz', week); });
  bossAnnounce(`Verloren. De ${d.name} heeft nog ${B.hp} HP.`);
  $('#bossEndTitle').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: bossCalm() ? 'auto' : 'smooth' });
}

/** De terugknop: midden in een gevecht eerst even vragen. */
async function quitBoss() {
  if (B && B.phase === 'fight' && B.asked > 0 && typeof confirmDialog === 'function') {
    const stop = await confirmDialog({
      title: 'Gevecht stoppen?',
      text: `De ${dragonOf(B.week).name} krijgt dan al zijn HP terug. Je XP en je antwoorden blijven bewaard.`,
      ok: 'Stoppen', cancel: 'Doorvechten',
    });
    if (!stop) return;
  }
  goHome();
}
