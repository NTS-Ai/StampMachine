/* ---------- kennisbank: lessen, naslag en begrippen (zoals W3Schools) ----------
   De inhoud staat in data/kb/ en wordt pas geladen als je de kennisbank of het zoeken opent.
   Routes: #/kennis · #/kennis/1.2 · #/kennis/naslag · #/kennis/naslag/<groep> · #/kennis/begrippen */

/**
 * @typedef {Object} KbBlock
 * @property {'h' | 'p' | 'code' | 'table' | 'list' | 'note'} type
 * @property {string} [text]
 * @property {string} [lang]
 * @property {string} [code]
 * @property {string} [output]
 * @property {string} [caption]
 * @property {boolean} [run]
 * @property {string[]} [head]
 * @property {string[][]} [rows]
 * @property {string[]} [items]
 * @property {boolean} [ordered]
 * @property {'tip' | 'info' | 'warn'} [tone]
 */

/**
 * @typedef {Object} KbSection
 * @property {string} id
 * @property {string} title
 * @property {string} [kind]       'assessment' voor de eindopdracht van een week.
 * @property {string} summary
 * @property {number} [minutes]
 * @property {string} simple
 * @property {KbBlock[]} blocks
 * @property {string[]} takeaways
 * @property {string} [exercise]
 * @property {string[]} [checklist]
 * @property {{ label: string, url: string }[]} links
 * @property {string[]} [tags]
 * @property {number} week          Wordt bij het laden ingevuld.
 */

/** @typedef {{ id: string, title: string, intro: string, section: string, head: string[], rows: string[][] }} KbTable */
/** @typedef {{ id: string, title: string, tables: KbTable[] }} KbGroup */
/** @typedef {{ term: string, short: string, simple: string, section: string }} KbTerm */

const KB = {
  /** @type {Promise<boolean> | null} */ loading: null,
  ok: false,
  /** @type {{ week: number, title: string, sections: KbSection[] }[]} */ weeks: [],
  /** @type {KbSection[]} */ sections: [],
  /** @type {Map<string, KbSection>} */ byId: new Map(),
  /** @type {KbGroup[]} */ groups: [],
  /** @type {KbTerm[]} */ terms: [],
  /** Code van de blokken op de huidige pagina, voor kopiëren en uitvoeren. @type {string[]} */ codes: [],
  /** Teller voor unieke namen van tabellen op de huidige pagina. */ tables: 0,
  /** Stampy's op de huidige pagina; worden opgeruimd bij de volgende pagina. @type {any[]} */ bots: [],
  /** Stampy bij de inleverlijst, die reageert op het afvinken. @type {any} */ checkBot: null,
};

const KB_TITLE = document.title;

/** Tekst uit de data: escapen, `code` en **vet**. Nooit ruwe HTML. @param {string} s */
const kbText = s => fmt(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

/** @param {string} url */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/** Laadt alle kennisbank-data één keer. @returns {Promise<boolean>} */
function loadKB() {
  if (KB.loading) return KB.loading;
  KB.loading = (async () => {
    const lessonFiles = WEEKS.map(w => fetchJson(`data/kb/lessons/w${w.week}.json`).catch(() => null));
    const [lessons, reference, glossary] = await Promise.all([
      Promise.all(lessonFiles),
      fetchJson('data/kb/reference.json').catch(() => ({ groups: [] })),
      fetchJson('data/kb/glossary.json').catch(() => []),
    ]);
    KB.weeks = lessons.filter(Boolean).map(l => {
      for (const s of l.sections) s.week = l.week;
      return l;
    });
    KB.sections = KB.weeks.flatMap(w => w.sections);
    KB.byId = new Map(KB.sections.map(s => [s.id, s]));
    KB.groups = reference.groups || [];
    const sortKey = (/** @type {KbTerm} */ t) => fold(t.term).replace(/^[^a-z0-9]+/, '');
    KB.terms = (Array.isArray(glossary) ? glossary : []).slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'nl'));
    KB.ok = KB.sections.length > 0;
    return KB.ok;
  })().catch(() => false);
  return KB.loading;
}

/* Routing (#/kennis …) staat in js/core/router.js; die roept openKB aan. */

/* ---------- openen en de zijbalk ---------- */

