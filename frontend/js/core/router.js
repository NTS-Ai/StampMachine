/* ---------- routing: welk scherm hoort bij de URL ----------
   Hash-routes, zodat GitHub Pages geen 404 geeft en de terugknop van de browser werkt:
     #/                 home
     #/kaart            kaart van de wereld waar je nu bent;  #/kaart/3  wereld 3
     #/oefenen          oefenen: quiz, flashcards, speedrun, typen, eindbaas
     #/kennis …         kennisbank (zie kb.js)
     #/profiel          Stampy laadt op, je stand en instellingen
     #/speeltuin        zelf Python uitproberen
   Spelschermen (quiz, flashcards, level, draak, resultaat, zoeken) hebben geen eigen route:
   de URL blijft staan op het scherm waar je vandaan kwam, en daar ga je na afloop weer heen. */

/**
 * @typedef {{ name: 'home' }
 *   | { name: 'map', world: number }
 *   | { name: 'oefenen' }
 *   | { name: 'profiel' }
 *   | { name: 'speeltuin' }
 *   | { name: 'kb', page: 'home' | 'les' | 'naslag' | 'begrippen', id?: string }} Route
 */

/** @returns {Route} */
function parseRoute(hash = location.hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'kaart': return { name: 'map', world: Number(parts[1]) || 0 };
    case 'oefenen': return { name: 'oefenen' };
    case 'profiel': return { name: 'profiel' };
    case 'speeltuin': return { name: 'speeltuin' };
    case 'kennis':
      if (!parts[1]) return { name: 'kb', page: 'home' };
      if (parts[1] === 'naslag') return { name: 'kb', page: 'naslag', id: parts[2] };
      if (parts[1] === 'begrippen') return { name: 'kb', page: 'begrippen' };
      return { name: 'kb', page: 'les', id: parts[1] };
    default: return { name: 'home' };
  }
}

/** Het laatste scherm met een route; daar ga je heen na een quiz, level of gevecht. */
let lastRoute = '#/';

/** Toont het scherm dat bij de huidige URL hoort. */
function route() {
  const r = parseRoute();
  leaveGames();
  lastRoute = location.hash || '#/';
  const open = {
    home: () => openHome(),
    map: () => openMap(r.name === 'map' ? r.world : 0),
    oefenen: () => openHub(),
    profiel: () => openProfile(),
    speeltuin: () => openPlayground(),
    kb: () => openKB(/** @type {any} */ (r)),
  }[r.name];
  open();
}

/** Gaat naar een route; ook als je er al bent wordt het scherm opnieuw getoond. @param {string} hash */
function navigate(hash) {
  if ((location.hash || '#/') === hash || (hash === '#/' && !location.hash)) route();
  else location.hash = hash;
}

/** Terug naar het scherm waar je vandaan kwam (na een quiz, level of gevecht). */
function goHome() {
  navigate(lastRoute || '#/');
}

/** Een lopend spel stopt als je naar een ander scherm gaat (bijvoorbeeld met de terugknop). */
function leaveGames() {
  if (typeof G !== 'undefined' && G) { clearInterval(tick); G = null; }
  if (typeof F !== 'undefined') F = null;
  if (typeof leaveLevel === 'function') leaveLevel();
  if (typeof leaveBoss === 'function') leaveBoss();
  if (typeof closeSheet === 'function') closeSheet();
}

/** Welk tabblad oplicht bij welk scherm. */
const TAB_OF = {
  home: 'home', map: 'map', level: 'map', boss: 'map',
  oefenen: 'oefenen', play: 'oefenen', cards: 'oefenen', result: 'oefenen', speeltuin: 'oefenen',
  kb: 'kb', profiel: 'profiel', search: '',
};

/** Markeert het actieve tabblad in de tabbalk. @param {ScreenId} screen */
function markTab(screen) {
  const active = TAB_OF[screen] || '';
  document.querySelectorAll('.nav [data-tab]').forEach(tab => {
    if (/** @type {HTMLElement} */ (tab).dataset.tab === active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  if (screen !== 'kb') document.title = APP_TITLE;
}

const APP_TITLE = document.title;

window.addEventListener('hashchange', route);

// Een klik op het tabblad waar je al bent, toont dat scherm opnieuw (bijvoorbeeld terug naar het begin).
document.querySelectorAll('.nav [data-tab]').forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    navigate(/** @type {HTMLAnchorElement} */ (tab).getAttribute('href') || '#/');
  });
});
