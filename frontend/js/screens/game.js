/* ---------- spelen: quiz, speedrun, eindbaas, zwakke plekken en typen ----------
   In de stijl van het ontwerp: vraag als titel, antwoorden als dikke 3D-tegels, feedback als
   groen/rood paneel en Stampy in de hoek die meeleeft met goed, fout en combo's. */

/** @typedef {'quiz' | 'speed' | 'boss' | 'retry' | 'type'} GameMode */
/** @typedef {'right' | 'almost' | 'wrong'} Outcome */

/**
 * Eén knop bij een meerkeuze- of waar/niet-waar-vraag.
 * @typedef {Object} Option
 * @property {string} text
 * @property {boolean} ok
 * @property {number} index  Positie in [correct, ...wrong]; 0 is het goede antwoord, -1 bij waar/niet waar.
 */

/**
 * @typedef {Object} Game
 * @property {GameMode} mode
 * @property {number} week          0 = alle weken
 * @property {Question[]} queue
 * @property {number} idx
 * @property {number} firstLen      Lengte van de eerste ronde; daarna volgen herkansingen.
 * @property {number} score
 * @property {number} streak
 * @property {number} best
 * @property {number} correct
 * @property {number} almost
 * @property {number} answered
 * @property {Question[]} mistakes
 * @property {Set<string>} requeued
 * @property {number} hearts
 * @property {number} hp
 * @property {boolean} locked       True zodra de huidige vraag beoordeeld is.
 * @property {boolean} revealed     Zinvraag: het modelantwoord staat in beeld.
 * @property {number} qStart
 * @property {number} end           Speedrun: eindtijd.
 * @property {number} pausedAt      0 = loopt; anders het moment van pauzeren.
 * @property {Option[]} opts
 */

const MODES = { quiz: 'Quiz', speed: 'Speedrun · 60 s', boss: 'Eindbaas', retry: 'Zwakke plekken', type: 'Typen' };
const Q_TIME = 20000;
const SPEED_TIME = 60000;
const BOSS_HP = 25;
const QUIZ_LEN = 12;
const TYPE_LEN = 10;

/** Wat Stampy zegt als een ronde begint. */
const MODE_INTRO = {
  quiz: 'Twaalf vragen, met uitleg na elke vraag.',
  speed: 'Zestig seconden. Zo veel mogelijk goed!',
  type: 'Typ het antwoord. Een kleine typfout mag.',
  retry: 'Je zwakke plekken. Nu gaan ze erin.',
  boss: 'De pager gaat! Drie levens, 25 keer raak.',
};

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z" fill="currentColor"/></svg>';

/** Het lopende spel, of null. @type {Game | null} */
let G = null;
/** @type {number | undefined} */
let tick;
/** Stampy in de hoek van het spelscherm; pas getekend bij het eerste spel. @type {any} */
let playBot = null;

/* ---------- regels per modus ---------- */

/**
 * Welke vragen horen bij een modus en week.
 * @param {GameMode} mode
 * @param {number} week
 */
function poolFor(mode, week) {
  const w = week ? weekOf(week) : null;
  const questions = w ? w.questions : ALLQ;
  if (mode === 'type') return questions.filter(q => q.type === 'type').concat(w ? w.typing : ALLT);
  if (mode === 'speed') return questions.filter(q => q.type !== 'type');
  return questions;
}

/** In de typ-modus is er geen tijdsdruk. @param {GameMode} mode */
const hasTimer = mode => mode !== 'type';
/** Foute vragen komen aan het eind van de ronde nog één keer terug. @param {GameMode} mode */
const requeues = mode => mode === 'quiz' || mode === 'retry' || mode === 'type';
/** @param {GameMode} mode @param {Question} q */
const usesSpeedBonus = (mode, q) => (mode === 'quiz' || mode === 'retry' || mode === 'boss') && q.type !== 'sentence';

/** Combo-vermenigvuldiger: 3, 6 en 10 op rij geven ×2, ×3 en ×4. */
function mult() {
  const s = G.streak;
  return s >= 10 ? 4 : s >= 6 ? 3 : s >= 3 ? 2 : 1;
}

