/* ---------- vraag-motor voor de kaart: levels en drakengevechten ----------
   Toont één vraag of puzzel in de stijl van het ontwerp (dikke 3D-tegels, invulvelden,
   code-puzzels) en meldt het antwoord terug. De feedback komt in de sheet onderin.

   Gebruik:
     renderPlayItem(box, item, { onAnswer: r => { ... } })
       r = { outcome: 'right' | 'almost' | 'wrong', right: string | null, isCode: boolean,
             open: boolean, chosen?: number, spelling?: string }
     showSheet({ item, result, nextLabel: 'Verder', onNext })
     closeSheet()

   Toetsenbord: 1–9 kiest een tegel, Enter controleert of gaat verder. */

/** @typedef {Question | Puzzle} PlayItem */
/** @typedef {{ outcome: 'right' | 'almost' | 'wrong', right: string | null, isCode: boolean, open: boolean, chosen?: number, spelling?: string }} AnswerResult */

const PLAY_TYPE_LABEL = {
  choice: 'Kies het goede antwoord',
  truefalse: 'Waar of niet waar?',
  type: 'Typ het antwoord',
  sentence: 'Leg het uit in je eigen woorden',
  fill: 'Vul het gat in',
  parsons: 'Puzzel de code',
  card: 'Weet je dit nog?',
};

/** Code licht kleuren met de kleuring van de kennisbank (veilig: alles wordt ge-escaped). @param {string} code */
const playCode = code => (typeof highlightCode === 'function' ? highlightCode(code, 'python') : esc(code));

