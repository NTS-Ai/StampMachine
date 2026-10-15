/* ---------- HUD: level, XP, dagen op rij, thema en geluid ---------- */

const ICONS = {
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6M22 9l-6 6"/></svg>',
};

const CHEVRON = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const CHECK = '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

/** @type {ThemePref[]} */
const THEME_ORDER = ['system', 'light', 'dark'];
/** @type {Record<ThemePref, string>} */
const THEME_LABELS = { system: 'Systeem', light: 'Licht', dark: 'Donker' };
/** @type {Record<ThemePref, string>} */
const THEME_HINTS = { system: 'Volgt je apparaat', light: 'Altijd licht', dark: 'Altijd donker' };

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function renderHud() {
  const lvl = levelInfo();
  $('#lvlName').textContent = `Lvl ${lvl.number} · ${lvl.title}`;
  $('#xpFill').style.width = (lvl.progress * 100) + '%';
  $('#xpText').textContent = nl(S.xp) + ' XP';

  const streak = currentStreak();
  $('#dayStreak').textContent = streak + (streak === 1 ? ' dag' : ' dagen') + ' op rij';

  const sound = $('#soundBtn');
  sound.innerHTML = (S.sound ? ICONS.soundOn : ICONS.soundOff) + `<span class="btn-label">${S.sound ? 'Geluid aan' : 'Geluid uit'}</span>`;
  sound.setAttribute('aria-pressed', String(S.sound));
  sound.setAttribute('aria-label', S.sound ? 'Geluid aan' : 'Geluid uit');

  renderThemeButton();
}

/* ---------- themamenu: Systeem, Licht of Donker ---------- */

const themeBtn = $('#themeBtn');
const themeMenu = $('#themeMenu');

themeMenu.innerHTML = THEME_ORDER.map(pref => `
  <button class="menu-item" role="menuitemradio" aria-checked="false" data-theme-choice="${pref}" type="button" tabindex="-1">
    ${ICONS[pref]}
    <span class="menu-text"><b>${THEME_LABELS[pref]}</b><small>${THEME_HINTS[pref]}${pref === 'system' ? ' · <span class="sys-now"></span>' : ''}</small></span>
    ${CHECK}
  </button>`).join('');

/** @returns {HTMLElement[]} */
const themeItems = () => Array.from(themeMenu.querySelectorAll('.menu-item'));

function renderThemeButton() {
  const pref = getThemePref();
  themeBtn.innerHTML = ICONS[pref] + `<span class="btn-label">${THEME_LABELS[pref]}</span>` + CHEVRON;
  themeBtn.setAttribute('aria-label', `Thema kiezen, nu: ${THEME_LABELS[pref]}`);
  themeBtn.title = `Thema: ${THEME_LABELS[pref]}`;
  for (const item of themeItems()) item.setAttribute('aria-checked', String(item.dataset.themeChoice === pref));
  themeMenu.querySelector('.sys-now').textContent = systemDark.matches ? 'nu donker' : 'nu licht';
}

function openThemeMenu() {
  themeMenu.hidden = false;
  themeBtn.setAttribute('aria-expanded', 'true');
  const current = themeItems().find(i => i.getAttribute('aria-checked') === 'true') || themeItems()[0];
  current.focus();
  document.addEventListener('pointerdown', onPointerOutside, true);
}

/** @param {boolean} [refocus] Focus terug naar de knop, bijvoorbeeld na Escape. */
function closeThemeMenu(refocus) {
  if (themeMenu.hidden) return;
  themeMenu.hidden = true;
  themeBtn.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', onPointerOutside, true);
  if (refocus) themeBtn.focus();
}

/** @param {PointerEvent} e */
function onPointerOutside(e) {
  const target = /** @type {Node} */ (e.target);
  if (!themeMenu.contains(target) && !themeBtn.contains(target)) closeThemeMenu();
}

themeBtn.addEventListener('click', () => {
  if (themeMenu.hidden) openThemeMenu();
  else closeThemeMenu();
});

themeMenu.addEventListener('click', e => {
  const item = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-theme-choice]'));
  if (!item) return;
  setThemePref(/** @type {ThemePref} */ (item.dataset.themeChoice));
  renderThemeButton();
  closeThemeMenu(true);
});

// Pijltjes, Home/End en Escape binnen het menu; de sneltoetsen van het spel krijgen ze dan niet.
themeMenu.addEventListener('keydown', e => {
  const items = themeItems();
  const at = items.indexOf(/** @type {HTMLElement} */ (document.activeElement));
  const moves = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 };
  if (e.key in moves) {
    e.preventDefault();
    items[(moves[e.key] + items.length) % items.length].focus();
  } else if (e.key === 'Escape') {
    closeThemeMenu(true);
  } else if (e.key === 'Tab') {
    closeThemeMenu();
    return;
  }
  e.stopPropagation();
});

// Verandert het systeemthema terwijl de pagina open is? Dan klopt "nu licht/donker" meteen weer.
systemDark.addEventListener('change', renderThemeButton);

/* ---------- header bij scrollen ----------
   Gescrold: de header krijgt een schaduw. Op mobiel schuift de regel met level en XP weg
   als je naar beneden scrolt en komt hij terug zodra je omhoog scrolt. */

const hud = $('.hud');
let lastScrollY = window.scrollY;

function onScroll() {
  const y = window.scrollY;
  hud.toggleAttribute('data-scrolled', y > 4);
  if (Math.abs(y - lastScrollY) < 8) return;
  hud.toggleAttribute('data-collapsed', y > lastScrollY && y > 120);
  lastScrollY = y;
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

$('#soundBtn').addEventListener('click', () => {
  S.sound = !S.sound;
  save();
  renderHud();
  if (S.sound) sfx('ok');
});
