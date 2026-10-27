/* ---------- Een level spelen (kaart) ----------
   startLevel(id): LEVEL_SIZE vragen en puzzels uit de les, drie levens, Stampy reageert op elk
   antwoord. Fout kost een leven (uitlegvragen en flashcards niet); zonder levens is het level mislukt.
   Past er een minigame uit het ontwerp bij de les, dan volgt die (30 seconden, punten = XP).
   Daarna het resultaat met sterren, wat er open ging en de knoppen verder.
   startMinigame(key) speelt een minigame los, voor het oefen-overzicht.
   leaveLevel() ruimt alles op (timers, animatie, Stampy's). */

/** Hoe lang een minigame duurt. */
const GAME_MS = 30000;

/**
 * Een ronde van een minigame: wat je ziet en welke knop goed is.
 * @typedef {{ prompt: string, cap: string, options: string[], answer: string, text?: boolean }} GameRound
 */

/**
 * De minigames uit het ontwerp (frontend/spel), plus twee voor SQL en HTTP.
 * week: bij welke wereld hij hoort (voor het oefen-overzicht).
 * @type {Object<string, { name: string, how: string, week: number, gen: () => GameRound }>}
 */
const GAMES = {
  types: {
    name: 'Sorteermachine', week: 1,
    how: 'Welk type heeft deze waarde? Tik zo snel mogelijk op het goede type.',
    gen() {
      const values = [['42', 'int'], ['3.14', 'float'], ['"hoi"', 'str'], ['True', 'bool'], ['[1, 2]', 'list'], ['None', 'NoneType'], ["{'a': 1}", 'dict'],
        ['(1, 2)', 'tuple'], ['"42"', 'str'], ['0.5', 'float'], ['-7', 'int'], ['False', 'bool'], ['{3, 4}', 'set'], ['[]', 'list'], ['2.0', 'float']];
      const [value, type] = randomOf(values);
      const others = shuffle(['int', 'float', 'str', 'bool', 'list', 'dict', 'tuple', 'set', 'NoneType'].filter(x => x !== type)).slice(0, 3);
      return { prompt: value, cap: 'Welk type?', options: shuffle([type, ...others]), answer: type };
    },
  },
  arith: {
    name: 'Rekenrace', week: 1,
    how: 'Reken het uit zoals Python het doet. Let op het verschil tussen `/`, `//` en `%`.',
    gen() {
      const ops = ['//', '%', '**', '/'];
      const op = randomOf(ops);
      const rnd = (/** @type {number} */ lo, /** @type {number} */ hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
      let a, b;
      if (op === '**') { a = rnd(2, 5); b = rnd(2, 3); }
      else if (op === '/') { b = randomOf([2, 4]); a = b * rnd(1, 6) + rnd(0, b - 1); }
      else { a = rnd(5, 20); b = rnd(2, 5); }
      const calc = (/** @type {string} */ o) => o === '//' ? Math.floor(a / b) : o === '%' ? a % b : o === '**' ? a ** b : a / b;
      // Python laat bij / altijd een float zien: 4 / 2 is 2.0.
      const show = (/** @type {string} */ o) => { const v = calc(o); return o === '/' && Number.isInteger(v) ? v + '.0' : String(v); };
      const answer = show(op);
      return { prompt: `${a} ${op} ${b}`, cap: 'Wat is de uitkomst?', options: gameOptions(answer, ops.map(show), 3), answer };
    },
  },
  slice: {
    name: 'Slice-shooter', week: 1,
    how: '`w = "PYTHON"`. Welk stukje tekst geeft deze slice?',
    gen() {
      const w = 'PYTHON';
      const rnd = (/** @type {number} */ lo, /** @type {number} */ hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
      const k = Math.random();
      let a, b, label;
      if (k < .2) { a = 0; b = rnd(2, 5); label = `w[:${b}]`; }
      else if (k < .4) { a = rnd(1, 4); b = 6; label = `w[${a}:]`; }
      else if (k < .5) { const n = rnd(2, 4); a = 6 - n; b = 6; label = `w[-${n}:]`; }
      else { a = rnd(0, 3); b = rnd(a + 1, 6); label = `w[${a}:${b}]`; }
      const q = (/** @type {string} */ s) => `'${s}'`;
      const near = [[a, b + 1], [a + 1, b], [a - 1, b], [a, b - 1], [a + 1, b + 1]]
        .filter(([x, y]) => x >= 0 && y <= 6 && y > x).map(([x, y]) => q(w.slice(x, y)));
      const answer = q(w.slice(a, b));
      return { prompt: label, cap: 'Wat geeft deze slice?', options: gameOptions(answer, near.concat([1, 2, 3, 4].map(n => q(w.slice(0, n)))), 3), answer };
    },
  },
  loops: {
    name: 'Loop-teller', week: 1,
    how: 'Hoe vaak draait deze loop? Tel slim, niet op je vingers.',
    gen() {
      const start = Math.floor(Math.random() * 4);
      const step = 1 + Math.floor(Math.random() * 3);
      const n = 1 + Math.floor(Math.random() * 6);
      const stop = start + step * n - Math.floor(Math.random() * step);
      const count = Math.max(0, Math.ceil((stop - start) / step));
      const prompt = step > 1 ? `range(${start}, ${stop}, ${step})` : start === 0 ? `range(${stop})` : `range(${start}, ${stop})`;
      const answer = String(count);
      return { prompt, cap: 'Hoeveel rondjes?', options: gameOptions(answer, [count + 1, count - 1, count + 2].filter(x => x >= 0).map(String), 3), answer };
    },
  },
  sql: {
    name: 'Query-bouwer', week: 3,
    how: 'Welk SQL-keyword heb je nodig? Kies het stukje query dat bij de opdracht past.',
    gen() {
      const pairs = [
        ['Alleen rijen waar de prijs boven 10 ligt', 'WHERE'], ['Sorteer de klanten op naam', 'ORDER BY'], ['Tel het aantal orders per klant', 'GROUP BY'],
        ['Alleen groepen met meer dan 5 orders', 'HAVING'], ['Klanten en hun orders samen tonen', 'JOIN'], ['Maximaal 10 rijen teruggeven', 'LIMIT'],
        ['Een nieuwe klant toevoegen', 'INSERT'], ['Het e-mailadres van een klant aanpassen', 'UPDATE'], ['Een order weghalen', 'DELETE'],
        ['Kolommen kiezen die je wilt zien', 'SELECT'],
      ];
      const [prompt, answer] = randomOf(pairs);
      return { prompt, cap: 'Welk keyword?', text: true, options: gameOptions(answer, shuffle(pairs.map(p => p[1])), 4), answer };
    },
  },
  http: {
    name: 'Statuscode-sprint', week: 4,
    how: 'Welke HTTP-methode of statuscode past erbij? Denk aan REST en FastAPI.',
    gen() {
      const methods = [['Een lijst producten ophalen', 'GET'], ['Een nieuwe gebruiker aanmaken', 'POST'], ['Een resource helemaal vervangen', 'PUT'],
        ['Een paar velden van een resource aanpassen', 'PATCH'], ['Een resource verwijderen', 'DELETE']];
      const codes = [['Gelukt, hier is je data', '200'], ['Aangemaakt', '201'], ['Gelukt, zonder inhoud terug', '204'], ['Het verzoek klopt niet', '400'],
        ['Niet ingelogd of token ongeldig', '401'], ['Ingelogd, maar geen toegang', '403'], ['Bestaat niet', '404'],
        ['De body past niet bij het Pydantic-model', '422'], ['Fout in de server zelf', '500']];
      const set = Math.random() < .4 ? methods : codes;
      const [prompt, answer] = randomOf(set);
      return { prompt, cap: set === methods ? 'Welke methode?' : 'Welke statuscode?', text: true, options: gameOptions(answer, shuffle(set.map(p => p[1])), 4), answer };
    },
  },
};

/** Minigame per les: welke minigames passen bij een level. */
const LEVEL_GAMES = { '1.2': ['types', 'arith', 'slice'], '1.3': ['loops'], '1.4': ['types'], '3.2': ['sql'], '4.1': ['http'] };

/** De minigames die bij een level horen (leeg als er geen is). @param {string} id @returns {string[]} */
const levelGames = id => (LEVEL_GAMES[id] || []).filter(k => GAMES[k]);

/**
 * Antwoordknoppen: het goede antwoord plus unieke foute uit de kandidaten, aangevuld tot n.
 * @param {string} answer @param {string[]} candidates @param {number} n
 */
function gameOptions(answer, candidates, n) {
  const set = new Set([answer]);
  for (const c of candidates) { if (set.size >= n) break; set.add(c); }
  // Te weinig verschillende kandidaten: vul aan met getallen naast het antwoord (of met een teller).
  for (let d = 1; set.size < n; d++) set.add(isNaN(Number(answer)) ? `${answer}${d}` : String(Number(answer) + d));
  return shuffle([...set]);
}

const LV_ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z" fill="currentColor"/></svg>',
  star: (/** @type {boolean} */ on) => `<svg class="s" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="${on ? '#FFC93D' : 'var(--track)'}" stroke="${on ? '#B87500' : 'var(--stroke)'}" stroke-width="1"/></svg>`,
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V7a4 4 0 017.5-2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="currentColor"/></svg>',
};

/**
 * Het lopende level of de losse minigame.
 * @type {null | {
 *   mode: 'level' | 'solo', key?: string, level?: Level, items?: any[], i?: number, hearts?: number, mistakes?: number,
 *   correct?: number, combo?: number, xp?: number, answered: number, game?: string | null, gameScore?: number,
 *   stageBefore?: number, over?: boolean }}
 */
let LV = null;
/**
 * De lopende minigame.
 * @type {null | { key: string, score: number, combo: number, best: number, hits: number, end: number, raf: number, sec: number, left: number, paused: boolean, round: GameRound | null, onEnd: (mg: any) => void }}
 */
let MG = null;
/** Stampy's op het level-scherm; leaveLevel ruimt ze op. @type {Bot[]} */
const LV_BOTS = [];
/** Stampy in de hoek tijdens het spelen. @type {Bot | null} */
let lvBot = null;

/** Zoekt een level op id, bijvoorbeeld "1.2". @param {string} id */
function findLevel(id) {
  return worldLevels(Number(String(id).split('.')[0])).find(l => l.id === id) || null;
}

/** Index van de Stampy-upgrade bij een streak (0 = slaapstand). @param {number} days */
const lvStage = days => typeof stampyStage === 'function' ? stampyStage(days).index : 0;

/**
 * Kiest de vragen van een level: voorrang voor wat je nog niet kent (weighted), met een mix van soorten:
 * tot twee puzzels, hooguit één uitlegvraag, flashcards alleen als aanvulling. Begint nooit met een uitlegvraag.
 * @param {string} id
 */
function pickLevelItems(id) {
  const pool = levelPool(id);
  const n = Math.min(LEVEL_SIZE, pool.length);
  const puzzles = pool.filter(q => q.type === 'fill' || q.type === 'parsons');
  const open = pool.filter(q => q.type === 'sentence');
  const cards = pool.filter(q => q.type === 'card');
  const rest = pool.filter(q => !puzzles.includes(q) && !open.includes(q) && !cards.includes(q));
  const picked = [...weighted(puzzles, Math.min(2, n)), ...weighted(open, n >= 5 ? 1 : 0)];
  picked.push(...weighted(rest, n - picked.length));
  for (const group of [cards, open, puzzles]) {
    if (picked.length < n) picked.push(...weighted(group.filter(q => !picked.includes(q)), n - picked.length));
  }
  const order = shuffle(picked);
  const first = order.findIndex(q => q.type !== 'sentence' && q.type !== 'card');
  if (first > 0) [order[0], order[first]] = [order[first], order[0]];
  return order;
}

/* ---------- level starten en vragen ---------- */

/** Start een level van de kaart. Een level op slot start niet. @param {string} levelId */
function startLevel(levelId) {
  const level = findLevel(levelId);
  if (!level) { toast('Dit level bestaat niet.'); return; }
  if (!levelUnlocked(level)) {
    toast(worldOpen(level.week) ? `Haal eerst level ${level.index}.` : `Wereld ${level.week} zit nog op slot.`);
    navigate('#/kaart/' + level.week);
    return;
  }
  leaveLevel();
  closeSheet();
  const games = levelGames(level.id);
  LV = {
    mode: 'level', level, items: pickLevelItems(level.id), i: 0, hearts: 3, mistakes: 0, correct: 0, combo: 0, xp: 0, answered: 0,
    game: games.length ? randomOf(games) : null, gameScore: 0, stageBefore: lvStage(currentStreak()), over: false,
  };
  showScreen('level');
  renderLevelFrame();
  if (lvBot) lvBot.say(`Level ${level.index + 1}: ${shortTitle(level.title)}`, 2600);
  renderLevelItem();
}

/** De bovenbalk en het vak voor de vragen. */
function renderLevelFrame() {
  if (!LV) return;
  destroyLevelBots();
  const solo = LV.mode === 'solo';
  const title = solo
    ? `<span class="lvchip" style="--wc:var(--violet)">Minigame</span>${esc(GAMES[/** @type {string} */ (LV.key)].name)}`
    : `<span class="lvchip" style="--wc:${WORLD_HEX[/** @type {Level} */ (LV.level).week - 1]}">Level ${/** @type {Level} */ (LV.level).index + 1}</span>${esc(shortTitle(/** @type {Level} */ (LV.level).title))}`;
  $('#level').innerHTML = `
    <div class="topbar lvtop">
      <button class="rbtn" type="button" id="lvQuit" aria-label="${solo ? 'Terug' : 'Level stoppen'}">${LV_ICON.back}</button>
      ${solo ? '<div class="grow"></div>' : `<div class="pbar" id="lvBar" role="progressbar" aria-label="Voortgang in dit level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="lvFill" style="width:0%"></i></div>
      <div class="hearts" id="lvHearts" role="img"></div>`}
      <div class="mascot right" id="lvBot"></div>
    </div>
    <div class="lvmeta">
      <h1 class="lvtitle">${title}</h1>
      ${solo ? '' : '<span class="lvxp" id="lvXp" aria-live="polite">0 XP</span><span class="combo" id="lvCombo" hidden>x2</span>'}
    </div>
    <div class="lvbox" id="lvBox"></div>`;
  lvBot = mountBot($('#lvBot'));
  LV_BOTS.push(lvBot);
  $('#lvQuit').addEventListener('click', quitLevel);
  if (!solo) renderLevelHud();
}

/** Voortgangsbalk, levens, XP en combo bijwerken. @param {boolean} [lostOne] */
function renderLevelHud(lostOne = false) {
  if (!LV || LV.mode !== 'level') return;
  const items = /** @type {any[]} */ (LV.items);
  const steps = items.length + (LV.game ? 1 : 0);
  const pct = Math.round(/** @type {number} */ (LV.i) / steps * 100);
  const bar = document.getElementById('lvBar');
  const fill = document.getElementById('lvFill');
  if (bar && fill) { fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct)); }
  const hearts = document.getElementById('lvHearts');
  if (hearts) {
    const left = /** @type {number} */ (LV.hearts);
    hearts.innerHTML = [0, 1, 2].map(k => `<span class="${k < left ? '' : 'lost'}${lostOne && k === left ? ' just' : ''}">${LV_ICON.heart}</span>`).join('');
    hearts.setAttribute('aria-label', `${left} van 3 levens`);
  }
  const xp = document.getElementById('lvXp');
  if (xp) xp.textContent = `+${nl(/** @type {number} */ (LV.xp))} XP`;
  const combo = document.getElementById('lvCombo');
  if (combo) {
    const on = /** @type {number} */ (LV.combo) >= 3;
    combo.textContent = `${LV.combo} op rij · XP x2`;
    if (on && combo.hidden) { combo.classList.remove('pop'); void combo.offsetWidth; combo.classList.add('pop'); }
    combo.hidden = !on;
  }
}