/** @param {Route & { name: 'kb' }} r */
async function openKB(r) {
  leaveGames();
  closeKbDrawer();
  showScreen('kb');
  const main = $('#kbMain');
  if (!KB.ok) {
    clearKbBots();
    main.dataset.page = 'laden';
    main.innerHTML = '<div class="kb-loading" aria-busy="true"><span></span><span></span><span></span></div>';
    const ok = await loadKB();
    if (!ok) {
      main.dataset.page = 'fout';
      main.innerHTML = `<div class="kb-empty"><h1>Kennisbank niet geladen</h1><p>De lessen konden niet worden opgehaald. Open de site via een webserver (bijvoorbeeld <code>python -m http.server</code>), niet als los bestand.</p></div>`;
      buildToc();
      return;
    }
    renderKbNav();
  }
  if (parseRoute().name !== 'kb') return; // intussen weggenavigeerd

  clearKbBots();
  KB.codes = [];
  KB.tables = 0;
  let title = 'Kennisbank';
  let page = 'home';
  let html = '';
  if (r.page === 'home') html = kbHomePage();
  else if (r.page === 'begrippen') { html = kbGlossaryPage(); page = 'begrippen'; title = 'Begrippen A–Z'; }
  else if (r.page === 'naslag') {
    const group = KB.groups.find(g => g.id === r.id);
    html = group ? kbGroupPage(group) : kbReferencePage();
    page = group ? 'groep' : 'naslag';
    title = group ? `${group.title} · Naslag` : 'Naslag';
  } else {
    const sec = KB.byId.get(r.id || '');
    html = sec ? kbLessonPage(sec) : kbNotFound();
    page = sec ? 'les' : '404';
    title = sec ? `${sec.id} ${sec.title}` : 'Pagina niet gevonden';
  }
  // Het paginatype bepaalt de vorm: een lesvel van glas, of losse kaarten en tegels.
  main.dataset.page = page;
  main.innerHTML = html;
  mountKbBots(main);
  markScrollableCode(main);
  document.title = `${title} · Kennisbank · Stampy Python Eiland`;
  markKbNav(location.hash);
  buildToc();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- Stampy in de kennisbank ---------- */

/** Zet Stampy in elk hoekje met data-kb-bot ('hero', 'simple', 'check' of '404'). @param {HTMLElement} root */
function mountKbBots(root) {
  if (typeof mountBot !== 'function') return;
  root.querySelectorAll('[data-kb-bot]').forEach(el => {
    const host = /** @type {HTMLElement} */ (el);
    const kind = host.dataset.kbBot;
    // Alleen bij de inleverlijst praat Stampy terug; elders staat zijn tekst vast op de pagina.
    const bot = mountBot(host, { bubble: kind === 'check' });
    if (kind === 'hero') bot.set('happy');
    else if (kind === '404') bot.set('sad');
    KB.bots.push(bot);
    if (kind === 'check') KB.checkBot = bot;
  });
}

/**
 * Een codeblok dat breder is dan de kolom, scrolt opzij. Zo'n blok krijgt een tabstop en een naam,
 * zodat je het ook met het toetsenbord kunt scrollen (zoals de tabellen).
 * @param {HTMLElement} root
 */
function markScrollableCode(root) {
  root.querySelectorAll('.cb-code').forEach(el => {
    const pre = /** @type {HTMLElement} */ (el);
    if (pre.scrollWidth <= pre.clientWidth + 1) return;
    const lang = pre.closest('.code-block')?.querySelector('.cb-lang')?.textContent || 'Code';
    pre.tabIndex = 0;
    pre.setAttribute('role', 'region');
    pre.setAttribute('aria-label', `Codevoorbeeld ${lang}, scrolt opzij`);
  });
}

/** Ruimt de Stampy's van de vorige pagina op. */
function clearKbBots() {
  KB.bots.forEach(b => b.destroy());
  KB.bots = [];
  KB.checkBot = null;
}

function renderKbNav() {
  const weeks = KB.weeks.map(w => `<details class="kbn-group" data-week="${w.week}" style="--wc:${hue(w.week)}">
      <summary><span class="kbn-num" aria-hidden="true">${w.week}</span><span><span class="sr-only">Wereld ${w.week}: </span>${esc(w.title)}</span></summary>
      <ul>${w.sections.map(s => `<li><a class="kbn-link" href="#/kennis/${esc(s.id)}"><span class="kbn-id">${s.kind === 'assessment' ? 'Opdracht' : esc(s.id)}</span><span>${esc(s.title)}</span></a></li>`).join('')}</ul>
    </details>`).join('');
  const groups = KB.groups.length ? `<details class="kbn-group">
      <summary><span class="kbn-num icon">${ICON_TABLE}</span><span>Naslag</span></summary>
      <ul><li><a class="kbn-link" href="#/kennis/naslag"><span>Alle tabellen</span></a></li>${KB.groups.map(g => `<li><a class="kbn-link" href="#/kennis/naslag/${esc(g.id)}"><span>${esc(g.title)}</span></a></li>`).join('')}</ul>
    </details>` : '';
  $('#kbNav').innerHTML = `
    <a class="kbn-link kbn-top" href="#/kennis">${ICON_HOME}<span>Overzicht</span></a>
    ${KB.terms.length ? `<a class="kbn-link kbn-top" href="#/kennis/begrippen">${ICON_BOOK}<span>Begrippen A–Z</span></a>` : ''}
    ${weeks}${groups}`;
}

/** Zet de huidige pagina in de zijbalk aan en klapt de juiste week open. @param {string} hash */
function markKbNav(hash) {
  let current = null;
  $('#kbNav').querySelectorAll('.kbn-link').forEach(a => {
    const on = a.getAttribute('href') === hash || (hash === '#/kennis/' && a.getAttribute('href') === '#/kennis');
    if (on) { a.setAttribute('aria-current', 'page'); current = a; }
    else a.removeAttribute('aria-current');
  });
  if (current) {
    const group = /** @type {HTMLElement} */ (current).closest('details');
    if (group) /** @type {HTMLDetailsElement} */ (group).open = true;
    /** @type {HTMLElement} */ (current).scrollIntoView({ block: 'nearest' });
  }
}

/* ---------- pagina's ---------- */

const ICON_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>';
const ICON_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/></svg>';
const ICON_TABLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICON_EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const ICON_NEXT = '<svg class="kb-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
const ICON_MAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';
const ICON_CARDS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="7" y="3" width="13" height="17" rx="2.5" transform="rotate(8 13 11)"/><rect x="4" y="5" width="13" height="17" rx="2.5"/></svg>';
const CALLOUT = {
  tip: { label: 'Tip', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>' },
  info: { label: 'Goed om te weten', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>' },
  warn: { label: 'Let op', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>' },
};
const LANG_NAMES = { python: 'Python', bash: 'Terminal', sql: 'SQL', json: 'JSON', yaml: 'YAML', toml: 'TOML', dockerfile: 'Dockerfile', ini: 'Config', text: 'Tekst', http: 'HTTP' };

/** Waar je op de kaart bent: de wereld en of je al iets gespeeld hebt (de kaart is optioneel). */
function kbWhere() {
  const world = typeof currentWorld === 'function' ? currentWorld() : 1;
  const started = typeof mapTotals === 'function' ? mapTotals().done > 0 : false;
  return { world, started };
}

/** Eén wereldkaart op het overzicht: de lessen van die week en de stand op de kaart. @param {{ week: number, title: string, sections: KbSection[] }} w */
function kbWorldCard(w) {
  const p = typeof worldProgress === 'function' ? worldProgress(w.week) : null;
  // Lezen mag altijd; spelen pas als de wereld op de kaart open is.
  const open = typeof worldOpen === 'function' ? worldOpen(w.week) : true;
  const state = !p ? 'Speel de levels van deze wereld'
    : !open ? 'Op de kaart nog op slot, lezen kan al'
    : p.dragon ? `Alle ${p.levels} levels en de draak gehaald`
    : `${p.done} van ${p.levels} levels gehaald`;
  return `<article class="kb-world" style="--wc:${hue(w.week)}" aria-labelledby="kbw-${w.week}">
      <div class="kb-world-head"><span class="kb-wnum" aria-hidden="true">${w.week}</span><div><p class="kb-wlabel">Wereld ${w.week}</p><h3 id="kbw-${w.week}">${esc(w.title)}</h3></div></div>
      <ol class="kb-wlist">${w.sections.map(s => `<li><a href="#/kennis/${esc(s.id)}"><span class="kbn-id">${s.kind === 'assessment' ? 'Opdracht' : esc(s.id)}</span><span>${esc(s.title)}</span>${s.minutes ? `<small>${s.minutes} min</small>` : ''}</a></li>`).join('')}</ol>
      <a class="kb-wmap" href="#/kaart/${w.week}">${open ? ICON_MAP : ICON_LOCK}<span>${state}</span><span class="go">Naar de kaart</span></a>
    </article>`;
}

function kbHomePage() {
  const { world, started } = kbWhere();
  const here = KB.weeks.find(w => w.week === world) || KB.weeks[0];
  const start = here && here.sections[0];
  const tables = KB.groups.reduce((n, g) => n + g.tables.length, 0);
  const tip = started && here
    ? `Je bent in wereld ${here.week}. Lees de les voordat je het level speelt.`
    : 'Hoi! Lees eerst een les, dan gaat het level op de kaart veel makkelijker.';
  return `<header class="kb-hero">
      <div class="kb-hero-text">
        <p class="kb-eyebrow">Kennisbank</p>
        <h1>Alles uit het workbook, om na te lezen.</h1>
        <p class="kb-lead">Per les een uitleg in gewone taal, codevoorbeelden die je kunt kopiëren of zelf uitvoeren, opzoektabellen en een begrippenlijst. Zoek met <kbd class="keycap">/</kbd>.</p>
        <div class="kb-hero-btns">
          ${start ? `<a class="cta kb-cta" href="#/kennis/${esc(start.id)}">${started ? `Lees wereld ${here.week}` : `Begin bij ${esc(start.id)}`}${ICON_NEXT}</a>` : ''}
          <button class="kb-glassbtn" type="button" data-kb-search>${ICON_SEARCH}Zoek in de kennisbank</button>
        </div>
      </div>
      <div class="kb-hero-bot">
        <span class="kb-float" style="left:-6px;bottom:96px" aria-hidden="true">def</span>
        <span class="kb-float" style="right:-10px;bottom:46px;animation-delay:-1.6s" aria-hidden="true">print()</span>
        <p class="kb-say">${esc(tip)}</p>
        <div class="kb-bot-host" data-kb-bot="hero"></div>
      </div>
    </header>
    <h2 class="kb-sec-t">Werelden</h2>
    <div class="kb-wgrid">${KB.weeks.map(kbWorldCard).join('')}</div>
    <h2 class="kb-sec-t">Opzoeken</h2>
    <div class="kb-tiles">
      ${KB.groups.length ? `<a class="kb-tile" href="#/kennis/naslag" style="--ic:var(--blue-d)"><span class="kb-tile-ic">${ICON_TABLE}</span><b>Naslag</b><span>${tables} opzoektabellen: methodes, commando's, statuscodes en meer.</span>${ICON_NEXT}</a>` : ''}
      ${KB.terms.length ? `<a class="kb-tile" href="#/kennis/begrippen" style="--ic:var(--green-d)"><span class="kb-tile-ic">${ICON_BOOK}</span><b>Begrippen A–Z</b><span>${KB.terms.length} begrippen, elk in één zin en in gewone taal.</span>${ICON_NEXT}</a>` : ''}
    </div>`;
}

/** @param {KbSection} sec */
function kbLessonPage(sec) {
  const i = KB.sections.indexOf(sec);
  const prev = KB.sections[i - 1];
  const next = KB.sections[i + 1];
  const week = KB.weeks.find(w => w.week === sec.week);
  const practice = ALLQ.concat(ALLT).filter(q => q.section === sec.id);
  const cards = ALLF.filter(c => c.section === sec.id);
  const isTask = sec.kind === 'assessment';

  let h = `<nav class="kb-crumbs" aria-label="Kruimelpad"><a href="#/kennis">Kennisbank</a><span aria-hidden="true">/</span><span>Week ${sec.week}${week ? ' · ' + esc(week.title) : ''}</span></nav>
    <header class="kb-head" style="--wc:${hue(sec.week)}">
      <div class="kb-meta"><span class="kb-chip">${isTask ? 'Eindopdracht' : 'Les ' + esc(sec.id)}</span>${sec.minutes ? `<span class="kb-time">${sec.minutes} min</span>` : ''}</div>
      <h1>${esc(sec.title)}</h1>
      <p class="kb-lead">${kbText(sec.summary)}</p>
    </header>
    ${kbSimpleHtml(sec, !isTask)}
    <div class="kb-toc-inline" id="kbTocInline" hidden></div>
    <div class="prose">${sec.blocks.map(renderBlock).join('')}</div>`;

  if (sec.takeaways && sec.takeaways.length) {
    h += `<section class="kb-box kb-takeaways"><div class="kb-box-h">${ICON_CHECK}<h2>Onthoud</h2></div><ul>${sec.takeaways.map(t => `<li>${kbText(t)}</li>`).join('')}</ul></section>`;
  }
  if (sec.checklist && sec.checklist.length) h += checklistHtml(sec);
  if (sec.exercise) {
    h += `<section class="kb-box kb-exercise"><div class="kb-box-h">${ICON_PENCIL}<h2>Oefening uit het workbook</h2></div><p>${kbText(sec.exercise)}</p></section>`;
  }
  if (practice.length || cards.length) {
    h += `<section class="kb-practice" style="--wc:${hue(sec.week)}">
        <div><h2>Oefen deze les</h2><p>${practice.length ? `${practice.length} ${practice.length === 1 ? 'vraag' : 'vragen'}` : ''}${practice.length && cards.length ? ' en ' : ''}${cards.length ? `${cards.length} flashcards` : ''} over precies deze stof.</p></div>
        <div class="kb-practice-btns">
          ${practice.length ? `<button class="cta kb-cta" type="button" data-kb-practice="${esc(sec.id)}">${ICON_PLAY}Oefen ${Math.min(practice.length, 15)} vragen</button>` : ''}
          ${cards.length ? `<button class="kb-tilebtn" type="button" data-kb-cards="${esc(sec.id)}">${ICON_CARDS}Flashcards</button>` : ''}
        </div>
      </section>`;
  }
  if (sec.links && sec.links.length) {
    h += `<section class="kb-links"><h2>Verder lezen</h2><ul>${sec.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}${ICON_EXT}<span class="sr-only"> (opent in een nieuw tabblad)</span></a></li>`).join('')}</ul></section>`;
  }
  h += `<nav class="kb-pager" aria-label="Vorige en volgende les">
      ${prev ? `<a class="kb-pager-link prev" href="#/kennis/${esc(prev.id)}"><small>Vorige</small><span>${esc(prev.id)} ${esc(prev.title)}</span></a>` : '<span></span>'}
      ${next ? `<a class="kb-pager-link next" href="#/kennis/${esc(next.id)}"><small>Volgende</small><span>${esc(next.id)} ${esc(next.title)}</span></a>` : '<span></span>'}
    </nav>`;
  return h;
}

/**
 * "Simpel gezegd" als tekstballon. Bij een gewone les zegt Stampy het; bij een eindopdracht
 * staat Stampy al bij de inleverlijst, dan alleen de ballon.
 * @param {KbSection} sec @param {boolean} withBot
 */
function kbSimpleHtml(sec, withBot) {
  return `<div class="kb-simple${withBot ? '' : ' no-bot'}">
      ${withBot ? '<div class="mascot kb-mini" data-kb-bot="simple"></div>' : ''}
      <div class="kb-simple-text"><span class="kb-label">Simpel gezegd</span><p>${kbText(withoutLabel(sec.simple))}</p></div>
    </div>`;
}

/** @param {KbBlock} b */
function renderBlock(b) {
  switch (b.type) {
    case 'h': return `<h2>${kbText(b.text || '')}</h2>`;
    case 'p': return `<p>${kbText(b.text || '')}</p>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag}>${(b.items || []).map(it => `<li>${kbText(it)}</li>`).join('')}</${tag}>`;
    }
    case 'note': {
      const c = CALLOUT[b.tone || 'info'] || CALLOUT.info;
      return `<div class="callout callout-${b.tone || 'info'}">${c.icon}<div><span class="kb-label">${c.label}</span><p>${kbText(b.text || '')}</p></div></div>`;
    }
    case 'table': return tableHtml(b.head || [], b.rows || [], '');
    case 'code': return codeBlockHtml(b);
  }
  return '';
}

/** @param {string[]} head @param {string[][]} rows @param {string} label */
function tableHtml(head, rows, label) {
  // Elke scrollbare tabel krijgt een eigen naam, zodat schermlezers ze uit elkaar houden.
  const name = label || `Tabel ${++KB.tables}: ${head.join(', ').replace(/`/g, '')}`;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(name)}"><table>
      <thead><tr>${head.map(c => `<th scope="col">${kbText(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${kbText(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

/** @param {KbBlock} b */
function codeBlockHtml(b) {
  const lang = (b.lang || 'text').toLowerCase();
  const i = KB.codes.push(b.code || '') - 1;
  return `<figure class="code-block" data-code="${i}">
      <div class="cb-head">
        <span class="cb-lang">${esc(LANG_NAMES[lang] || lang)}</span>
        <div class="cb-actions">
          ${b.run ? `<button class="cb-btn cb-try" type="button" data-act="try">${ICON_PLAY}<span>Probeer het zelf</span></button>` : ''}
          <button class="cb-btn" type="button" data-act="copy" aria-label="Kopieer code">${ICON_COPY}<span>Kopieer</span></button>
        </div>
      </div>
      <pre class="cb-code"><code>${highlightCode(b.code || '', lang)}</code></pre>
      ${b.output ? `<div class="cb-out"><span class="cb-out-lbl">Uitvoer</span><pre>${esc(b.output)}</pre></div>` : ''}
      ${b.caption ? `<figcaption>${kbText(b.caption)}</figcaption>` : ''}
    </figure>`;
}

/* ---------- afvinklijst bij een eindopdracht ---------- */

const CHECK_KEY = 'nts-kb-checks';

/** @returns {Record<string, boolean>} */
function loadChecks() {
  try {
    const v = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}

/** @param {number} done @param {number} total */
const checkCountHtml = (done, total) => `<b>${done}</b> van ${total} afgevinkt · wordt alleen in deze browser bewaard`;

/** @param {KbSection} sec */
function checklistHtml(sec) {
  const checks = loadChecks();
  const list = sec.checklist || [];
  const done = list.filter((_, i) => checks[`${sec.id}:${i}`]).length;
  return `<section class="kb-box kb-checklist">
      <div class="kb-check-top">
        <div class="mascot left kb-mini" data-kb-bot="check"></div>
        <div>
          <h2>Inleverlijst</h2>
          <p class="kb-check-count" aria-live="polite">${checkCountHtml(done, list.length)}</p>
          <div class="kb-check-bar" aria-hidden="true"><i style="width:${list.length ? Math.round(done / list.length * 100) : 0}%"></i></div>
        </div>
      </div>
      <ul>${list.map((item, i) => `<li><label><input type="checkbox" data-check="${esc(sec.id)}:${i}"${checks[`${sec.id}:${i}`] ? ' checked' : ''}><span>${kbText(item)}</span></label></li>`).join('')}</ul>
    </section>`;
}

/* ---------- naslag en begrippen ---------- */

function kbReferencePage() {
  return `<nav class="kb-crumbs" aria-label="Kruimelpad"><a href="#/kennis">Kennisbank</a><span aria-hidden="true">/</span><span>Naslag</span></nav>
    <header class="kb-head-card"><span class="kb-tile-ic" style="--ic:var(--blue-d)">${ICON_TABLE}</span>
      <div><h1>Opzoektabellen</h1><p class="kb-lead">Snel de juiste methode, het juiste commando of de betekenis van een statuscode vinden. Elke tabel verwijst naar de les waar het vandaan komt.</p></div></header>
    <div class="kb-tiles">${KB.groups.map((g, i) => `<a class="kb-tile compact" href="#/kennis/naslag/${esc(g.id)}" style="--ic:${hue((i % 6) + 1)}"><span class="kb-tile-ic">${ICON_TABLE}</span><b>${esc(g.title)}</b><span>${g.tables.map(t => esc(t.title)).join(' · ')}</span></a>`).join('')}</div>`;
}

/** @param {KbGroup} g */
function kbGroupPage(g) {
  return `<nav class="kb-crumbs" aria-label="Kruimelpad"><a href="#/kennis">Kennisbank</a><span aria-hidden="true">/</span><a href="#/kennis/naslag">Naslag</a></nav>
    <header class="kb-head"><div class="kb-meta"><span class="kb-chip">Naslag</span></div><h1>${esc(g.title)}</h1><p class="kb-lead">${g.tables.length} tabellen om op te zoeken.</p></header>
    <div class="kb-toc-inline" id="kbTocInline" hidden></div>
    <div class="prose">${g.tables.map(t => `<h2>${esc(t.title)}</h2>
      <p class="kb-table-intro">${kbText(t.intro || '')}${t.section && KB.byId.has(t.section) ? ` <a class="kb-src" href="#/kennis/${esc(t.section)}">Les ${esc(t.section)}</a>` : ''}</p>
      ${tableHtml(t.head, t.rows, t.title)}`).join('')}</div>`;
}

function kbGlossaryPage() {
  const letters = [...new Set(KB.terms.map(t => firstLetter(t.term)))].sort((a, b) => Number(a === '#') - Number(b === '#') || a.localeCompare(b));
  return `<nav class="kb-crumbs" aria-label="Kruimelpad"><a href="#/kennis">Kennisbank</a><span aria-hidden="true">/</span><span>Begrippen</span></nav>
    <header class="kb-head-card"><span class="kb-tile-ic" style="--ic:var(--green-d)">${ICON_BOOK}</span>
      <div><h1>Begrippen A–Z</h1><p class="kb-lead">${KB.terms.length} begrippen uit de zes weken. Elk begrip in één zin, plus een uitleg in gewone taal.</p></div></header>
    <div class="gl-tools">
      <label class="gl-filter">${ICON_SEARCH}<input id="glFilter" type="search" placeholder="Filter begrippen" aria-label="Filter begrippen" autocomplete="off"></label>
      <nav class="gl-letters" aria-label="Spring naar letter">${letters.map(l => `<button type="button" data-letter="${esc(l)}">${esc(l)}</button>`).join('')}</nav>
    </div>
    <div class="gl-list" id="glList">${letters.map(l => `<section class="gl-letter" data-letter-group="${esc(l)}"><h2 id="gl-${esc(l)}">${esc(l)}</h2>
      <dl>${KB.terms.filter(t => firstLetter(t.term) === l).map(t => `<div class="gl-item" data-term="${esc(fold(t.term + ' ' + t.short))}" style="--wc:${hue(Number(String(t.section).split('.')[0]) || 0)}">
        <dt>${kbText(t.term)}</dt><dd><p>${kbText(t.short)}</p><p class="gl-simple">${kbText(t.simple)}</p>${KB.byId.has(t.section) ? `<a class="kb-src" href="#/kennis/${esc(t.section)}">Les ${esc(t.section)}</a>` : ''}</dd>
      </div>`).join('')}</dl></section>`).join('')}</div>
    <p class="gl-none" id="glNone" hidden>Geen begrip gevonden. Probeer het zoeken met <kbd class="keycap">/</kbd>.</p>`;
}

/** Haalt een dubbel "Simpel gezegd:" aan het begin weg; dat staat al in het label. @param {string} s */
const withoutLabel = s => {
  const rest = String(s || '').replace(/^\s*simpel gezegd\s*[:,]\s*/i, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

/** @param {string} term */
const firstLetter = term => {
  const c = fold(term).replace(/^[^a-z0-9]+/, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
};

function kbNotFound() {
  return `<div class="kb-empty">
      <div class="kb-bot-host" data-kb-bot="404"></div>
      <h1>Deze pagina bestaat niet</h1>
      <p>Stampy heeft overal gezocht, maar deze les staat er niet. Misschien is hij verplaatst. Kies een onderwerp of zoek in de kennisbank.</p>
      <div class="kb-hero-btns">
        <a class="cta kb-cta" href="#/kennis">Naar het overzicht</a>
        <button class="kb-tilebtn" type="button" data-kb-search>${ICON_SEARCH}Zoeken</button>
      </div>
    </div>`;
}

/* ---------- inhoudsopgave "Op deze pagina" ---------- */

/** @type {IntersectionObserver | null} */
let tocSpy = null;

function buildToc() {
  const heads = Array.from($('#kbMain').querySelectorAll('.prose > h2'));
  const side = $('#kbToc');
  const inline = document.querySelector('#kbTocInline');
  if (tocSpy) { tocSpy.disconnect(); tocSpy = null; }
  // Zonder inhoudsopgave krijgt de pagina de ruimte van de rechterkolom.
  $('#kbLayout').classList.toggle('no-toc', heads.length < 2);
  if (heads.length < 2) { side.innerHTML = ''; if (inline) /** @type {HTMLElement} */ (inline).hidden = true; return; }

  heads.forEach((h, i) => { h.id = h.id || `kb-h-${i}`; });
  const links = heads.map(h => `<li><a href="#/kennis" data-toc="${h.id}">${esc(h.textContent || '')}</a></li>`).join('');
  side.innerHTML = `<p class="toc-title">Op deze pagina</p><ul>${links}</ul>`;
  if (inline) {
    inline.innerHTML = `<details><summary>Op deze pagina (${heads.length})</summary><ul>${links}</ul></details>`;
    /** @type {HTMLElement} */ (inline).hidden = false;
  }

  if ('IntersectionObserver' in window) {
    tocSpy = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        side.querySelectorAll('[data-toc]').forEach(a => a.classList.toggle('on', /** @type {HTMLElement} */ (a).dataset.toc === e.target.id));
      }
    }, { rootMargin: '-40px 0px -70% 0px' });
    heads.forEach(h => tocSpy && tocSpy.observe(h));
  }
}

/* ---------- interactie op de pagina's ---------- */

$('#kb').addEventListener('click', e => {
  const target = /** @type {HTMLElement} */ (e.target);

  const toc = /** @type {HTMLElement | null} */ (target.closest('[data-toc]'));
  if (toc) {
    e.preventDefault();
    const h = document.getElementById(toc.dataset.toc || '');
    if (h) { h.scrollIntoView({ block: 'start' }); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    return;
  }
  const btn = /** @type {HTMLElement | null} */ (target.closest('[data-act]'));
  if (btn) {
    const fig = /** @type {HTMLElement} */ (btn.closest('.code-block'));
    if (btn.dataset.act === 'copy') copyCode(btn, fig);
    else if (btn.dataset.act === 'try') openEditor(fig);
    else if (btn.dataset.act === 'run') runEditor(fig);
    else if (btn.dataset.act === 'reset') resetEditor(fig);
    return;
  }
  const practice = /** @type {HTMLElement | null} */ (target.closest('[data-kb-practice]'));
  if (practice) {
    const id = practice.dataset.kbPractice || '';
    const list = ALLQ.concat(ALLT).filter(q => q.section === id);
    startGame('retry', 0, shuffle(list).slice(0, 15));
    const tag = document.querySelector('#modeTag');
    if (tag) tag.textContent = 'Oefenen · les ' + id;
    return;
  }
  const cards = /** @type {HTMLElement | null} */ (target.closest('[data-kb-cards]'));
  if (cards) {
    const id = cards.dataset.kbCards || '';
    startCards(0, ALLF.filter(c => c.section === id));
    const tag = document.querySelector('#fcTag');
    if (tag) tag.textContent = 'Flashcards · les ' + id;
    return;
  }
  if (target.closest('[data-kb-search]')) { closeKbDrawer(); openSearch(''); return; }
  const letter = /** @type {HTMLElement | null} */ (target.closest('[data-letter]'));
  if (letter) {
    const h = document.getElementById('gl-' + letter.dataset.letter);
    if (h) h.scrollIntoView({ block: 'start' });
  }
});

$('#kb').addEventListener('change', e => {
  const box = /** @type {HTMLInputElement} */ (e.target);
  if (!box.matches('[data-check]')) return;
  const checks = loadChecks();
  if (box.checked) checks[box.dataset.check || ''] = true;
  else delete checks[box.dataset.check || ''];
  try { localStorage.setItem(CHECK_KEY, JSON.stringify(checks)); } catch (err) { /* niet bewaren is geen ramp */ }
  const section = box.closest('.kb-checklist');
  if (section) {
    const all = section.querySelectorAll('[data-check]');
    const done = section.querySelectorAll('[data-check]:checked').length;
    const count = section.querySelector('.kb-check-count');
    if (count) count.innerHTML = checkCountHtml(done, all.length);
    const bar = /** @type {HTMLElement | null} */ (section.querySelector('.kb-check-bar i'));
    if (bar) setBar(bar, done / all.length);
    // Stampy kijkt mee bij het afvinken, en juicht als alles af is.
    if (KB.checkBot && box.checked) {
      const left = all.length - done;
      if (left === 0) KB.checkBot.react('win', 'Alles afgevinkt. Inleveren maar!');
      else KB.checkBot.react('ok', left === 1 ? 'Nog één te gaan.' : `Nog ${left} te gaan.`);
    }
  }
});

$('#kb').addEventListener('input', e => {
  const input = /** @type {HTMLInputElement} */ (e.target);
  if (input.id === 'glFilter') {
    const q = fold(input.value.trim());
    let shown = 0;
    document.querySelectorAll('.gl-item').forEach(el => {
      const hit = !q || (/** @type {HTMLElement} */ (el).dataset.term || '').includes(q);
      /** @type {HTMLElement} */ (el).hidden = !hit;
      if (hit) shown++;
    });
    document.querySelectorAll('.gl-letter').forEach(sec => {
      /** @type {HTMLElement} */ (sec).hidden = !sec.querySelector('.gl-item:not([hidden])');
    });
    $('#glNone').hidden = shown > 0;
  } else if (input.id === 'kbFilter') {
    const q = fold(input.value.trim());
    $('#kbNav').querySelectorAll('li').forEach(li => { /** @type {HTMLElement} */ (li).hidden = !!q && !fold(li.textContent || '').includes(q); });
    $('#kbNav').querySelectorAll('details').forEach(d => {
      const any = d.querySelector('li:not([hidden])');
      /** @type {HTMLElement} */ (d).hidden = !!q && !any;
      if (q && any) /** @type {HTMLDetailsElement} */ (d).open = true;
    });
  }
});

/* ---------- code kopiëren ---------- */

/** @param {HTMLElement} btn @param {HTMLElement} fig */
async function copyCode(btn, fig) {
  const editor = /** @type {HTMLTextAreaElement | null} */ (fig.querySelector('.cb-input'));
  const code = editor ? editor.value : KB.codes[Number(fig.dataset.code)];
  let ok = false;
  try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { ok = false; }
  const label = btn.querySelector('span');
  if (label) {
    label.textContent = ok ? 'Gekopieerd' : 'Kopiëren lukt niet';
    btn.classList.toggle('done', ok);
    setTimeout(() => { label.textContent = 'Kopieer'; btn.classList.remove('done'); }, 1600);
  }
}

/* ---------- Probeer het zelf: Python in de browser ---------- */

const PY = {
  /** @type {Worker | null} */ worker: null,
  /** @type {Promise<boolean> | null} */ ready: null,
  busy: false,
  nextId: 1,
};
/** Na zoveel milliseconden stopt een run, zodat een oneindige lus de pagina niet bevriest. */
const PY_TIMEOUT = 8000;

function pyWorker() {
  if (PY.worker && PY.ready) return PY.ready;
  const worker = new Worker('js/kb/py-worker.js');
  PY.worker = worker;
  PY.ready = new Promise(resolve => {
    const onMsg = (/** @type {MessageEvent} */ e) => {
      if (e.data.type === 'ready') { worker.removeEventListener('message', onMsg); resolve(true); }
      if (e.data.type === 'fatal') { worker.removeEventListener('message', onMsg); resolve(false); }
    };
    worker.addEventListener('message', onMsg);
    worker.addEventListener('error', () => resolve(false));
  });
  return PY.ready;
}

function killWorker() {
  if (PY.worker) PY.worker.terminate();
  PY.worker = null;
  PY.ready = null;
}

/** @param {HTMLElement} fig */
function openEditor(fig) {
  if (fig.classList.contains('editing')) return;
  const code = KB.codes[Number(fig.dataset.code)];
  fig.classList.add('editing');
  const pre = /** @type {HTMLElement} */ (fig.querySelector('.cb-code'));
  pre.insertAdjacentHTML('afterend', `<div class="cb-editor">
      <label class="sr-only" for="cb-in-${fig.dataset.code}">Pas de code aan</label>
      <textarea class="cb-input" id="cb-in-${fig.dataset.code}" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.min(18, code.split('\n').length + 1)}">${esc(code)}</textarea>
      <div class="cb-run-bar">
        <button class="cb-run" type="button" data-act="run">${ICON_PLAY}<span>Run</span></button>
        <button class="cb-reset" type="button" data-act="reset">Herstel</button>
        <span class="hint kbd">Ctrl+Enter = run</span>
      </div>
      <div class="cb-result" aria-live="polite"></div>
    </div>`);
  pre.hidden = true;
  const tryBtn = fig.querySelector('.cb-try');
  if (tryBtn) /** @type {HTMLElement} */ (tryBtn).hidden = true;
  const input = /** @type {HTMLTextAreaElement} */ (fig.querySelector('.cb-input'));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runEditor(fig); }
    else if (e.key === 'Tab' && !e.shiftKey) {
      // Tab spring in de editor in, zoals in een echte code-editor. Esc en dan Tab gaat verder.
      e.preventDefault();
      const s = input.selectionStart;
      input.setRangeText('    ', s, input.selectionEnd, 'end');
    } else if (e.key === 'Escape') {
      /** @type {HTMLElement} */ (fig.querySelector('[data-act="run"]')).focus();
    }
  });
  input.focus();
  runEditor(fig);
}

/** @param {HTMLElement} fig */
function resetEditor(fig) {
  const input = /** @type {HTMLTextAreaElement} */ (fig.querySelector('.cb-input'));
  input.value = KB.codes[Number(fig.dataset.code)];
  /** @type {HTMLElement} */ (fig.querySelector('.cb-result')).innerHTML = '';
  input.focus();
}

/** @param {HTMLElement} fig */
async function runEditor(fig) {
  if (PY.busy) return;
  const input = /** @type {HTMLTextAreaElement} */ (fig.querySelector('.cb-input'));
  const result = /** @type {HTMLElement} */ (fig.querySelector('.cb-result'));
  const runBtn = /** @type {HTMLButtonElement} */ (fig.querySelector('[data-act="run"]'));
  PY.busy = true;
  runBtn.disabled = true;

  const firstLoad = !PY.ready;
  result.innerHTML = `<p class="cb-status"><span class="spinner" aria-hidden="true"></span>${firstLoad ? 'Python wordt geladen. De eerste keer duurt dit even (ongeveer 10 MB).' : 'Bezig…'}</p>`;
  const ok = await pyWorker();
  if (!ok) {
    killWorker();
    result.innerHTML = '<p class="cb-status err">Python kon niet worden geladen. Controleer je internetverbinding en probeer het opnieuw.</p>';
    PY.busy = false; runBtn.disabled = false;
    return;
  }

  const id = PY.nextId++;
  const worker = /** @type {Worker} */ (PY.worker);
  let out = '';
  let err = '';
  const started = performance.now();
  const outcome = await new Promise(resolve => {
    const timer = setTimeout(() => { worker.removeEventListener('message', onMsg); resolve('timeout'); }, PY_TIMEOUT);
    function onMsg(/** @type {MessageEvent} */ e) {
      if (e.data.id !== id) return;
      if (e.data.type === 'out') out += e.data.text;
      else if (e.data.type === 'err') err += e.data.text;
      else {
        if (e.data.type === 'error') err += e.data.text;
        clearTimeout(timer);
        worker.removeEventListener('message', onMsg);
        resolve(e.data.type);
      }
    }
    worker.addEventListener('message', onMsg);
    worker.postMessage({ id, code: input.value });
  });
  if (outcome === 'timeout') killWorker();

  const secs = ((performance.now() - started) / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  let h = '';
  if (out) h += `<pre class="cb-stdout">${esc(out.replace(/\n$/, ''))}</pre>`;
  if (err) h += `<pre class="cb-stderr">${esc(err.trim())}</pre>`;
  if (!out && !err && outcome !== 'timeout') h += '<p class="cb-status">Klaar, maar er is niets geprint. Gebruik <code>print()</code> om iets te zien.</p>';
  if (outcome === 'timeout') h += `<p class="cb-status err">Gestopt na ${PY_TIMEOUT / 1000} seconden. Zit er een oneindige lus in je code?</p>`;
  else h += `<p class="cb-status ${outcome === 'error' ? 'err' : 'ok'}">${outcome === 'error' ? 'Fout' : 'Klaar'} in ${secs} s</p>`;
  result.innerHTML = h;
  PY.busy = false;
  runBtn.disabled = false;
}

/* ---------- zijbalk als lade op mobiel ---------- */

function openKbDrawer() {
  const side = $('#kbSide');
  side.classList.add('open');
  $('#kbBackdrop').hidden = false;
  $('#kbMenuBtn').setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
  /** @type {HTMLElement} */ ($('#kbFilter')).focus();
}

function closeKbDrawer() {
  const side = document.querySelector('#kbSide');
  if (!side || !side.classList.contains('open')) return;
  side.classList.remove('open');
  $('#kbBackdrop').hidden = true;
  $('#kbMenuBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
}

$('#kbMenuBtn').addEventListener('click', () => {
  if ($('#kbSide').classList.contains('open')) closeKbDrawer();
  else openKbDrawer();
});
$('#kbBackdrop').addEventListener('click', () => { closeKbDrawer(); $('#kbMenuBtn').focus(); });
$('#kbClose').addEventListener('click', () => { closeKbDrawer(); $('#kbMenuBtn').focus(); });
$('#kbSide').addEventListener('keydown', e => {
  if (!$('#kbSide').classList.contains('open')) return;
  if (e.key === 'Escape') { e.stopPropagation(); closeKbDrawer(); $('#kbMenuBtn').focus(); return; }
  if (e.key !== 'Tab') return;
  // Focus blijft in de lade zolang die open is.
  const items = Array.from($('#kbSide').querySelectorAll('button, input, a, summary')).filter(el => /** @type {HTMLElement} */ (el).offsetParent !== null);
  const first = /** @type {HTMLElement} */ (items[0]);
  const last = /** @type {HTMLElement} */ (items[items.length - 1]);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
