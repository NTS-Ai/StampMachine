/* ---------- opzoeken: vragen, flashcards en de kennisbank (lessen, naslag, begrippen) ----------
   Zoekt in de vraag, het antwoord en de uitleg. Elk zoekwoord moet ergens voorkomen;
   treffers in de vraag zelf wegen het zwaarst. */

/** @typedef {'all' | 'l' | 'b' | 'n' | 'q' | 't' | 'f'} SearchKind */

/**
 * @typedef {Object} SearchItem
 * @property {'l' | 'b' | 'n' | 'q' | 't' | 'f'} kind   Les, begrip, naslag, quizvraag, typvraag of flashcard.
 * @property {any} item              De vraag of kaart zelf; bij de kennisbank alleen { id }.
 * @property {string} [href]         Kennisbank: de pagina waar het resultaat naartoe linkt.
 * @property {string} [sub]          Kennisbank: extra context, zoals de naslag-groep.
 * @property {number} week
 * @property {string} title
 * @property {string} answer
 * @property {string} body
 * @property {string[]} hay          Genormaliseerde titel, antwoord en uitleg.
 */

const KIND_LABELS = { all: 'Alles', l: 'Lessen', b: 'Begrippen', n: 'Naslag', q: 'Quizvragen', t: 'Typvragen', f: 'Flashcards' };
/** Soorten uit de kennisbank: die linken naar een pagina in plaats van een oefening te starten. */
const KB_KINDS = ['l', 'b', 'n'];
const SEARCH_PAGE = 30;