/** Toont de volgende vraag, of de minigame/het resultaat als de vragen op zijn. */
function renderLevelItem() {
  if (!LV || LV.mode !== 'level') return;
  renderLevelHud();
  const items = /** @type {any[]} */ (LV.items);
  if (/** @type {number} */ (LV.i) >= items.length) {
    if (LV.game) renderGameIntro(LV.game);
    else finishLevel();
    return;
  }
  const item = items[/** @type {number} */ (LV.i)];
  if (lvBot) lvBot.rest();
  renderPlayItem($('#lvBox'), item, { onAnswer: r => onLevelAnswer(item, r) });
}

/**
 * Verwerkt een antwoord: bakje, streak, XP, levens en Stampy; daarna de feedback-sheet.
 * @param {any} item @param {AnswerResult} r
 */
function onLevelAnswer(item, r) {
  if (!LV || LV.mode !== 'level') return;
  const lv = LV;
  lv.answered++;
  recordAnswer(item.id, r.outcome);
  markPlayed();
  let lost = false;
  if (r.outcome === 'right') {
    lv.correct = /** @type {number} */ (lv.correct) + 1;
    lv.combo = /** @type {number} */ (lv.combo) + 1;
    const gain = 20 * (lv.combo >= 3 ? 2 : 1);
    lv.xp = /** @type {number} */ (lv.xp) + gain;
    S.xp += gain;
    sfx(lv.combo >= 3 ? 'combo' : 'ok');
    if (lvBot) {
      if (lv.combo >= 3 && lv.combo % 3 === 0) lvBot.react('combo', `${lv.combo} op rij! Dubbele XP.`);
      else lvBot.react('ok', randomOf(['Goed zo!', 'Die zit erin.', 'Netjes!', `+${gain} XP`]));
    }
  } else if (r.open) {
    // Uitlegvragen en flashcards kosten geen leven.
    if (lvBot) lvBot.react('think', r.outcome === 'almost' ? 'Bijna. Lees het modelantwoord nog eens.' : 'Vergelijk je uitleg met het model.');
  } else {
    lv.hearts = /** @type {number} */ (lv.hearts) - 1;
    lv.mistakes = /** @type {number} */ (lv.mistakes) + 1;
    lv.combo = 0;
    lost = true;
    sfx('bad');
    if (lvBot) lvBot.react('no', lv.hearts > 0 ? randomOf(['Oei. Lees de uitleg even.', 'Die was lastig.', 'Fout is goed: nu onthoud je hem.']) : 'Oh nee, je levens zijn op…');
  }
  save();
  renderHud();
  renderLevelHud(lost);

  const items = /** @type {any[]} */ (lv.items);
  const last = /** @type {number} */ (lv.i) >= items.length - 1;
  const nextLabel = /** @type {number} */ (lv.hearts) <= 0 ? 'Bekijk resultaat' : !last ? 'Volgende vraag' : lv.game ? 'Naar de minigame' : 'Bekijk resultaat';
  showSheet({
    item, result: r, nextLabel,
    onNext: () => {
      if (LV !== lv) return;
      if (/** @type {number} */ (lv.hearts) <= 0) { failLevel(); return; }
      lv.i = /** @type {number} */ (lv.i) + 1;
      renderLevelItem();
    },
  });
}

