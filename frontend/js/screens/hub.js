/* ---------- Oefenen ----------
   Het oefen-overzicht: kies een week en een manier van oefenen (quiz, flashcards, speedrun,
   typen), herhaal je zwakke plekken, neem de eindbaas op, speel een minigame of zoek iets op.
   Oefenen staat los van de kaart: elke week is hier altijd te oefenen. Op de kaart gelden de
   sloten (een level pas na het vorige), en dat laat het overzicht ook zien. */

/** Sleutel in sessionStorage voor de gekozen week. */
const HUB_WEEK_KEY = 'nts-stamp-hub-week';
/** Zoveel zwakke plekken per ronde. */
const WEAK_ROUND = 15;

/** Stampy op het oefen-overzicht. @type {any} */
let hubBot = null;

/* Iconen (inline SVG, wit op een gekleurd blokje). */
const HUB_ICON = {
  quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9.2a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9v.6"/><circle cx="12" cy="18" r=".6" fill="#fff"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="12" height="14" rx="2.5"/><path d="M8.5 3.5h9a3 3 0 0 1 3 3v11"/></svg>',
  speed: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.5 6.5l1.5-1.5"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/></svg>',
  weak: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  game: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="7" width="20" height="11" rx="5.5" fill="#fff"/><rect x="5.5" y="11.6" width="5" height="1.8" rx=".9" fill="#7B5CFF"/><rect x="7.1" y="10" width="1.8" height="5" rx=".9" fill="#7B5CFF"/><circle cx="15.5" cy="11.2" r="1.3" fill="#FF9A2E"/><circle cx="17.8" cy="14" r="1.3" fill="#2FBF71"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="M7 10l3 2.2L7 14.5M12.5 15H17"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
};

/** De gekozen week (0 = alle weken). Zonder keuze: de wereld waar je op de kaart bent. */
function hubWeek() {
  try {
    const saved = sessionStorage.getItem(HUB_WEEK_KEY);
    if (saved != null && (saved === '0' || weekOf(Number(saved)))) return Number(saved);
  } catch (e) { /* geen opslag (privévenster): dan de standaard */ }
  return typeof currentWorld === 'function' ? currentWorld() : 0;
}

/** @param {number} week */
function setHubWeek(week) {
  try { sessionStorage.setItem(HUB_WEEK_KEY, String(week)); } catch (e) { /* niet erg: alleen dit bezoek */ }
}

/** Zwakke plekken in de gekozen week (of alle weken). @param {number} week */
function hubWeak(week) {
  const all = typeof weakItems === 'function' ? weakItems() : ALLQ.concat(ALLT).filter(isWeak);
  return week ? all.filter(q => q.week === week) : all;
}

/** Flashcards van een week (of alle). @param {number} week */
const hubCards = week => (week ? weekOf(week).flashcards : ALLF);

/** Percentage, afgerond. @param {number} f */
const pct = f => Math.round(f * 100);

/** Toont het oefen-overzicht. */
function openHub() {
  const el = $('#oefenen');
  if (hubBot) hubBot.destroy();
  hubBot = null;

  el.innerHTML = `<div class="hub">
    <header class="hub-head">
      <div class="grow">
        <h1>Oefenen</h1>
        <p>Stampen in je eigen tempo. Kies een week en een manier van oefenen.</p>
      </div>
      <div class="mascot right" id="hubBot"></div>
    </header>
    <div class="hub-tip" id="hubTip" aria-live="polite"></div>
    <div class="wchips" id="hubChips" role="group" aria-label="Kies een week"></div>
    <div id="hubWeek"></div>
    <div class="sechead"><h2 class="sec-t">Eindbaas</h2><span>alle weken door elkaar</span></div>
    ${bossCard()}
    ${minigames()}
    <div class="sechead"><h2 class="sec-t">Meer</h2></div>
    <div class="hub-tools">
      <a class="hub-tool" href="#/speeltuin"><span class="qi" style="--qc:#FF5C86">${HUB_ICON.play}</span><span class="grow"><b>Speeltuin</b><small>Zelf Python uitproberen in de browser</small></span>${HUB_ICON.arrow}</a>
      <button class="hub-tool" type="button" data-open-search><span class="qi" style="--qc:#1F72D0">${HUB_ICON.search}</span><span class="grow"><b>Zoeken</b><small>Alle vragen, flashcards en lessen</small></span>${HUB_ICON.arrow}</button>
    </div>
  </div>`;

  showScreen('oefenen');
  if (typeof mountBot === 'function') hubBot = mountBot($('#hubBot'));
  renderHubWeek(hubWeek());
}