/** Kleine letters, zonder accenten en backticks, zodat "café" en `cafe` elkaar vinden. @param {string} s */
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/`/g, '');

/** Het goede antwoord als tekst, voor elk soort item. @param {Question | Flashcard} it */
function answerOf(it) {
  if ('back' in it) return it.back;
  switch (it.type) {
    case 'choice': return it.correct;
    case 'truefalse': return it.answer ? 'Waar' : 'Niet waar';
    case 'type': return it.answers.join('  ·  ');
    case 'sentence': return it.model;
  }
  return '';
}

/** @type {SearchItem[] | null} */
let searchIndex = null;

/** De index wordt pas gebouwd als je voor het eerst zoekt. */
function buildIndex() {
  /** @param {'q' | 't' | 'f'} kind @param {Question | Flashcard} it */
  const entry = (kind, it) => {
    const q = /** @type {Question} */ (it);
    const title = 'front' in it ? it.front : q.question;
    const answer = answerOf(it);
    const body = [it.simple, q.explanation, q.code, (q.points || []).join(' '), (q.wrong || []).join(' '), (q.why_wrong || []).join(' ')]
      .filter(Boolean).join(' ');
    return { kind, item: it, week: it.week, title, answer, body, hay: [fold(title), fold(answer), fold(body)] };
  };
  return [
    ...kbEntries(),
    ...ALLQ.map(q => entry('q', q)),
    ...ALLT.map(t => entry('t', t)),
    ...ALLF.map(c => entry('f', c)),
  ];
}

/** Lessen, naslag-tabellen en begrippen, zodra de kennisbank geladen is. @returns {SearchItem[]} */
function kbEntries() {
  if (typeof KB === 'undefined' || !KB.ok) return [];
  /** @param {SearchItem['kind']} kind @param {string} id @param {number} week @param {string} title @param {string} answer @param {string} body @param {string} href @param {string} [sub] */
  const item = (kind, id, week, title, answer, body, href, sub) =>
    ({ kind, item: { id }, week, title, answer, body, href, sub, hay: [fold(title), fold(answer), fold(body)] });
  const weekOfSection = (/** @type {string} */ s) => Number(String(s || '').split('.')[0]) || 0;
  const blockText = (/** @type {KbBlock} */ b) => [b.text, b.code, b.caption, ...(b.items || []), ...(b.head || []), ...(b.rows || []).flat()].filter(Boolean).join(' ');

  return [
    ...KB.sections.map(s => item('l', 'les:' + s.id, s.week, `${s.id} ${s.title}`, s.summary,
      [s.simple, ...s.blocks.map(blockText), ...(s.takeaways || []), ...(s.tags || [])].join(' '), '#/kennis/' + s.id)),
    ...KB.terms.map(t => item('b', 'term:' + t.term, weekOfSection(t.section), t.term, t.short, t.simple,
      KB.byId.has(t.section) ? '#/kennis/' + t.section : '#/kennis/begrippen')),
    ...KB.groups.flatMap(g => g.tables.map(t => item('n', 'tab:' + t.id, weekOfSection(t.section), t.title, t.intro || '',
      [...t.head, ...t.rows.flat()].join(' '), '#/kennis/naslag/' + g.id, g.title))),
  ];
}

const SR = {
  query: '',
  /** @type {SearchKind} */ kind: 'all',
  week: 0,
  shown: SEARCH_PAGE,
  /** @type {SearchItem[]} */ hits: [],
};

/** @param {string} query */
const termsOf = query => fold(query).split(/\s+/).filter(t => t.length > 0);

/**
 * Alle treffers voor de zoekwoorden, best passend eerst. Filtert nog niet op soort of week.
 * @param {string[]} terms
 */
function findHits(terms) {
  if (!searchIndex) searchIndex = buildIndex();
  if (!terms.length) return [];
  const phrase = terms.join(' ');
  /** @type {{ it: SearchItem, score: number }[]} */
  const scored = [];
  for (const it of searchIndex) {
    const [title, answer, body] = it.hay;
    let score = 0;
    let all = true;
    for (const t of terms) {
      const s = (title.includes(t) ? 5 : 0) + (answer.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0);
      if (!s) { all = false; break; }
      score += s;
    }
    if (!all) continue;
    if (terms.length > 1 && title.includes(phrase)) score += 6;
    scored.push({ it, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.it.week - b.it.week).map(x => x.it);
}

/** Markeert de zoekwoorden in al opgemaakte HTML, maar nooit binnen een tag. @param {string} html @param {string[]} terms */
function highlight(html, terms) {
  if (!terms.length) return html;
  const words = terms.map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(' + words.join('|') + ')', 'gi');
  return html.split(/(<[^>]+>)/).map((part, i) => i % 2 ? part : part.replace(re, '<mark>$1</mark>')).join('');
}

/** Hoe goed je dit item al kent, als klein label. @param {SearchItem} it */
function statusChip(it) {
  if (it.kind === 'f') return S.fc[it.item.id] ? '<span class="sr-status ok">Zit erin</span>' : '';
  const q = /** @type {Question} */ (it.item);
  if (isWeak(q)) return '<span class="sr-status bad">Zwakke plek</span>';
  if (box(q.id) >= 2) return '<span class="sr-status ok">Zit erin</span>';
  if (S.m[q.id]) return '<span class="sr-status">Bezig</span>';
  return '';
}

/** Resultaat uit de kennisbank: een link naar de les, het begrip of de tabel. @param {SearchItem} it @param {string[]} terms @param {number} i */
function kbResultCard(it, terms, i) {
  const label = { l: 'Les', b: 'Begrip', n: 'Naslag' }[it.kind] + (it.sub ? ' · ' + esc(it.sub) : '');
  return `<article class="sr sr-kb" style="--hue:${hue(it.week)};--i:${Math.min(i, 8)}">
    <div class="sr-meta">${it.week ? `<span class="chip">Week ${it.week}</span>` : ''}<span class="sr-kind">${label}</span>
      <a class="btn sm" href="${esc(it.href || '#/kennis')}">Open</a></div>
    <h2 class="sr-title"><a href="${esc(it.href || '#/kennis')}">${highlight(fmt(it.title), terms)}</a></h2>
    ${it.answer ? `<p class="sr-answer">${highlight(fmt(it.answer), terms)}</p>` : ''}
    ${it.kind === 'b' && it.body ? `<p class="sr-simple">${highlight(fmt(it.body), terms)}</p>` : ''}
  </article>`;
}

/** @param {SearchItem} it @param {string[]} terms @param {number} i */
function resultCard(it, terms, i) {
  if (KB_KINDS.includes(it.kind)) return kbResultCard(it, terms, i);
  const q = /** @type {Question} */ (it.item);
  const kind = { q: 'Quizvraag', t: 'Typvraag', f: 'Flashcard' }[it.kind];
  let more = '';
  if (it.item.simple) more += `<div class="sr-block"><span class="lbl">Simpel gezegd</span><p>${highlight(fmt(it.item.simple), terms)}</p></div>`;
  if (q.code) more += `<pre class="code">${highlight(esc(q.code), terms)}</pre>`;
  if (q.explanation) more += `<div class="sr-block"><span class="lbl">Technisch</span><p>${highlight(fmt(q.explanation), terms)}</p></div>`;
  if (q.points && q.points.length) more += `<div class="sr-block"><span class="lbl">Moet erin staan</span><ul>${q.points.map(p => `<li>${highlight(fmt(p), terms)}</li>`).join('')}</ul></div>`;

  return `<article class="sr" style="--hue:${hue(it.week)};--i:${Math.min(i, 8)}">
    <div class="sr-meta"><span class="chip">Week ${it.week}</span><span class="sr-kind">${kind}</span>${statusChip(it)}
      ${it.kind !== 'f' ? `<button class="btn sm" type="button" data-practice="${esc(it.item.id)}">Oefen</button>` : ''}</div>
    <h2 class="sr-title">${highlight(fmt(it.title), terms)}</h2>
    <p class="sr-answer"><span class="lbl">Antwoord</span>${highlight(fmt(it.answer), terms)}</p>
    ${more ? `<details class="sr-more"><summary>Uitleg</summary>${more}</details>` : ''}
  </article>`;
}

/** Wat je ziet als je nog niets hebt ingetypt: de onderwerpen van elke week als snelle zoektermen. */
function emptyState() {
  return `<div class="sr-empty">
    <p>Typ een begrip, commando of foutmelding. Of begin bij een onderwerp:</p>
    ${WEEKS.map(w => `<div class="topic-row" style="--hue:${hue(w.week)}">
      <span class="t-num">W${w.week}</span>
      <div class="topic-chips">${w.topics.split(/,\s*/).map(t => `<button class="topic" type="button" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    </div>`).join('')}
  </div>`;
}

function renderSearch() {
  const terms = termsOf(SR.query);
  const all = findHits(terms);
  const byWeek = SR.week ? all.filter(h => h.week === SR.week) : all;

  // Aantallen per soort, zodat je ziet waar de treffers zitten.
  const counts = { all: byWeek.length, l: 0, b: 0, n: 0, q: 0, t: 0, f: 0 };
  for (const h of byWeek) counts[h.kind]++;
  $('#searchKinds').innerHTML = /** @type {SearchKind[]} */ (['all', 'l', 'b', 'n', 'q', 't', 'f']).map(k =>
    `<button class="seg-btn" type="button" role="radio" aria-checked="${SR.kind === k}" data-kind="${k}">${KIND_LABELS[k]}${terms.length ? `<span class="seg-count">${counts[k]}</span>` : ''}</button>`
  ).join('');
  $('#searchWeeks').innerHTML = [0, ...WEEKS.map(w => w.week)].map(wk =>
    `<button class="seg-btn" type="button" role="radio" aria-checked="${SR.week === wk}" data-week="${wk}" style="--hue:${hue(wk)}">${wk ? 'W' + wk : 'Alle weken'}</button>`
  ).join('');

  SR.hits = SR.kind === 'all' ? byWeek : byWeek.filter(h => h.kind === SR.kind);
  $('#searchClear').hidden = !SR.query;

  const status = $('#searchStatus');
  const results = $('#searchResults');
  if (!terms.length) {
    status.innerHTML = '';
    results.innerHTML = emptyState();
    return;
  }
  if (!SR.hits.length) {
    status.innerHTML = '';
    results.innerHTML = `<div class="sr-none"><b>Niets gevonden voor "${esc(SR.query)}"</b><p>Probeer één woord, een Engelse term (bijvoorbeeld <code>join</code> in plaats van "koppelen") of zet het filter op alles.</p></div>`;
    return;
  }

  const practiceable = SR.hits.filter(h => h.kind === 'q' || h.kind === 't');
  status.innerHTML = `<span><b>${SR.hits.length}</b> ${SR.hits.length === 1 ? 'resultaat' : 'resultaten'}</span>`
    + (practiceable.length > 1 ? `<button class="btn primary sm" type="button" id="practiceAll">Oefen deze ${Math.min(practiceable.length, 20)} vragen</button>` : '');
  results.innerHTML = SR.hits.slice(0, SR.shown).map((h, i) => resultCard(h, terms, i)).join('')
    + (SR.hits.length > SR.shown ? `<button class="btn sr-moreBtn" type="button" id="searchMore">Toon meer (${SR.hits.length - SR.shown} over)</button>` : '');
}

/** Opent het zoekscherm, eventueel met een zoekterm die al is ingetypt. @param {string} [prefill] */
function openSearch(prefill) {
  // Een nieuwe zoeksessie begint zonder filters, zodat je niet per ongeluk in één week zoekt.
  if (document.body.dataset.screen !== 'search') { SR.kind = 'all'; SR.week = 0; }
  showScreen('search');
  const input = /** @type {HTMLInputElement} */ ($('#searchIn'));
  if (prefill != null) { SR.query = prefill; SR.shown = SEARCH_PAGE; }
  input.value = SR.query;
  renderSearch();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  // De kennisbank wordt pas bij de eerste zoekopdracht geladen; daarna doen lessen en begrippen mee.
  if (typeof loadKB === 'function' && !KB.ok) {
    loadKB().then(ok => {
      if (!ok) return;
      searchIndex = null;
      if (document.body.dataset.screen === 'search') renderSearch();
    });
  }
}

/** True op schermen waar je kunt gaan zoeken zonder een lopend spel te verliezen. */
const canOpenSearch = () => ['home', 'map', 'oefenen', 'profiel', 'speeltuin', 'result', 'search', 'kb'].includes(document.body.dataset.screen || '');

/* ---------- invoer ---------- */

let searchTimer = 0;
$('#searchIn').addEventListener('input', e => {
  const value = /** @type {HTMLInputElement} */ (e.target).value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { SR.query = value; SR.shown = SEARCH_PAGE; renderSearch(); }, 90);
});