/** Stoppen met de terugknop; na een antwoord eerst vragen of je het zeker weet. */
async function quitLevel() {
  if (!LV) return;
  const lv = LV;
  const busy = lv.mode === 'level' ? lv.answered > 0 && !lv.over : !!MG && MG.score > 0;
  if (busy) {
    pauseGame(true);
    const ok = await confirmDialog({
      title: lv.mode === 'level' ? 'Level stoppen?' : 'Minigame stoppen?',
      text: lv.mode === 'level' ? 'Je XP blijft staan, maar het level telt pas als je het afmaakt.' : 'Je punten van deze ronde tellen dan niet mee.',
      ok: 'Stoppen', cancel: 'Doorspelen', danger: true,
    });
    if (LV !== lv) return;
    if (!ok) { pauseGame(false); return; }
  }
  if (lv.mode === 'level') navigate('#/kaart/' + /** @type {Level} */ (lv.level).week);
  else goHome();
}

/* ---------- minigame ---------- */

/** Uitleg en startknop van een minigame. @param {string} key */
function renderGameIntro(key) {
  if (!LV) return;
  const g = GAMES[key];
  const solo = LV.mode === 'solo';
  const best = (S.best && S.best['mg-' + key]) || 0;
  $('#lvBox').innerHTML = `<div class="intro lvintro">
      <span class="badge">Minigame</span><h2 tabindex="-1" id="gTitle">${esc(g.name)}</h2><p>${fmt(g.how)}</p>
      <p><b>30 seconden.</b> Drie of meer goed op rij geeft extra punten. Je punten tellen als XP.</p>
      ${best ? `<p class="lvbest">Jouw record: <b>${nl(best)}</b></p>` : ''}
      <p class="lvkeys kbd">Toetsen <span class="keycap">1</span> t/m <span class="keycap">4</span> kiezen een antwoord.</p>
    </div>
    <div class="lvbtns"><button class="cta" type="button" id="gStart">Start minigame</button>
      ${solo ? '' : '<button class="lvlink" type="button" id="gSkip">Overslaan</button>'}</div>`;
  if (lvBot) lvBot.react('combo', 'Minigame! Laat zien wat je kan.');
  $('#gStart').addEventListener('click', () => runGame(key, solo ? endSoloGame : endLevelGame));
  const skip = document.getElementById('gSkip');
  if (skip) skip.addEventListener('click', () => { if (LV) { LV.gameScore = 0; finishLevel(); } });
  /** @type {HTMLElement} */ ($('#gStart')).focus({ preventScroll: true });
}