/**
 * Tekent alles wat van de gekozen week afhangt: de chips, de weekkaart met de vier
 * manieren van oefenen, de zwakke plekken en de tip van Stampy.
 * @param {number} week
 */
function renderHubWeek(week) {
  $('#hubChips').innerHTML = [0, ...WEEKS.map(w => w.week)].map(wk =>
    `<button class="wchip-btn" type="button" aria-pressed="${wk === week}" data-hub-week="${wk}" style="--wc:${hue(wk)}">${wk ? 'W' + wk : 'Alle weken'}</button>`
  ).join('');
  $('#hubWeek').innerHTML = weekPanel(week) + modeCards(week) + weakRow(week);
  $('#hubTip').innerHTML = `<b>Tip van Stampy</b><p>${esc(hubTip(week))}</p>`;
}

/** Kop van de gekozen week: titel, onderwerpen, beheersing en de stand op de kaart. @param {number} week */
function weekPanel(week) {
  const w = week ? weekOf(week) : null;
  const pool = w ? w.questions.concat(w.typing) : ALLQ.concat(ALLT);
  const m = mastery(pool);
  const mastered = pool.filter(q => box(q.id) >= 2).length;
  const title = w ? `Week ${week} · ${w.title}` : 'Alle weken';
  const topics = w ? w.topics : WEEKS.map(x => x.title).join(' · ');
  return `<section class="wk" style="--wc:${hue(week)}" aria-labelledby="wkTitle">
    <div class="wk-top">
      <span class="wk-num" aria-hidden="true">${week || '1–6'}</span>
      <div class="grow"><h2 id="wkTitle">${esc(title)}</h2><p>${esc(topics)}</p></div>
    </div>
    <div class="wk-mast">
      <div class="wk-row"><span>Beheersing</span><b>${pct(m)}%</b></div>
      <div class="pbar wk-bar" role="progressbar" aria-label="Beheersing" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(m)}"><i style="width:${m * 100}%"></i></div>
      <small>${mastered} van ${pool.length} vragen zitten erin</small>
    </div>
    ${mapStatus(week)}
  </section>`;
}

/** Hoe het met deze wereld op de kaart staat: open, of nog op slot (oefenen kan altijd). @param {number} week */
function mapStatus(week) {
  if (!week || typeof worldOpen !== 'function') return '';
  if (!worldOpen(week)) {
    return `<p class="wk-map locked">${HUB_ICON.lock}<span>Op de kaart is wereld ${week} nog op slot: versla eerst de draak van wereld ${week - 1}. Oefenen kan hier alvast.</span></p>`;
  }
  const p = worldProgress(week);
  const state = p.dragon ? 'draak verslagen' : `${p.done} van ${p.levels} levels gehaald`;
  return `<a class="wk-map" href="#/kaart/${week}">${HUB_ICON.map}<span>Op de kaart: ${state}</span><span class="wk-go">Naar wereld ${week}</span></a>`;
}

