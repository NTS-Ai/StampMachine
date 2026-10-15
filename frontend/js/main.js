/* ---------- sneltoetsen en opstarten ---------- */

document.addEventListener('keydown', e => {
  if (isDialogOpen()) return; // de dialoog regelt zelf Enter en Escape
  const target = e.target;
  // Een uitgeschakeld veld (na het antwoorden) telt niet als typen: dan werken de sneltoetsen meteen.
  const typing = (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && !target.disabled;

  // Zoeken: '/' of Ctrl+K (Cmd+K op een Mac), maar niet midden in een spel.
  const searchKey = (e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');
  if (searchKey && canOpenSearch()) {
    e.preventDefault();
    openSearch();
    return;
  }
  if (typing) return;
  if (G && !$('#play').hidden) onGameKey(e);
  else if (F && !$('#cards').hidden) onCardsKey(e);
});

renderHome();
