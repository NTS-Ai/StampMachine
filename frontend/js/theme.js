/* ---------- thema: systeem, licht of donker ----------
   Dit script staat in <head>, zodat het thema al goed staat voordat de pagina tekent. */

/** @typedef {'system' | 'light' | 'dark'} ThemePref */

const THEME_KEY = 'nts-stamp-theme';
const THEME_COLORS = { light: '#ECEFF6', dark: '#0E1220' };

/** @returns {ThemePref} */
function getThemePref() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch (e) { /* opslag geblokkeerd: val terug op het systeem */ }
  return 'system';
}

/** @param {ThemePref} pref */
function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;

  // De kleur van de adresbalk op mobiel volgt de keuze.
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    const scheme = /** @type {HTMLElement} */ (meta).dataset.scheme;
    meta.setAttribute('content', pref === 'system' ? THEME_COLORS[scheme] : THEME_COLORS[pref]);
  });
}

/** @param {ThemePref} pref */
function setThemePref(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch (e) { /* niet opslaan is geen ramp: het thema geldt dan alleen voor deze sessie */ }
  applyTheme(pref);
}

applyTheme(getThemePref());
