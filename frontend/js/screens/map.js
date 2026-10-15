/* ---------- Kaart ----------
   Wordt gebouwd in de volgende stap. Tot die tijd een eenvoudige placeholder, zodat de app werkt. */

/** Toont de kaart van een wereld (0 = de wereld waar je nu bent). @param {number} world */
function openMap(world) {
  const el = $('#map');
  el.innerHTML = '<div class="intro" style="padding-top:40px"><h2>Kaart</h2><p>Dit scherm wordt nu gebouwd.</p></div>';
  showScreen('map');
}