/** Speelt een minigame van 30 seconden. @param {string} key @param {(mg: any) => void} onEnd */
function runGame(key, onEnd) {
  if (!LV) return;
  if (LV.mode === 'level') { LV.i = /** @type {any[]} */ (LV.items).length; renderLevelHud(); }
  MG = { key, score: 0, combo: 0, best: 0, hits: 0, end: performance.now() + GAME_MS, raf: 0, sec: -1, left: GAME_MS, paused: false, round: null, onEnd };
  $('#lvBox').innerHTML = `
    <div class="gamehead"><span class="score" id="gScore">0</span><span class="combo" id="gCombo" hidden>x1</span><span class="gtime mono" id="gTime">30 s</span></div>
    <div class="gtimer" aria-hidden="true"><i id="gBar" style="width:100%"></i></div>
    <div class="gcard" id="gCard"><div class="cap" id="gCap"></div><div class="prompt" id="gPrompt"></div></div>
    <div class="tiles gtiles" id="gTiles"></div>
    <p class="sr-only" id="gLive" aria-live="polite"></p>`;
  nextRound();
  MG.raf = requestAnimationFrame(tickGame);
}

/** Nieuwe vraag in de minigame; een knop met focus houdt zijn plek. */
function nextRound() {
  if (!MG) return;
  const round = GAMES[MG.key].gen();
  MG.round = round;
  const tiles = $('#gTiles');
  const focused = document.activeElement && tiles.contains(document.activeElement) ? Number(/** @type {HTMLElement} */ (document.activeElement).dataset.g) : -1;
  $('#gCap').textContent = round.cap;
  const prompt = $('#gPrompt');
  prompt.textContent = round.prompt;
  prompt.classList.toggle('txt', !!round.text);
  tiles.style.setProperty('--cols', String(round.options.length > 3 ? 2 : round.options.length));
  tiles.innerHTML = round.options.map((o, k) => `<button class="tile mono" type="button" data-g="${k}"><span class="tkey" aria-hidden="true">${k + 1}</span><span>${esc(o)}</span></button>`).join('');
  tiles.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => hitGame(Number(/** @type {HTMLElement} */ (b).dataset.g))));
  if (focused >= 0) {
    const again = /** @type {HTMLElement | null} */ (tiles.querySelector(`[data-g="${Math.min(focused, round.options.length - 1)}"]`));
    if (again) again.focus({ preventScroll: true });
  }
}