/** Laat Stampy reageren (als hij er is). @param {'ok' | 'no' | 'combo' | 'think' | 'win'} kind @param {string} [text] */
function cheer(kind, text) {
  if (playBot) playBot.react(kind, text);
}

/* ---------- starten en klok ---------- */

/**
 * @param {GameMode} mode
 * @param {number} week   0 = alle weken
 * @param {Question[]} [list]  Vaste lijst, bijvoorbeeld je fouten.
 */
function startGame(mode, week, list) {
  const pool = poolFor(mode, week);
  let queue;
  if (list) queue = list;
  else if (mode === 'quiz') queue = weighted(pool, QUIZ_LEN);
  else if (mode === 'type') queue = weighted(pool, TYPE_LEN);
  else queue = weighted(pool, pool.length);

  G = {
    mode, week, queue, idx: 0, firstLen: queue.length,
    score: 0, streak: 0, best: 0, correct: 0, almost: 0, answered: 0,
    mistakes: [], requeued: new Set(), hearts: 3, hp: BOSS_HP,
    locked: false, revealed: false, qStart: 0, end: 0, pausedAt: 0, opts: [],
  };

  $('#modeTag').textContent = MODES[mode] + (week ? ' · Week ' + week : mode === 'retry' ? '' : ' · alle weken');
  $('#hearts').hidden = mode !== 'boss';
  $('#bossbar').hidden = mode !== 'boss';
  $('#timer').hidden = !hasTimer(mode);
  $('#timeLeft').hidden = mode !== 'speed';
  $('#timeLeft').textContent = SPEED_TIME / 1000 + ' s';
  $('#score').textContent = '0';
  $('#combo').hidden = true;
  $('#play').style.setProperty('--wc', hue(week));
  showScreen('play');

  if (!playBot && typeof mountBot === 'function') playBot = mountBot($('#playBot'));
  if (playBot) {
    playBot.stage(currentStreak());
    playBot.set('neutral');
    playBot.say(MODE_INTRO[mode], 2800);
  }

  if (mode === 'speed') G.end = performance.now() + SPEED_TIME;
  clearInterval(tick);
  tick = setInterval(onTick, 100);
  renderQuestion();
}

function onTick() {
  if (!G || G.pausedAt) return;
  const now = performance.now();
  let frac;
  if (G.mode === 'speed') {
    const left = G.end - now;
    if (left <= 0) { finish(); return; }
    frac = left / SPEED_TIME;
    const secs = Math.ceil(left / 1000) + ' s';
    const el = $('#timeLeft');
    if (el.textContent !== secs) el.textContent = secs;
  } else {
    if (G.locked || !hasTimer(G.mode)) return;
    frac = 1 - (now - G.qStart) / Q_TIME;
    // Alleen bij de eindbaas is de tijd echt op; in de quiz bepaalt de balk alleen de bonus.
    if (frac <= 0 && G.mode === 'boss') { answer('wrong', { timeUp: true }); return; }
  }
  frac = Math.min(1, Math.max(0, frac));
  $('#timerFill').style.width = (frac * 100) + '%';
  $('#timer').classList.toggle('low', frac < .25);
}

/** Zet de klok stil, bijvoorbeeld terwijl de stop-dialoog open staat. */
function pauseClock() {
  if (G && !G.pausedAt) G.pausedAt = performance.now();
}

function resumeClock() {
  if (!G || !G.pausedAt) return;
  const paused = performance.now() - G.pausedAt;
  G.qStart += paused;
  G.end += paused;
  G.pausedAt = 0;
}

/* ---------- een vraag tonen ---------- */

/** Wat je bij elk soort vraag moet doen, als klein label boven de vraag. */
const Q_LABEL = {
  choice: 'Kies het goede antwoord',
  truefalse: 'Waar of niet waar?',
  type: 'Typ het antwoord',
  sentence: 'Leg het uit in je eigen woorden',
};

