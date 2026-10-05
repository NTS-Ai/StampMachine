/* ---------- HUD: level, XP, dagen op rij, thema en geluid ---------- */

const ICONS = {
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6M22 9l-6 6"/></svg>',
};

/** @type {Record<ThemePref, string>} */
const THEME_LABELS = { system: 'Systeem', light: 'Licht', dark: 'Donker' };
/** @type {Record<ThemePref, ThemePref>} */
const NEXT_THEME = { system: 'light', light: 'dark', dark: 'system' };

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

function renderThemeButton() {
  const pref = getThemePref();
  const btn = $('#themeBtn');
  btn.innerHTML = ICONS[pref] + `<span class="btn-label">${THEME_LABELS[pref]}</span>`;
  btn.setAttribute('aria-label', `Thema: ${THEME_LABELS[pref]}. Tik om te wisselen naar ${THEME_LABELS[NEXT_THEME[pref]]}.`);
  btn.title = `Thema: ${THEME_LABELS[pref]}`;
}

$('#themeBtn').addEventListener('click', () => {
  setThemePref(NEXT_THEME[getThemePref()]);
  renderThemeButton();
});

$('#soundBtn').addEventListener('click', () => {
  S.sound = !S.sound;
  save();
  renderHud();
  if (S.sound) sfx('ok');
});