/** Een knop in de minigame. @param {number} k */
function hitGame(k) {
  if (!MG || MG.paused || !MG.round) return;
  const round = MG.round;
  const ok = round.options[k] === round.answer;
  const card = $('#gCard');
  card.classList.remove('flash-ok', 'flash-no');
  void card.offsetWidth;
  if (ok) {
    MG.combo++;
    MG.hits++;
    MG.best = Math.max(MG.best, MG.combo);
    MG.score += 10 * (1 + Math.floor(MG.combo / 3));
    card.classList.add('flash-ok');
    sfx(MG.combo >= 3 ? 'combo' : 'ok');
    if (lvBot && MG.combo % 5 === 0) lvBot.react('combo', `${MG.combo} op rij!`);
    $('#gLive').textContent = 'Goed';
  } else {
    MG.combo = 0;
    card.classList.add('flash-no');
    sfx('bad');
    if (lvBot) lvBot.say(`Het was ${round.answer}`, 1400);
    $('#gLive').textContent = `Fout, het was ${round.answer}`;
  }
  $('#gScore').textContent = nl(MG.score);
  const combo = $('#gCombo');
  combo.hidden = MG.combo < 3;
  combo.textContent = 'x' + (1 + Math.floor(MG.combo / 3));
  combo.classList.remove('pop');
  void combo.offsetWidth;
  combo.classList.add('pop');
  nextRound();
}