function renderQuestion() {
  const q = G.queue[G.idx];
  G.locked = false;
  G.revealed = false;
  G.qStart = performance.now();
  G.opts = [];

  renderProgress();
  if (G.mode === 'boss') renderBossState();
  if (G.mode !== 'speed') {
    $('#timerFill').style.width = '100%';
    $('#timer').classList.remove('low');
  }

  const isRetry = G.requeued.has(q.id) && G.idx >= G.firstLen;
  const counter = G.mode === 'quiz' || G.mode === 'retry' || G.mode === 'type'
    ? `<span class="q-count">${G.idx + 1} / ${G.queue.length}</span>` : '';
  let h = `<div class="q-meta"><span class="wchip">Week ${q.week}</span>${isRetry ? '<span class="wchip retry">Herkansing</span>' : ''}<span class="qtype">${Q_LABEL[q.type] || ''}</span>${counter}</div>`;
  h += `<h2 class="qtitle" id="qTitle" tabindex="-1">${fmt(q.question)}</h2>`;
  if (q.code) h += `<pre class="code">${typeof playCode === 'function' ? playCode(q.code) : esc(q.code)}</pre>`;
  h += answerArea(q);
  h += '<div id="reveal"></div><div id="fb"></div>';

  const card = $('#qcard');
  card.innerHTML = h;
  card.style.setProperty('--wc', hue(q.week));
  if (playBot && playBot.expr !== 'neutral') playBot.set('neutral');
  bindAnswerArea(q, card);
}

/** Zelfde regel als op de kaart: code en symbolen in een monospace-letter. @param {string} text */
const looksLikeCode = text => /`/.test(text) || /^[\[\]{}()'"0-9.\-]/.test(text);

/** HTML voor de manier van antwoorden: tegels, een regel typen of een zin typen. @param {Question} q */
function answerArea(q) {
  if (q.type === 'choice' || q.type === 'truefalse') {
    G.opts = q.type === 'choice'
      ? shuffle([q.correct, ...q.wrong].map((text, index) => ({ text, ok: index === 0, index })))
      : [{ text: 'Waar', ok: q.answer === true, index: -1 }, { text: 'Niet waar', ok: q.answer === false, index: -1 }];
    // Lange antwoorden (zinnen of code) onder elkaar, korte naast elkaar als dikke tegels.
    const long = G.opts.some(o => o.text.length > 18);
    const cols = long ? 1 : G.opts.length === 4 ? 2 : G.opts.length;
    return `<div class="tiles${long ? ' long' : ''}" style="--cols:${cols}">` + G.opts.map((o, i) =>
      `<button class="tile${looksLikeCode(o.text) ? ' mono' : ''}" type="button" data-i="${i}"><span class="tkey" aria-hidden="true">${i + 1}</span><span>${fmt(o.text)}</span></button>`
    ).join('') + '</div>';
  }
  if (q.type === 'sentence') {
    return `<form class="typein" id="typeForm">
        <textarea class="field" id="typeIn" rows="4" enterkeyhint="done" placeholder="Schrijf je antwoord in een paar zinnen…" aria-label="Je antwoord"></textarea>
        <button class="cta" type="submit">Vergelijk met modelantwoord</button>
      </form>
      <p class="hint typein-hint"><span class="kbd">Enter om te vergelijken, Shift+Enter voor een nieuwe regel. </span>Daarna beoordeel je zelf hoe het ging.</p>`;
  }
  return `<form class="typein" id="typeForm">
      <input class="field" id="typeIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Typ je antwoord…" aria-label="Je antwoord">
      <button class="cta" type="submit">Check</button>
    </form>
    <p class="hint typein-hint"><span class="kbd">Enter om te checken. </span>Leeg laten = ik weet het niet.</p>`;
}

/** @param {Question} q @param {HTMLElement} card */
function bindAnswerArea(q, card) {
  card.querySelectorAll('.tile[data-i]').forEach(b => {
    b.addEventListener('click', () => pick(Number(/** @type {HTMLElement} */ (b).dataset.i)));
  });

  const form = document.querySelector('#typeForm');
  if (!form) {
    // Toetsenbord: de focus naar de nieuwe vraag, zodat Tab bij de antwoorden begint.
    if (!isTouch() && document.activeElement === document.body) $('#qTitle').focus({ preventScroll: true });
    return;
  }
  const field = /** @type {HTMLInputElement | HTMLTextAreaElement} */ ($('#typeIn'));

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (q.type === 'sentence') revealModel();
    else checkTyped();
  });
  if (field instanceof HTMLTextAreaElement) {
    field.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); /** @type {HTMLFormElement} */ (form).requestSubmit(); }
    });
  }

  if (isTouch()) {
    // Op mobiel schuift het toetsenbord omhoog: zorg dat de vraag in beeld blijft.
    field.addEventListener('focus', () => setTimeout(() => card.scrollIntoView({ block: 'start', behavior: 'smooth' }), 300));
  } else {
    setTimeout(() => { if (G && !G.locked) field.focus(); }, 30);
  }
}

/* ---------- antwoorden ---------- */

/** @param {number} i Index van de gekozen tegel. */
function pick(i) {
  if (G.locked) return;
  const chosen = G.opts[i];
  document.querySelectorAll('#qcard .tile[data-i]').forEach((el, j) => {
    const b = /** @type {HTMLButtonElement} */ (el);
    b.disabled = true;
    if (G.opts[j].ok) b.classList.add('ok');
    else if (j === i) b.classList.add('no');
    else b.classList.add('dim');
  });
  answer(chosen.ok ? 'right' : 'wrong', { chosen: chosen.index });
}

/** Maakt een getypt antwoord vergelijkbaar: hoofdletters, spaties, quotes en prompt-tekens tellen niet. @param {string} s */
const normalize = s => String(s).trim().toLowerCase()
  .replace(/^\$\s*/, '')
  .replace(/^[`'"]+|[`'"]+$/g, '')
  .replace(/\s+/g, ' ')
  .replace(/[/:]$/, '');

