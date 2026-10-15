/* ---------- home ----------
   Wordt gebouwd in de volgende stap; dit is een eenvoudige versie in de nieuwe stijl. */

/** Toont de home. */
function openHome() {
  const el = $('#home');
  el.innerHTML = `<div class="hello"><div class="grow"><h1>Hoi, stagiair</h1><p>${nl(S.xp)} XP</p></div><div class="mascot right" id="homeBot"></div></div>
    <div class="intro"><p>De nieuwe home wordt nu gebouwd.</p></div>`;
  mountBot($('#homeBot'));
  showScreen('home');
}
