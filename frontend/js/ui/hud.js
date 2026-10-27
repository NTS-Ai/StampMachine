/* ---------- stand en geluid ----------
   Er is geen vaste header meer: elk scherm toont zelf je stand (home, kaart, profiel).
   Schermen die stand tonen, registreren een functie in HUD_HOOKS; renderHud() roept ze allemaal aan
   (bijvoorbeeld na een quiz of level). */

/** @type {(() => void)[]} */
const HUD_HOOKS = [];

/** Werkt alles bij wat je stand toont (XP, level, streak, sterren). */
function renderHud() {
  for (const hook of HUD_HOOKS) {
    try { hook(); } catch (e) { /* een scherm dat (nog) niet bestaat, mag de rest niet stoppen */ }
  }
}

/** Geluid aan of uit. @returns {boolean} de nieuwe stand */
function toggleSound() {
  S.sound = !S.sound;
  save();
  if (S.sound) sfx('ok');
  renderHud();
  return S.sound;
}