/** Antwoorden bij gaten invullen: spaties en aanhalingstekens tellen niet. @param {string} s */
const fillNorm = s => String(s).trim().replace(/^['"`]|['"`]$/g, '').replace(/\s+/g, '');

/** De vraag die nu op het scherm staat, voor het toetsenbord. */
let PQ = null;

/**
 * @param {HTMLElement} box
 * @param {PlayItem} item
 * @param {{ onAnswer: (r: AnswerResult) => void }} opts
 */
function renderPlayItem(box, item, opts) {
  closeSheet();
  const q = /** @type {any} */ (item);
  const state = { item, box, done: false, onAnswer: opts.onAnswer, order: null, pool: null, picked: null };
  PQ = state;

  let h = `<div class="qtype">${PLAY_TYPE_LABEL[q.type] || ''}</div>`;
  h += `<h2 class="qtitle">${fmt(q.question)}</h2>`;
  if (q.code && q.type !== 'fill') h += `<pre class="code">${playCode(q.code)}</pre>`;

  if (q.type === 'choice' || q.type === 'truefalse') {
    const opts2 = q.type === 'choice'
      ? shuffle([q.correct, ...q.wrong].map((text, index) => ({ text, ok: index === 0, index })))
      : [{ text: 'Waar', ok: q.answer === true, index: -1 }, { text: 'Niet waar', ok: q.answer === false, index: -1 }];
    state.order = opts2;
    // Lange antwoorden (zinnen of code) onder elkaar, korte naast elkaar als dikke tegels.
    const long = opts2.some(o => o.text.length > 18);
    const cols = long ? 1 : opts2.length === 4 ? 2 : opts2.length;
    h += `<div class="tiles${long ? ' long' : ''}" style="--cols:${cols}">${opts2.map((o, k) => {
      const mono = /`/.test(o.text) || /^[\[\]{}()'"0-9.\-]/.test(o.text);
      return `<button class="tile${mono ? ' mono' : ''}" type="button" data-k="${k}"><span class="tkey" aria-hidden="true">${k + 1}</span><span>${fmt(o.text)}</span></button>`;
    }).join('')}</div>`;
  } else if (q.type === 'type') {
    h += `<input class="field" id="pqAns" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="Typ je antwoord…" aria-label="Je antwoord">
      <button class="cta" type="button" id="pqCheck">Controleer</button>`;
  } else if (q.type === 'fill') {
    const parts = String(q.code).split('___');
    h += `<pre class="code">${playCode(parts[0])}<input class="blank" id="pqAns" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Wat hoort in het gat?">${playCode(parts[1] || '')}</pre>
      <button class="cta" type="button" id="pqCheck">Controleer</button>`;
  } else if (q.type === 'parsons') {
    state.pool = shuffle(q.lines.map((l, k) => ({ l, k })));
    if (state.pool.every((x, k) => x.k === k)) state.pool.reverse();
    state.picked = [];
    h += `<div class="parsons"><span class="plabel">Jouw code</span><div class="pzone" id="pqAnsZone" aria-live="polite"></div>
      <span class="plabel">Tik op een regel om hem toe te voegen</span><div class="parsons" id="pqPool"></div></div>
      <button class="cta" type="button" id="pqCheck" disabled>Controleer</button>`;
  } else if (q.type === 'card') {
    h += `<div class="pcard" id="pqCard"><div class="pcard-back" id="pqBack" hidden>${fmt(q.back)}</div></div>
      <button class="cta blue" type="button" id="pqFlip">Draai om</button>`;
  } else if (q.type === 'sentence') {
    h += `<textarea class="field" id="pqAns" placeholder="Schrijf je uitleg… (een paar zinnen is genoeg)" aria-label="Jouw uitleg"></textarea>
      <button class="cta" type="button" id="pqCheck">Laat het modelantwoord zien</button>`;
  }
  box.innerHTML = h;

  box.querySelectorAll('.tile[data-k]').forEach(b => b.addEventListener('click', () => pickTile(state, Number(/** @type {HTMLElement} */ (b).dataset.k))));
  if (q.type === 'parsons') renderParsonsPick(state);
  if (q.type === 'card') bindCardItem(state);
  const check = box.querySelector('#pqCheck');
  if (check) check.addEventListener('click', () => checkPlayItem(state));
  const field = /** @type {HTMLInputElement | null} */ (box.querySelector('#pqAns'));
  if (field && q.type !== 'sentence') {
    field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkPlayItem(state); } });
  }
  if (field && !isTouch()) setTimeout(() => field.focus({ preventScroll: true }), 60);
}

/** @param {any} state @param {number} k */
function pickTile(state, k) {
  if (state.done || !state.order || !state.order[k]) return;
  state.done = true;
  const btns = Array.from(state.box.querySelectorAll('.tile[data-k]'));
  btns.forEach(b => { /** @type {HTMLButtonElement} */ (b).disabled = true; });
  const chosen = state.order[k];
  const okIndex = state.order.findIndex(o => o.ok);
  btns[k].classList.add(chosen.ok ? 'ok' : 'no');
  if (!chosen.ok && btns[okIndex]) btns[okIndex].classList.add('ok');
  const q = state.item;
  state.onAnswer({ outcome: chosen.ok ? 'right' : 'wrong', right: rightAnswerText(q), isCode: false, open: false, chosen: chosen.index });
}

/** Flashcard-item: omdraaien en zelf zeggen of je het wist. Kost nooit een leven. @param {any} state */
function bindCardItem(state) {
  const flip = /** @type {HTMLButtonElement} */ (state.box.querySelector('#pqFlip'));
  flip.addEventListener('click', () => {
    /** @type {HTMLElement} */ (state.box.querySelector('#pqBack')).hidden = false;
    flip.remove();
    state.box.insertAdjacentHTML('beforeend', `<div class="tiles" style="--cols:2"><button class="tile" type="button" data-know="0">Nog niet</button><button class="tile" type="button" data-know="1">Wist ik</button></div>`);
    state.box.querySelectorAll('[data-know]').forEach(b => b.addEventListener('click', () => {
      if (state.done) return;
      state.done = true;
      state.box.querySelectorAll('[data-know]').forEach(x => { /** @type {HTMLButtonElement} */ (x).disabled = true; });
      const knew = /** @type {HTMLElement} */ (b).dataset.know === '1';
      b.classList.add(knew ? 'ok' : 'no');
      state.onAnswer({ outcome: knew ? 'right' : 'almost', right: null, isCode: false, open: true });
    }));
    /** @type {HTMLElement} */ (state.box.querySelector('[data-know="1"]')).focus({ preventScroll: true });
  });
  if (!isTouch()) setTimeout(() => flip.focus({ preventScroll: true }), 60);
}

/** @param {any} state */
function renderParsonsPick(state) {
  const zone = state.box.querySelector('#pqAnsZone');
  const pool = state.box.querySelector('#pqPool');
  zone.innerHTML = state.picked.map((x, k) => `<button class="pline" type="button" data-a="${k}" aria-label="Regel ${k + 1}: ${esc(x.l)}. Tik om terug te zetten">${esc(x.l)}</button>`).join('')
    || '<span class="pempty">Nog leeg</span>';
  pool.innerHTML = state.pool.map((x, k) => `<button class="pline" type="button" data-p="${k}">${esc(x.l)}</button>`).join('');
  zone.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    if (state.done) return;
    state.pool.push(state.picked.splice(Number(/** @type {HTMLElement} */ (b).dataset.a), 1)[0]);
    renderParsonsPick(state);
  }));
  pool.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
    if (state.done) return;
    state.picked.push(state.pool.splice(Number(/** @type {HTMLElement} */ (b).dataset.p), 1)[0]);
    renderParsonsPick(state);
    const next = /** @type {HTMLElement | null} */ (pool.querySelector('[data-p]'));
    if (next) next.focus({ preventScroll: true });
    else /** @type {HTMLElement} */ (state.box.querySelector('#pqCheck')).focus({ preventScroll: true });
  }));
  /** @type {HTMLButtonElement} */ (state.box.querySelector('#pqCheck')).disabled = state.pool.length > 0 || state.done;
}

/** @param {any} state */
function checkPlayItem(state) {
  if (state.done) return;
  const q = /** @type {any} */ (state.item);
  const field = /** @type {HTMLInputElement | null} */ (state.box.querySelector('#pqAns'));
  const check = /** @type {HTMLButtonElement | null} */ (state.box.querySelector('#pqCheck'));

  if (q.type === 'type') {
    if (!field || !field.value.trim()) { if (field) field.focus(); return; }
    state.done = true;
    const r = matchTyped(q, field.value);
    field.disabled = true; field.classList.add(r.ok ? 'ok' : 'no');
    if (check) check.disabled = true;
    state.onAnswer({ outcome: r.ok ? 'right' : 'wrong', right: q.answers[0], isCode: true, open: false, spelling: r.spelling });
  } else if (q.type === 'fill') {
    if (!field || !field.value.trim()) { if (field) field.focus(); return; }
    state.done = true;
    const ok = q.answers.some(a => fillNorm(a) === fillNorm(field.value));
    field.disabled = true; field.classList.add(ok ? 'ok' : 'no');
    if (check) check.disabled = true;
    state.onAnswer({ outcome: ok ? 'right' : 'wrong', right: q.code.replace('___', q.answers[0]), isCode: true, open: false });
  } else if (q.type === 'parsons') {
    if (state.pool.length) return;
    state.done = true;
    const ok = state.picked.every((x, k) => x.k === k);
    if (check) check.disabled = true;
    state.box.querySelector('#pqAnsZone').classList.add(ok ? 'ok' : 'no');
    state.onAnswer({ outcome: ok ? 'right' : 'wrong', right: q.lines.join('\n'), isCode: true, open: false });
  } else if (q.type === 'sentence') {
    if (field) field.disabled = true;
    if (check) check.remove();
    const points = q.points || [];
    state.box.insertAdjacentHTML('beforeend', `<div class="model"><b>Modelantwoord</b>${fmt(q.model)}</div>
      <div class="plabel">Wat zat er in jouw uitleg?</div>
      <div class="checks">${points.map((p, k) => `<label><input type="checkbox" data-ck="${k}">${fmt(p)}</label>`).join('')}</div>
      <button class="cta blue" type="button" id="pqSelf">Klaar met nakijken</button>`);
    const self = /** @type {HTMLButtonElement} */ (state.box.querySelector('#pqSelf'));
    self.focus({ preventScroll: true });
    self.addEventListener('click', () => {
      if (state.done) return;
      state.done = true;
      self.disabled = true;
      const n = state.box.querySelectorAll('[data-ck]:checked').length;
      const outcome = n >= Math.ceil(points.length / 2) ? 'right' : n > 0 ? 'almost' : 'wrong';
      state.onAnswer({ outcome, right: null, isCode: false, open: true });
    });
  }
}

/** Het goede antwoord als tekst, voor elk soort item. @param {any} q */
function rightAnswerText(q) {
  switch (q.type) {
    case 'choice': return q.correct;
    case 'truefalse': return q.answer ? 'Waar' : 'Niet waar';
    case 'type': return q.answers[0];
    case 'fill': return q.answers[0];
    case 'parsons': return q.lines.join('\n');
    default: return null;
  }
}

/* ---------- feedback-sheet onderin ---------- */

/**
 * @param {{ item: PlayItem, result: AnswerResult, nextLabel?: string, title?: string, onNext: () => void }} o
 */
function showSheet({ item, result, nextLabel = 'Verder', title, onNext }) {
  const q = /** @type {any} */ (item);
  const ok = result.outcome === 'right';
  const half = result.outcome === 'almost';
  const sheet = $('#sheet');
  sheet.className = 'sheet ' + (ok ? 'ok' : 'no');
  let h = `<h3 id="sheetTitle">${esc(title || (ok ? randomOf(['Goed!', 'Top!', 'Precies!']) : half ? 'Bijna' : 'Niet goed'))}</h3>`;
  if (result.spelling) h += `<p>Let op de schrijfwijze: <code>${esc(result.spelling)}</code></p>`;
  if (!ok && result.right != null) {
    h += result.isCode && /\n/.test(result.right)
      ? `<p>Juist is:</p><pre class="code">${playCode(result.right)}</pre>`
      : `<p>Juist is: <b>${fmt(result.right)}</b></p>`;
  }
  if (q.simple) h += `<p class="simple"><b>Simpel gezegd</b>${fmt(q.simple)}</p>`;
  if (!ok && q.type === 'choice' && q.why_wrong && result.chosen > 0 && q.why_wrong[result.chosen - 1]) {
    h += `<p class="simple"><b>Waarom niet</b>${fmt(q.why_wrong[result.chosen - 1])}</p>`;
  }
  if (q.explanation) h += `<details class="sheet-more"><summary>Technische uitleg</summary><p>${fmt(q.explanation)}</p></details>`;
  if (q.section) h += `<a class="sheet-les" href="#/kennis/${esc(q.section)}" target="_blank" rel="noopener">Lees de les hierover (${esc(q.section)})<span class="sr-only">, opent in een nieuw tabblad</span></a>`;
  h += `<button class="cta" type="button" id="sheetNext">${esc(nextLabel)}</button>`;
  sheet.innerHTML = h;
  sheet.setAttribute('aria-labelledby', 'sheetTitle');
  requestAnimationFrame(() => sheet.classList.add('on'));
  const btn = /** @type {HTMLButtonElement} */ ($('#sheetNext'));
  btn.addEventListener('click', () => { closeSheet(); onNext(); }, { once: true });
  setTimeout(() => { if (document.activeElement !== btn) btn.focus({ preventScroll: true }); }, 320);
}

function closeSheet() {
  const sheet = document.querySelector('#sheet');
  if (sheet) sheet.classList.remove('on');
}

/** Sneltoetsen: 1–9 voor tegels, Enter voor controleren of verder. Alleen op de kaart-schermen. */
document.addEventListener('keydown', e => {
  const screen = document.body.dataset.screen;
  if (screen !== 'level' && screen !== 'boss') return;
  const t = /** @type {HTMLElement} */ (e.target);
  const typing = (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && !t.disabled;
  const sheetOpen = $('#sheet').classList.contains('on');
  if (sheetOpen && e.key === 'Enter' && !(t instanceof HTMLButtonElement)) { e.preventDefault(); $('#sheetNext').click(); return; }
  if (typing || sheetOpen || !PQ || PQ.done) return;
  const n = parseInt(e.key, 10);
  if (PQ.order && n >= 1 && n <= PQ.order.length) { e.preventDefault(); pickTile(PQ, n - 1); }
});