/**
 * Vergelijkt een getypt antwoord met de goedgekeurde antwoorden.
 * Eén typfout mag bij antwoorden van 6 tekens of meer, tenzij de vraag `exact` is.
 * @param {Question} q
 * @param {string} raw
 * @returns {{ ok: boolean, spelling?: string }}
 */
function matchTyped(q, raw) {
  const v = normalize(raw);
  if (!v) return { ok: false };
  const answers = q.answers.map(a => ({ a, n: normalize(a) }));
  if (answers.some(({ n }) => v === n || v.startsWith(n + ' '))) return { ok: true };
  if (!q.exact) {
    const close = answers.find(({ n }) => n.length >= 6 && editDistance(v, n) <= 1);
    if (close) return { ok: true, spelling: close.a };
  }
  return { ok: false };
}

function checkTyped() {
  if (G.locked) return;
  const q = G.queue[G.idx];
  const input = /** @type {HTMLInputElement} */ ($('#typeIn'));
  const result = matchTyped(q, input.value);
  input.classList.add(result.ok ? 'ok' : 'no');
  answer(result.ok ? 'right' : 'wrong', { spelling: result.spelling });
}

/** Zinvraag: toont het modelantwoord en de tegels om jezelf te beoordelen. */
function revealModel() {
  if (G.locked || G.revealed) return;
  G.revealed = true;
  const q = G.queue[G.idx];
  disableTyping();
  cheer('think', 'Vergelijk je antwoord eens met dit.');

  const points = q.points && q.points.length
    ? `<span class="plabel">Een goed antwoord noemt</span><ul>${q.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul>`
    : '';
  const reveal = $('#reveal');
  reveal.innerHTML = `<div class="model"><b>Modelantwoord</b><p>${fmt(q.model)}</p>${points}</div>
    <div class="selfrate" id="selfRate">
      <span class="plabel" id="rateLbl">Hoe ging het?</span>
      <div class="tiles rate" style="--cols:3" role="group" aria-labelledby="rateLbl">
        <button class="tile rate-no" type="button" data-rate="wrong"><span class="tkey" aria-hidden="true">1</span>Fout</button>
        <button class="tile rate-half" type="button" data-rate="almost"><span class="tkey" aria-hidden="true">2</span>Bijna</button>
        <button class="tile rate-yes" type="button" data-rate="right"><span class="tkey" aria-hidden="true">3</span>Goed</button>
      </div>
    </div>`;
  reveal.querySelectorAll('[data-rate]').forEach(b => {
    b.addEventListener('click', () => selfRate(/** @type {Outcome} */ (/** @type {HTMLElement} */ (b).dataset.rate)));
  });
  /** @type {HTMLElement} */ (reveal.querySelector('[data-rate]')).focus({ preventScroll: true });
  reveal.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/** @param {Outcome} outcome */
function selfRate(outcome) {
  if (!G || G.locked || !G.revealed) return;
  const rate = document.querySelector('#selfRate');
  if (rate) rate.remove();
  answer(outcome);
}

/** Zet het typveld vast en haalt de knop en hint weg: die zijn na het antwoorden niet meer nodig. */
function disableTyping() {
  const field = /** @type {HTMLInputElement | null} */ (document.querySelector('#typeIn'));
  if (field) field.disabled = true;
  document.querySelectorAll('#typeForm button, #qcard .typein-hint').forEach(el => { /** @type {HTMLElement} */ (el).hidden = true; });
}

/**
 * Verwerkt een antwoord: punten, bakje, levens, geluid, Stampy en feedback.
 * @param {Outcome} outcome
 * @param {{ chosen?: number, spelling?: string, timeUp?: boolean }} [info]
 */
function answer(outcome, info = {}) {
  if (G.locked) return;
  G.locked = true;
  const q = G.queue[G.idx];
  const card = $('#qcard');
  const right = outcome === 'right';

  // Bij 'tijd op' of een fout antwoord: laat zien wat goed was.
  document.querySelectorAll('#qcard .tile[data-i]').forEach((el, j) => {
    const b = /** @type {HTMLButtonElement} */ (el);
    if (b.disabled) return;
    b.disabled = true;
    b.classList.add(G.opts[j].ok ? 'ok' : 'dim');
  });
  const field = document.querySelector('#typeIn');
  if (field && q.type !== 'sentence' && !field.classList.contains('ok')) field.classList.add('no');
  disableTyping();

  recordAnswer(q.id, outcome);
  markPlayed();
  G.answered++;

  let points = 0;
  let requeued = false;
  if (right) {
    G.streak++;
    G.best = Math.max(G.best, G.streak);
    G.correct++;
    const bonus = usesSpeedBonus(G.mode, q) ? Math.max(0, Math.round(50 * (1 - (performance.now() - G.qStart) / Q_TIME))) : 0;
    points = (100 + bonus) * mult();
    const combo = [3, 6, 10].includes(G.streak);
    sfx(combo ? 'combo' : 'ok');
    if (G.mode === 'boss') G.hp = Math.max(0, G.hp - (G.streak >= 5 ? 2 : 1));
    if (G.mode === 'boss' && G.hp <= 0) cheer('win', 'Incident gesloten!');
    else if (combo) cheer('combo', `${G.streak} op rij!`);
    else cheer('ok', G.mode === 'speed' ? '' : randomOf(['Goed zo!', 'Die zit erin.', 'Netjes!', 'Precies.']));
  } else if (outcome === 'almost') {
    G.almost++;
    points = 50;
    G.mistakes.push(q);
    sfx('flip');
    cheer('think', 'Bijna. Lees het modelantwoord nog eens.');
  } else {
    G.streak = 0;
    G.mistakes.push(q);
    sfx('bad');
    if (G.mode === 'boss') G.hearts--;
    if (requeues(G.mode) && !G.requeued.has(q.id)) {
      G.requeued.add(q.id);
      G.queue.push(q);
      requeued = true;
    }
    if (G.mode === 'boss' && G.hearts <= 0) cheer('no', 'De pager wint deze keer.');
    else if (info.timeUp) cheer('no', 'Tijd op! De pager piept door.');
    else cheer('no', G.mode === 'speed' ? '' : requeued ? 'Geeft niks, die komt terug.' : 'Oei. Lees de uitleg even.');
    if (field instanceof HTMLElement) shake(field);
  }

  const before = G.score;
  G.score += points;
  if (points) floatPoints(card, points);
  countUp($('#score'), G.score, { from: before, ms: 500, format: nl });
  renderCombo();
  if (G.mode === 'boss') renderBossState();
  save();

  if (G.mode === 'speed') {
    if (!right) $('#fb').innerHTML = `<div class="fb-mini">Goed was: <b>${fmt(rightText(q))}</b></div>`;
    const game = G;
    setTimeout(() => { if (G === game) next(); }, right ? 380 : 1300);
    return;
  }
  showFeedback(q, outcome, info, requeued);
}

/** Schudt een element even heen en weer (bij een fout antwoord). @param {HTMLElement} el */
function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth; // herstart de animatie
  el.classList.add('shake');
}