/** Klok van de minigame. @param {number} now */
function tickGame(now) {
  if (!MG || MG.paused) return;
  const left = Math.max(0, MG.end - now);
  MG.left = left;
  $('#gBar').style.width = (left / GAME_MS * 100).toFixed(2) + '%';
  const sec = Math.ceil(left / 1000);
  if (sec !== MG.sec) { MG.sec = sec; $('#gTime').textContent = sec + ' s'; }
  if (left <= 0) {
    const mg = MG;
    MG = null;
    mg.onEnd(mg);
    return;
  }
  MG.raf = requestAnimationFrame(tickGame);
}

/** Pauzeert de minigame (bijvoorbeeld tijdens de stop-vraag) of gaat verder. @param {boolean} on */
function pauseGame(on) {
  if (!MG || MG.paused === on) return;
  MG.paused = on;
  if (on) { cancelAnimationFrame(MG.raf); MG.left = Math.max(0, MG.end - performance.now()); }
  else { MG.end = performance.now() + MG.left; MG.raf = requestAnimationFrame(tickGame); }
}

/** Minigame in een level is klaar: punten tellen mee, door naar het resultaat. @param {any} mg */
function endLevelGame(mg) {
  if (!LV) return;
  LV.gameScore = mg.score;
  saveGameBest(mg.key, mg.score);
  finishLevel();
}

