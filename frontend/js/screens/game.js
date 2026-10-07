/* ---------- spelen: quiz, speedrun, eindbaas, zwakke plekken en typen ---------- */

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

/** Het lopende spel, of null. @type {Game | null} */
let G = null;
/** @type {number | undefined} */
let tick;

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
  $('#score').textContent = '0';
  $('#combo').hidden = true;
  showScreen('play');

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
  } else {
    if (G.locked || !hasTimer(G.mode)) return;
    frac = 1 - (now - G.qStart) / Q_TIME;
    // Alleen bij de eindbaas is de tijd echt op; in de quiz bepaalt de balk alleen de bonus.
    if (frac <= 0 && G.mode === 'boss') { answer('wrong'); return; }
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
    ? `<span class="hint">${G.idx + 1} / ${G.queue.length}</span>` : '';
  let h = `<div class="q-meta" style="--hue:${hue(q.week)}"><span class="chip">Week ${q.week}</span>${counter}${isRetry ? '<span class="chip retry">Herkansing</span>' : ''}</div>`;
  h += `<p class="q-text">${q.type === 'truefalse' ? 'Waar of niet waar? ' : ''}${fmt(q.question)}</p>`;
  if (q.code) h += `<pre class="code">${esc(q.code)}</pre>`;
  h += answerArea(q);
  h += '<div id="reveal"></div><div id="fb"></div>';

  const card = $('#qcard');
  card.innerHTML = h;
  card.style.setProperty('--hue', hue(q.week));
  card.classList.remove('flash-ok', 'flash-half', 'flash-no');
  bindAnswerArea(q, card);
}

/** HTML voor de manier van antwoorden: knoppen, een regel typen of een zin typen. @param {Question} q */
function answerArea(q) {
  if (q.type === 'choice') {
    G.opts = shuffle([q.correct, ...q.wrong].map((text, index) => ({ text, ok: index === 0, index })));
    return '<div class="opts">' + G.opts.map((o, i) =>
      `<button class="opt" type="button" data-i="${i}"><span class="k">${i + 1}</span><span>${fmt(o.text)}</span></button>`
    ).join('') + '</div>';
  }
  if (q.type === 'truefalse') {
    G.opts = [{ text: 'Waar', ok: q.answer === true, index: -1 }, { text: 'Niet waar', ok: q.answer === false, index: -1 }];
    return '<div class="opts tf">' + G.opts.map((o, i) =>
      `<button class="opt" type="button" data-i="${i}"><span class="k">${i + 1}</span><span>${o.text}</span></button>`
    ).join('') + '</div>';
  }
  if (q.type === 'sentence') {
    return `<form class="typein" id="typeForm">
        <textarea id="typeIn" rows="3" enterkeyhint="done" placeholder="Schrijf je antwoord in een paar zinnen…" aria-label="Je antwoord"></textarea>
        <button class="btn primary" type="submit">Vergelijk met modelantwoord</button>
      </form>
      <p class="hint typein-hint"><span class="kbd">Enter om te vergelijken, Shift+Enter voor een nieuwe regel. </span>Daarna beoordeel je zelf hoe het ging.</p>`;
  }
  return `<form class="typein" id="typeForm">
      <input id="typeIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Typ je antwoord…" aria-label="Je antwoord">
      <button class="btn primary" type="submit">Check</button>
    </form>
    <p class="hint typein-hint"><span class="kbd">Enter om te checken. </span>Leeg laten = ik weet het niet.</p>`;
}