/**
 * Het feedbackpaneel onder de vraag, in de stijl van de sheet: groen bij goed, rood bij fout.
 * @param {Question} q
 * @param {Outcome} outcome
 * @param {{ chosen?: number, spelling?: string, timeUp?: boolean }} info
 * @param {boolean} requeued
 */
function showFeedback(q, outcome, info, requeued) {
  const right = outcome === 'right';
  const end = G.mode === 'boss' && (G.hp <= 0 || G.hearts <= 0);
  const cls = right ? 'ok' : outcome === 'almost' ? 'half' : 'no';
  const title = right ? (G.streak >= 3 ? `Goed! ${G.streak} op rij.` : randomOf(['Goed!', 'Top!', 'Precies!']))
    : outcome === 'almost' ? 'Bijna.' : info.timeUp ? 'Tijd op.' : 'Niet goed.';

  let h = `<div class="fb ${cls}"><h2 class="fb-title">${title}</h2>`;
  if (info.spelling) h += `<p>Let op de schrijfwijze: <code>${esc(info.spelling)}</code></p>`;
  if (outcome === 'wrong' && q.type !== 'sentence') h += `<p>Juist is: <b class="ans">${fmt(rightText(q))}</b></p>`;
  if (q.type !== 'sentence') h += explain(q, right, info.chosen);
  if (requeued) h += '<p class="fb-note">Deze vraag komt aan het eind van de ronde terug.</p>';
  h += `<div class="fb-row"><button class="cta" id="nextBtn" type="button">${end ? 'Bekijk resultaat' : 'Volgende'}</button><span class="fb-key kbd">Enter = verder</span></div></div>`;

  const fb = $('#fb');
  fb.innerHTML = h;
  $('#nextBtn').addEventListener('click', next);
  $('#nextBtn').focus({ preventScroll: true });
  fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/**
 * Uitleg na een antwoord: simpel gezegd, waarom jouw keuze niet klopt, de technische uitleg
 * en (ingeklapt) waarom de andere foute antwoorden niet kloppen.
 * @param {Question} q
 * @param {boolean} right
 * @param {number} [chosen] Index in [correct, ...wrong] van het gekozen antwoord.
 */
function explain(q, right, chosen) {
  let h = '';
  if (q.simple) h += `<div class="fb-blk"><b>Simpel gezegd</b><p>${fmt(q.simple)}</p></div>`;

  const whyWrong = q.type === 'choice' && q.why_wrong ? q.why_wrong : null;
  if (!right && whyWrong && chosen > 0 && whyWrong[chosen - 1]) {
    h += `<div class="fb-blk"><b>Waarom jouw antwoord niet klopt</b><p><strong>${fmt(q.wrong[chosen - 1])}</strong> — ${fmt(whyWrong[chosen - 1])}</p></div>`;
  }
  h += `<details class="fb-more"${right ? '' : ' open'}><summary>Technische uitleg</summary><p>${fmt(q.explanation)}</p></details>`;

  if (whyWrong) {
    const rest = q.wrong
      .map((text, i) => ({ text, reason: whyWrong[i], index: i + 1 }))
      .filter(x => x.reason && x.index !== chosen);
    if (rest.length) {
      h += `<details class="fb-more"><summary>Waarom ${right ? 'de' : 'de andere'} foute antwoorden niet kloppen</summary><ul>`
        + rest.map(x => `<li><strong>${fmt(x.text)}</strong> — ${fmt(x.reason)}</li>`).join('')
        + '</ul></details>';
    }
  }
  if (q.section) h += `<a class="fb-les" href="#/kennis/${esc(q.section)}" target="_blank" rel="noopener noreferrer">Lees de les hierover (${esc(q.section)})<span class="sr-only">, opent in een nieuw tabblad</span></a>`;
  return h;
}

/** Het goede antwoord als tekst. @param {Question} q */
function rightText(q) {
  switch (q.type) {
    case 'choice': return q.correct;
    case 'truefalse': return q.answer ? 'Waar' : 'Niet waar';
    case 'type': return q.answers[0];
    case 'sentence': return q.model;
  }
}

/* ---------- HUD tijdens het spelen ---------- */

function renderProgress() {
  let pct;
  if (G.mode === 'boss') pct = (BOSS_HP - G.hp) / BOSS_HP * 100;
  else if (G.mode === 'speed') pct = Math.min(100, G.correct * 4);
  else pct = G.idx / G.queue.length * 100;
  $('#progFill').style.width = pct + '%';
}

function renderBossState() {
  const hearts = $('#hearts');
  hearts.innerHTML = [0, 1, 2].map(i => `<span class="${i < G.hearts ? '' : 'lost'}">${HEART}</span>`).join('');
  hearts.setAttribute('aria-label', `Levens: ${G.hearts} van 3`);
  hearts.setAttribute('role', 'img');
  $('#bossHp').style.width = (G.hp / BOSS_HP * 100) + '%';
  $('#bossHpText').textContent = G.hp + ' / ' + BOSS_HP;
  $('#progFill').style.width = ((BOSS_HP - G.hp) / BOSS_HP * 100) + '%';
}

function renderCombo() {
  const combo = $('#combo');
  if (mult() > 1) {
    combo.hidden = false;
    combo.textContent = 'COMBO ×' + mult();
    combo.classList.remove('pop');
    void combo.offsetWidth;
    combo.classList.add('pop');
  } else {
    combo.hidden = true;
  }
}

/** @param {HTMLElement} card @param {number} points */
function floatPoints(card, points) {
  const el = document.createElement('span');
  el.className = 'pts-float';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '+' + points;
  card.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* ---------- volgende vraag en einde ---------- */

function next() {
  if (!G) return;
  if (G.mode === 'boss' && (G.hp <= 0 || G.hearts <= 0)) { finish(); return; }
  G.idx++;
  if (G.idx >= G.queue.length) {
    if (G.mode === 'speed' || G.mode === 'boss') {
      // Speedrun en eindbaas gaan door tot de tijd of de levens op zijn.
      const pool = poolFor(G.mode, G.week);
      G.queue = G.queue.concat(weighted(pool, pool.length));
    } else {
      finish();
      return;
    }
  }
  renderQuestion();
}

function finish() {
  clearInterval(tick);
  const g = G;
  G = null;
  if (!g) return;

  const won = g.mode === 'boss' && g.hp <= 0;
  const xp = Math.round(g.score / 10) + (won ? 500 : 0);
  S.xp += xp;
  const key = { quiz: 'q' + g.week, speed: 's' + g.week, boss: 'boss', type: 't' + g.week, retry: null }[g.mode];
  const record = !!key && g.score > (S.best[key] || 0);
  if (record) S.best[key] = g.score;
  if (won) S.best.bossWins = (S.best.bossWins || 0) + 1;
  save();
  renderHud();

  const acc = g.answered ? Math.round(g.correct / g.answered * 100) : 0;
  let title, sub;
  if (g.mode === 'boss') {
    title = won ? 'Incident gesloten.' : 'De pager wint deze keer.';
    sub = won ? 'Productie draait weer. Je hebt de eindbaas verslagen.' : `Je had nog ${g.hp} HP te gaan. Bekijk je fouten en neem hem opnieuw op.`;
  } else if (g.mode === 'speed') {
    title = `${g.correct} goed in 60 seconden`;
    sub = `Langste reeks: ${g.best} op rij.`;
  } else {
    title = acc >= 90 ? 'Dat zit erin.' : acc >= 70 ? 'Bijna gestampt.' : 'Nog even stampen.';
    sub = `${g.correct} van ${g.answered} goed` + (g.almost ? `, ${g.almost} bijna` : '') + (g.requeued.size ? ', inclusief herkansingen' : '') + '.';
  }

  const misses = [...new Map(g.mistakes.map(q => [q.id, q])).values()];
  const missHtml = misses.length
    ? `<section class="miss" aria-labelledby="missTitle"><h2 id="missTitle">Dit moet er nog in (${misses.length})</h2>` + misses.map(q =>
        `<article class="miss-item" style="--wc:${hue(q.week)}"><p class="miss-q">${fmt(q.question)}</p><p class="miss-a">${fmt(rightText(q))}</p>`
        + (q.simple ? `<p class="miss-s"><b>Simpel gezegd</b>${fmt(q.simple)}</p>` : '')
        + (q.explanation ? `<details class="miss-more"><summary>Technische uitleg</summary><p>${fmt(q.explanation)}</p></details>` : '')
        + '</article>'
      ).join('') + '</section>'
    : '';

  /** @type {ResultButton[]} */
  const buttons = [{ label: 'Nog een ronde', primary: true, onClick: () => startGame(g.mode === 'retry' ? 'quiz' : g.mode, g.week) }];
  if (misses.length) buttons.push({ label: 'Alleen mijn fouten', onClick: () => startGame('retry', g.week, shuffle(misses)) });
  buttons.push({ label: 'Naar overzicht', onClick: goHome });

  const goodRound = won || (g.mode !== 'boss' && g.mode !== 'speed' && acc >= 80) || (g.mode === 'speed' && g.correct >= 15);
  const badRound = (g.mode === 'boss' && !won) || (g.mode !== 'speed' && acc < 50);
  showResult({
    record, title, sub,
    badge: $('#modeTag').textContent || MODES[g.mode],
    mood: goodRound || record ? 'win' : badRound ? 'sad' : 'ok',
    stats: [
      { value: g.score, label: 'score', tone: 'gold' },
      { value: acc, label: 'goed', suffix: '%', tone: acc >= 70 ? 'good' : 'bad' },
      { value: g.best, label: 'langste reeks', tone: 'accent' },
      { value: xp, label: 'XP verdiend', prefix: '+', tone: 'gold' },
    ],
    extraHtml: missHtml,
    buttons,
  });

  if (goodRound) sfx('win');
  if (goodRound || record) confetti();
  else if (g.mode === 'boss') sfx('lose');
}

/* ---------- stoppen ---------- */

/** Stoppen vraagt om bevestiging zodra je iets beantwoord hebt; de klok staat dan stil. */
async function requestQuitGame() {
  if (!G) return;
  if (G.answered === 0) {
    clearInterval(tick);
    G = null;
    goHome();
    return;
  }
  pauseClock();
  const ok = await confirmDialog({
    title: 'Ronde stoppen?',
    text: 'Je score tot nu toe telt mee en je ziet meteen je resultaat.',
    ok: 'Stoppen',
    cancel: 'Doorgaan',
  });
  if (!G) return;
  if (ok) finish();
  else resumeClock();
}

/** @param {KeyboardEvent} e */
function onGameKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); requestQuitGame(); return; }
  if (!G.locked) {
    const n = parseInt(e.key, 10);
    if (G.revealed) {
      /** @type {Outcome[]} */
      const rates = ['wrong', 'almost', 'right'];
      if (n >= 1 && n <= 3) { e.preventDefault(); selfRate(rates[n - 1]); }
    } else if (n >= 1 && n <= G.opts.length) {
      e.preventDefault();
      pick(n - 1);
    }
  } else if (e.key === 'Enter' && G.mode !== 'speed') {
    e.preventDefault();
    next();
  }
}

$('#quitBtn').addEventListener('click', requestQuitGame);