/** Bewaart een record per minigame. @param {string} key @param {number} score @returns {boolean} nieuw record */
function saveGameBest(key, score) {
  const k = 'mg-' + key;
  if (!S.best) S.best = {};
  if (score <= (S.best[k] || 0)) return false;
  S.best[k] = score;
  save();
  return true;
}

/* ---------- resultaat ---------- */

/** Het level is uitgespeeld: sterren, XP, wat er open ging en de knoppen verder. */
function finishLevel() {
  if (!LV || LV.mode !== 'level') return;
  const lv = LV;
  lv.over = true;
  const level = /** @type {Level} */ (lv.level);
  const week = level.week;
  const levels = worldLevels(week);
  const next = levels[level.index + 1] || null;
  const stars = starsFor(/** @type {number} */ (lv.mistakes));
  const prevStars = levelStars(level.id);
  const nextWasOpen = next ? levelUnlocked(next) : false;
  const dragonWasAwake = dragonUnlocked(week);

  recordLevel(level.id, stars);
  const gameScore = /** @type {number} */ (lv.gameScore);
  if (gameScore) { S.xp += gameScore; markPlayed(); }
  const xp = /** @type {number} */ (lv.xp) + gameScore;
  save();
  renderHud();

  /** @type {string[]} */
  const news = [];
  if (next && !nextWasOpen && levelUnlocked(next)) news.push(`<p class="lvnews">${LV_ICON.open}<span>Level ${next.index + 1} is open: ${esc(shortTitle(next.title))}</span></p>`);
  if (!next && !dragonWasAwake && dragonUnlocked(week) && !dragonDefeated(week)) news.push(`<p class="lvnews fire">${LV_ICON.flame}<span>De draak is wakker! ${esc(dragonInfo(week).name)} wacht op je.</span></p>`);
  if (prevStars && stars > prevStars) news.push(`<p class="lvnews">Nieuw record: ${stars} van 3 sterren</p>`);
  const stageNow = lvStage(currentStreak());
  if (stageNow > /** @type {number} */ (lv.stageBefore) && typeof STAMPY_STAGES !== 'undefined') news.push(`<p class="upgrade">Stampy-upgrade: ${esc(STAMPY_STAGES[stageNow].name)}!</p>`);

  let primary = '';
  if (next && levelUnlocked(next)) primary = `<button class="cta" type="button" data-lv="next">Volgende level</button>`;
  else if (!next && dragonUnlocked(week) && !dragonDefeated(week)) primary = `<button class="cta fire" type="button" data-lv="boss">${LV_ICON.flame}Bevecht de draak</button>`;
  const items = /** @type {any[]} */ (lv.items);

  destroyLevelBots();
  $('#level').innerHTML = `<div class="lvresult">
    <div class="intro"><span class="badge">Level ${level.index + 1} gehaald</span><h1 tabindex="-1" id="lvResT">${esc(shortTitle(level.title))}</h1></div>
    <div class="stars" role="img" aria-label="${stars} van 3 sterren">${[0, 1, 2].map(k => LV_ICON.star(k < stars)).join('')}</div>
    <div class="bigbot lvbig" id="lvResBot"></div>
    <div class="rgrid">
      <div class="rstat"><b>${lv.correct}/${items.length}</b><small>goed</small></div>
      <div class="rstat"><b>${lv.game ? nl(gameScore) : '–'}</b><small>minigame</small></div>
      <div class="rstat"><b>+${nl(xp)}</b><small>XP</small></div>
    </div>
    ${news.join('')}
    <div class="lvbtns">${primary}
      <button class="cta${primary ? ' blue' : ''}" type="button" data-lv="map">Naar de kaart</button>
      <button class="lvlink" type="button" data-lv="again">Opnieuw spelen</button></div>
  </div>`;
  const bot = mountBot($('#lvResBot'), { bubble: false });
  LV_BOTS.push(bot);
  bot.react('win');
  sfx('win');
  confetti();
  bindResultButtons(level);
  /** @type {HTMLElement} */ ($('#lvResT')).focus({ preventScroll: true });
}