/** @param {Question} q @param {HTMLElement} card */
function bindAnswerArea(q, card) {
  card.querySelectorAll('.opt').forEach(b => {
    b.addEventListener('click', () => pick(Number(/** @type {HTMLElement} */ (b).dataset.i)));
  });

  const form = document.querySelector('#typeForm');
  if (!form) return;
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

/** @param {number} i Index van de gekozen knop. */
function pick(i) {
  if (G.locked) return;
  const chosen = G.opts[i];
  document.querySelectorAll('#qcard .opt').forEach((el, j) => {
    const b = /** @type {HTMLButtonElement} */ (el);
    b.disabled = true;
    if (G.opts[j].ok) b.classList.add('correct');
    else if (j === i) b.classList.add('wrong');
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
  input.classList.add(result.ok ? 'correct' : 'wrong');
  answer(result.ok ? 'right' : 'wrong', { spelling: result.spelling });
}

/** Zinvraag: toont het modelantwoord en de knoppen om jezelf te beoordelen. */
function revealModel() {
  if (G.locked || G.revealed) return;
  G.revealed = true;
  const q = G.queue[G.idx];
  disableTyping();

  const points = q.points && q.points.length
    ? `<div style="margin-top:10px"><span class="lbl">Een goed antwoord noemt</span></div><ul>${q.points.map(p => `<li>${fmt(p)}</li>`).join('')}</ul>`
    : '';
  const reveal = $('#reveal');
  reveal.innerHTML = `<div class="model"><span class="lbl">Modelantwoord</span><p>${fmt(q.model)}</p>${points}</div>
    <div class="selfrate" id="selfRate">
      <span class="lbl">Hoe ging het?</span>
      <div class="selfrate-btns">
        <button class="btn no" type="button" data-rate="wrong">Fout<span class="kbd"> (1)</span></button>
        <button class="btn almost" type="button" data-rate="almost">Bijna<span class="kbd"> (2)</span></button>
        <button class="btn yes" type="button" data-rate="right">Goed<span class="kbd"> (3)</span></button>
      </div>
    </div>`;
  reveal.querySelectorAll('[data-rate]').forEach(b => {
    b.addEventListener('click', () => selfRate(/** @type {Outcome} */ (/** @type {HTMLElement} */ (b).dataset.rate)));
  });
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
 * Verwerkt een antwoord: punten, bakje, levens, geluid en feedback.
 * @param {Outcome} outcome
 * @param {{ chosen?: number, spelling?: string }} [info]
 */
function answer(outcome, info = {}) {
  if (G.locked) return;
  G.locked = true;
  const q = G.queue[G.idx];
  const card = $('#qcard');
  const right = outcome === 'right';

  // Bij 'tijd op' of een fout antwoord: laat zien wat goed was.
  document.querySelectorAll('#qcard .opt').forEach((el, j) => {
    const b = /** @type {HTMLButtonElement} */ (el);
    if (b.disabled) return;
    b.disabled = true;
    b.classList.add(G.opts[j].ok ? 'correct' : 'dim');
  });
  const field = document.querySelector('#typeIn');
  if (field && q.type !== 'sentence' && !field.classList.contains('correct')) field.classList.add('wrong');
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
    sfx([3, 6, 10].includes(G.streak) ? 'combo' : 'ok');
    if (G.mode === 'boss') G.hp = Math.max(0, G.hp - (G.streak >= 5 ? 2 : 1));
  } else if (outcome === 'almost') {
    G.almost++;
    points = 50;
    G.mistakes.push(q);
    sfx('flip');
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
    card.classList.remove('shake');
    void card.offsetWidth; // herstart de animatie
    card.classList.add('shake');
  }

  const before = G.score;
  G.score += points;
  if (points) floatPoints(card, points);
  countUp($('#score'), G.score, { from: before, ms: 500, format: nl });
  card.classList.remove('flash-ok', 'flash-half', 'flash-no');
  void card.offsetWidth; // herstart de puls
  card.classList.add(right ? 'flash-ok' : outcome === 'almost' ? 'flash-half' : 'flash-no');
  renderCombo();
  if (G.mode === 'boss') renderBossState();
  save();

  if (G.mode === 'speed') {
    if (!right) $('#fb').innerHTML = `<div class="fb no"><p>Goed was: <span class="ans">${fmt(rightText(q))}</span></p></div>`;
    const game = G;
    setTimeout(() => { if (G === game) next(); }, right ? 380 : 1300);
    return;
  }
  showFeedback(q, outcome, info, requeued);
}

/**
 * @param {Question} q
 * @param {Outcome} outcome
 * @param {{ chosen?: number, spelling?: string }} info
 * @param {boolean} requeued
 */
function showFeedback(q, outcome, info, requeued) {
  const right = outcome === 'right';
  const end = G.mode === 'boss' && (G.hp <= 0 || G.hearts <= 0);
  const cls = right ? 'ok' : outcome === 'almost' ? 'half' : 'no';
  const title = right ? (G.streak >= 3 ? `Goed. ${G.streak} op rij.` : 'Goed.') : outcome === 'almost' ? 'Bijna.' : 'Niet goed.';

  let h = `<div class="fb ${cls}"><h4>${title}</h4>`;
  if (info.spelling) h += `<p>Let op de schrijfwijze: <span class="ans">${fmt(info.spelling)}</span></p>`;
  if (outcome === 'wrong' && q.type !== 'sentence') h += `<p>Juiste antwoord: <span class="ans">${fmt(rightText(q))}</span></p>`;
  if (q.type !== 'sentence') h += explain(q, right, info.chosen);
  if (requeued) h += '<p class="hint" style="margin-top:6px">Deze vraag komt aan het eind terug.</p>';
  h += `<div class="fb-row"><span class="hint kbd">Enter = verder</span><button class="btn primary" id="nextBtn" type="button">${end ? 'Bekijk resultaat' : 'Volgende'}</button></div></div>`;

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
  if (q.simple) h += `<div class="jip"><span class="lbl">Simpel gezegd</span><p>${fmt(q.simple)}</p></div>`;

  const whyWrong = q.type === 'choice' && q.why_wrong ? q.why_wrong : null;
  if (!right && whyWrong && chosen > 0 && whyWrong[chosen - 1]) {
    h += `<div class="whynot"><span class="lbl">Waarom jouw antwoord niet klopt</span><p><b>${fmt(q.wrong[chosen - 1])}</b> — ${fmt(whyWrong[chosen - 1])}</p></div>`;
  }
  h += `<div class="tech"><span class="lbl">Technisch</span><p>${fmt(q.explanation)}</p></div>`;

  if (whyWrong) {
    const rest = q.wrong
      .map((text, i) => ({ text, reason: whyWrong[i], index: i + 1 }))
      .filter(x => x.reason && x.index !== chosen);
    if (rest.length) {
      h += `<details class="others"><summary>Waarom ${right ? 'de' : 'de andere'} foute antwoorden niet kloppen</summary><ul>`
        + rest.map(x => `<li><b>${fmt(x.text)}</b> — ${fmt(x.reason)}</li>`).join('')
        + '</ul></details>';
    }
  }
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
  $('#hearts').innerHTML = [0, 1, 2].map(i => `<span class="${i < G.hearts ? '' : 'lost'}">♥</span>`).join('');
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
  el.className = 'float';
  el.textContent = '+' + points;
  card.appendChild(el);
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
    ? `<div class="miss"><h3>Dit moet er nog in (${misses.length})</h3>` + misses.map(q =>
        `<div class="miss-item"><p>${fmt(q.question)}</p><p class="a">${fmt(rightText(q))}</p>`
        + (q.simple ? `<p class="j"><span class="lbl">Simpel gezegd</span><br>${fmt(q.simple)}</p>` : '')
        + (q.explanation ? `<p class="w">${fmt(q.explanation)}</p>` : '')
        + '</div>'
      ).join('') + '</div>'
    : '';

  /** @type {ResultButton[]} */
  const buttons = [{ label: 'Nog een ronde', primary: true, week: g.week, onClick: () => startGame(g.mode === 'retry' ? 'quiz' : g.mode, g.week) }];
  if (misses.length) buttons.push({ label: 'Alleen mijn fouten', onClick: () => startGame('retry', g.week, shuffle(misses)) });
  buttons.push({ label: 'Naar overzicht', onClick: goHome });

  showResult({
    record, title, sub,
    stats: [
      { value: g.score, label: 'score', tone: 'gold' },
      { value: acc, label: 'goed', suffix: '%', tone: acc >= 70 ? 'good' : 'bad' },
      { value: g.best, label: 'langste reeks', tone: 'accent' },
      { value: xp, label: 'XP verdiend', prefix: '+', tone: 'gold' },
    ],
    extraHtml: missHtml,
    buttons,
  });

  const goodRound = won || (g.mode !== 'boss' && g.mode !== 'speed' && acc >= 80) || (g.mode === 'speed' && g.correct >= 15);
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