$('#searchIn').addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  // Eerste Escape wist de zoekterm, de tweede gaat terug naar het overzicht.
  const input = /** @type {HTMLInputElement} */ (e.target);
  if (SR.query) { SR.query = ''; input.value = ''; renderSearch(); }
  else { input.blur(); goHome(); }
});

$('#searchForm').addEventListener('submit', e => e.preventDefault());

$('#searchClear').addEventListener('click', () => {
  SR.query = '';
  const input = /** @type {HTMLInputElement} */ ($('#searchIn'));
  input.value = '';
  renderSearch();
  input.focus();
});

$('#searchKinds').addEventListener('click', e => {
  const btn = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-kind]'));
  if (!btn) return;
  SR.kind = /** @type {SearchKind} */ (btn.dataset.kind);
  SR.shown = SEARCH_PAGE;
  renderSearch();
});

$('#searchWeeks').addEventListener('click', e => {
  const btn = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-week]'));
  if (!btn) return;
  SR.week = Number(btn.dataset.week);
  SR.shown = SEARCH_PAGE;
  renderSearch();
});

$('#search').addEventListener('click', e => {
  const target = /** @type {HTMLElement} */ (e.target);
  const topic = /** @type {HTMLElement | null} */ (target.closest('[data-topic]'));
  if (topic) { openSearch(topic.dataset.topic); return; }

  const practice = /** @type {HTMLElement | null} */ (target.closest('[data-practice]'));
  if (practice) {
    const hit = SR.hits.find(h => h.item.id === practice.dataset.practice);
    if (hit) {
      startGame('retry', 0, [/** @type {Question} */ (hit.item)]);
      $('#modeTag').textContent = 'Oefenen · één vraag';
    }
    return;
  }
  if (target.closest('#practiceAll')) {
    const list = SR.hits.filter(h => h.kind === 'q' || h.kind === 't').map(h => /** @type {Question} */ (h.item));
    startGame('retry', 0, shuffle(list).slice(0, 20));
    $('#modeTag').textContent = 'Oefenen · ' + SR.query.trim();
    return;
  }
  if (target.closest('#searchMore')) { SR.shown += SEARCH_PAGE; renderSearch(); }
});

$('#searchBack').addEventListener('click', () => goHome());

// Een zoekveld elders (bijvoorbeeld op de home) met data-search-field opent bij typen meteen het zoekscherm.
document.addEventListener('input', e => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  if (!input.matches || !input.matches('[data-search-field]')) return;
  const value = input.value;
  input.value = '';
  openSearch(value);
});
// Een knop met data-open-search opent het zoekscherm.
document.addEventListener('click', e => {
  const btn = /** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest('[data-open-search]');
  if (btn && canOpenSearch()) openSearch();
});