/** Geen levens meer: Stampy is verdrietig, opnieuw of terug naar de kaart. */
function failLevel() {
  if (!LV || LV.mode !== 'level') return;
  LV.over = true;
  const level = /** @type {Level} */ (LV.level);
  destroyLevelBots();
  $('#level').innerHTML = `<div class="lvresult">
    <div class="intro"><span class="badge lose">Levens op</span><h1 tabindex="-1" id="lvResT">Bijna!</h1>
      <p>Je bent je drie levens kwijt bij <b>${esc(shortTitle(level.title))}</b>. Lees de les nog eens en probeer het opnieuw. Fouten maken hoort bij leren.</p></div>
    <div class="bigbot lvbig" id="lvResBot"></div>
    <div class="rgrid two">
      <div class="rstat"><b>${LV.correct}/${LV.answered}</b><small>goed</small></div>
      <div class="rstat"><b>+${nl(/** @type {number} */ (LV.xp))}</b><small>XP</small></div>
    </div>
    <div class="lvbtns">
      <button class="cta" type="button" data-lv="again">Opnieuw proberen</button>
      <button class="cta blue" type="button" data-lv="map">Naar de kaart</button>
      <a class="lvlink" href="#/kennis/${encodeURIComponent(level.id)}">Lees de les</a></div>
  </div>`;
  const bot = mountBot($('#lvResBot'), { bubble: false });
  LV_BOTS.push(bot);
  bot.set('sad');
  bot.anim('droop');
  sfx('lose');
  bindResultButtons(level);
  /** @type {HTMLElement} */ ($('#lvResT')).focus({ preventScroll: true });
}

/** Knoppen onder het resultaat. @param {Level} level */
function bindResultButtons(level) {
  $('#level').querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => {
    const act = /** @type {HTMLElement} */ (b).dataset.lv;
    const next = worldLevels(level.week)[level.index + 1];
    if (act === 'next' && next) startLevel(next.id);
    else if (act === 'again') startLevel(level.id);
    else if (act === 'boss' && typeof startBoss === 'function') { leaveLevel(); startBoss(level.week); }
    else navigate('#/kaart/' + level.week);
  }));
}

/* ---------- losse minigame (oefen-overzicht) ---------- */

/** Speelt een minigame los; daarna terug naar waar je vandaan kwam. @param {string} key */
function startMinigame(key) {
  if (!GAMES[key]) return;
  leaveLevel();
  closeSheet();
  LV = { mode: 'solo', key, answered: 0 };
  showScreen('level');
  renderLevelFrame();
  renderGameIntro(key);
}

/** Einde van een losse minigame. @param {any} mg */
function endSoloGame(mg) {
  if (!LV) return;
  const g = GAMES[mg.key];
  S.xp += mg.score;
  if (mg.hits) markPlayed();
  const record = saveGameBest(mg.key, mg.score);
  save();
  renderHud();
  if (lvBot) lvBot.react(mg.score ? 'win' : 'think', mg.score ? `${nl(mg.score)} punten!` : 'Nog een keer?');
  if (mg.score) sfx('win');
  $('#lvBox').innerHTML = `<div class="intro lvintro"><span class="badge">Klaar</span><h2 tabindex="-1" id="gTitle">${esc(g.name)}</h2></div>
    <div class="rgrid">
      <div class="rstat"><b>${nl(mg.score)}</b><small>punten</small></div>
      <div class="rstat"><b>${mg.hits}</b><small>goed</small></div>
      <div class="rstat"><b>${mg.best}</b><small>beste reeks</small></div>
    </div>
    <p class="lvnews">${record && mg.score ? 'Nieuw record! ' : ''}+${nl(mg.score)} XP</p>
    <div class="lvbtns"><button class="cta" type="button" id="gAgain">Nog een keer</button><button class="cta blue" type="button" id="gBack">Terug</button></div>`;
  $('#gAgain').addEventListener('click', () => runGame(mg.key, endSoloGame));
  $('#gBack').addEventListener('click', () => goHome());
  /** @type {HTMLElement} */ ($('#gTitle')).focus({ preventScroll: true });
}

/* ---------- opruimen en toetsen ---------- */

function destroyLevelBots() {
  LV_BOTS.splice(0).forEach(b => b.destroy());
  lvBot = null;
}

/** Stopt een lopend level of minigame (bijvoorbeeld bij de terugknop van de browser). */
function leaveLevel() {
  if (MG) { cancelAnimationFrame(MG.raf); MG = null; }
  destroyLevelBots();
  LV = null;
}

// Minigame: toetsen 1–4 kiezen een antwoord.
document.addEventListener('keydown', e => {
  if (!MG || MG.paused || document.body.dataset.screen !== 'level') return;
  if (typeof isDialogOpen === 'function' && isDialogOpen()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (MG.round && n >= 1 && n <= MG.round.options.length) { e.preventDefault(); hitGame(n - 1); }
});