/** De vier manieren van oefenen voor een week, met beheersing en record. @param {number} week */
function modeCards(week) {
  const cards = hubCards(week);
  const known = cards.filter(c => S.fc[c.id]).length;
  const rec = (/** @type {string} */ key, /** @type {string} */ unit) => {
    const best = S.best[key + week] || 0;
    return best ? `${HUB_ICON.trophy}<span>Record ${nl(best)} ${unit}</span>` : '<span>Nog geen record</span>';
  };
  const modes = [
    { go: 'quiz', name: 'Quiz', sub: `${QUIZ_LEN} vragen met uitleg`, color: '#3AA8FF', f: mastery(poolFor('quiz', week)), label: 'beheerst', rec: rec('q', 'punten') },
    { go: 'cards', name: 'Flashcards', sub: 'Omdraaien en stampen', color: '#2FBF71', f: cards.length ? known / cards.length : 0, label: `${known}/${cards.length} zit erin`, rec: '<span>Elke kaart één keer goed</span>' },
    { go: 'speed', name: 'Speedrun', sub: 'Zo veel mogelijk in 60 s', color: '#FF5C86', f: mastery(poolFor('speed', week)), label: 'beheerst', rec: rec('s', 'punten') },
    { go: 'type', name: 'Typen', sub: `${TYPE_LEN} typvragen, zonder klok`, color: '#FF9A2E', f: mastery(poolFor('type', week)), label: 'beheerst', rec: rec('t', 'punten') },
  ];
  return `<div class="modes">${modes.map((m, i) => `<button class="mode" type="button" data-go="${m.go}" data-week="${week}" style="--qc:${m.color};--i:${i}">
      <span class="qi">${HUB_ICON[m.go]}</span>
      <b>${m.name}</b>
      <small>${esc(m.sub)}</small>
      <span class="mode-mast"><span class="pbar thin"><i style="width:${m.f * 100}%"></i></span><span>${m.go === 'cards' ? esc(m.label) : pct(m.f) + '% ' + m.label}</span></span>
      <span class="mode-rec">${m.rec}</span>
    </button>`).join('')}</div>`;
}

/** Zwakke plekken: de vragen die je laatst fout had. Rustig als er niets te herhalen is. @param {number} week */
function weakRow(week) {
  const n = hubWeak(week).length;
  const scope = week ? `in week ${week}` : 'in alle weken';
  if (!n) {
    return `<div class="weak calm"><span class="qi" style="--qc:var(--green-d)">${HUB_ICON.check}</span><span class="grow"><b>Geen zwakke plekken ${scope}</b><small>Vragen die je fout hebt, komen hier vanzelf terug.</small></span></div>`;
  }
  return `<button class="weak" type="button" data-go="weak" data-week="${week}"><span class="qi" style="--qc:var(--red-d)">${HUB_ICON.weak}</span><span class="grow"><b>Zwakke plekken <span class="weak-n">${n}</span></b><small>${n === 1 ? 'Eén vraag' : n + ' vragen'} ${scope} die je laatst fout had. Herhaal ze nu.</small></span>${HUB_ICON.arrow}</button>`;
}

/** De eindbaas: Pager om 03:00, vragen uit alle weken. */
function bossCard() {
  const best = S.best.boss || 0;
  const wins = S.best.bossWins || 0;
  const m = mastery(ALLQ);
  const stats = [best ? `Record ${nl(best)}` : '', wins ? `${wins}× gewonnen` : ''].filter(Boolean).join(' · ');
  return `<section class="bosscard" aria-labelledby="bossTitle">
    <div class="pager" aria-hidden="true"><span>03:00</span><i></i></div>
    <div class="grow">
      <h3 id="bossTitle">Pager om 03:00</h3>
      <p>Productie ligt eruit. Vragen uit alle zes weken, drie levens en 20 seconden per vraag. Sla 25 keer raak; vijf op rij doet dubbele schade.</p>
      <p class="boss-stats">${pct(m)}% van alles beheerst${stats ? ' · ' + stats : ''}</p>
      <button class="cta" type="button" data-go="boss" data-week="0">Neem de pager op</button>
    </div>
  </section>`;
}

/** Minigames uit de levels (als de kaart ze aanbiedt). */
function minigames() {
  if (typeof GAMES === 'undefined' || typeof startMinigame !== 'function' || !GAMES) return '';
  const list = Array.isArray(GAMES) ? GAMES.map((g, i) => [g && g.key != null ? g.key : i, g]) : Object.entries(GAMES);
  if (!list.length) return '';
  return `<div class="sechead"><h2 class="sec-t">Minigames</h2><span>30 seconden, zo veel mogelijk goed</span></div>
    <div class="games">${list.map(([key, g]) => `<button class="game" type="button" data-game="${esc(key)}">
      <span class="qi" style="--qc:${(GAME_LOOK[key] || {}).color || '#7B5CFF'}">${(GAME_LOOK[key] || {}).icon || HUB_ICON.game}</span>
      <b>${esc((g && (g.name || g.title)) || key)}</b>
      ${g && (g.how || g.desc) ? `<small>${fmt(g.how || g.desc)}</small>` : ''}
    </button>`).join('')}</div>`;
}

/** Eigen icoon en kleur per minigame, zodat je ze niet alleen aan de titel herkent. Onbekende games krijgen de gamepad. */
const GAME_LOOK = {
  types: { color: '#2F6FD6', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12.5 11.5 4H20v8.5L11.5 21z"/><circle cx="15.5" cy="8.5" r="1.4" fill="#fff"/></svg>' },
  arith: { color: '#D2691E', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h6M7 4v6M14 7h6M5 15l4 4M9 15l-4 4M14 15h6M14 19h6"/></svg>' },
  slice: { color: '#C2305F', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8.2 8.5 20 18M8.2 15.5 20 6"/></svg>' },
  loops: { color: '#178A5C', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="m7 22-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>' },
  sql: { color: '#3A4FC4', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/></svg>' },
  http: { color: '#6A4BEF', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>' },
};

/** Een tip die past bij waar je staat. @param {number} week */
function hubTip(week) {
  const scope = week ? `week ${week}` : 'alle weken';
  if (typeof progressWasCleared !== 'undefined' && progressWasCleared) {
    return 'Je had meer dan 30 dagen niet geoefend, dus je voortgang is opnieuw begonnen. Begin rustig met de flashcards.';
  }
  const weak = hubWeak(week).length;
  if (weak >= 3) return `Je hebt ${weak} zwakke plekken in ${scope}. Herhaal die eerst: wat je net fout had, onthoud je het best als je het snel opnieuw doet.`;
  const cards = hubCards(week);
  const known = cards.filter(c => S.fc[c.id]).length;
  if (known < cards.length / 2) return `Nieuw in ${scope}? Begin met de flashcards. Daarna gaat de quiz een stuk makkelijker.`;
  const m = mastery(poolFor('quiz', week));
  if (m < .5) return `Doe de quiz van ${scope}. Na elke vraag krijg je uitleg, en foute vragen komen aan het eind terug.`;
  if (mastery(poolFor('type', week)) < .5) return 'Typen is lastiger dan kiezen. Probeer de typ-modus: zonder klok, en een kleine typfout mag.';
  if (!S.best['s' + week]) return `Dit gaat goed. Zet een record neer met de speedrun van ${scope}.`;
  return 'Je bent er klaar voor. Neem de pager op en versla de eindbaas.';
}

/* ---------- klikken ---------- */

$('#oefenen').addEventListener('click', e => {
  const target = /** @type {HTMLElement} */ (e.target);
  const chip = /** @type {HTMLElement | null} */ (target.closest('[data-hub-week]'));
  if (chip) {
    const week = Number(chip.dataset.hubWeek);
    setHubWeek(week);
    renderHubWeek(week);
    const again = /** @type {HTMLElement | null} */ (document.querySelector(`[data-hub-week="${week}"]`));
    if (again) again.focus();
    return;
  }
  const game = /** @type {HTMLElement | null} */ (target.closest('[data-game]'));
  if (game && typeof startMinigame === 'function') {
    const key = game.dataset.game || '';
    startMinigame(Array.isArray(GAMES) && /^\d+$/.test(key) ? Number(key) : key);
    return;
  }
  const btn = /** @type {HTMLElement | null} */ (target.closest('[data-go]'));
  if (!btn) return;
  const week = Number(btn.dataset.week) || 0;
  const go = btn.dataset.go;
  if (go === 'cards') startCards(week);
  else if (go === 'weak') {
    const weak = hubWeak(week);
    if (weak.length) startGame('retry', week, shuffle(weak).slice(0, WEAK_ROUND));
  } else startGame(/** @type {GameMode} */ (go), week);
});
