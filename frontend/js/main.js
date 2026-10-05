/* ---------- sneltoetsen en opstarten ---------- */

document.addEventListener('keydown', e => {
  if (isDialogOpen()) return; // de dialoog regelt zelf Enter en Escape
  const target = e.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (G && !$('#play').hidden) onGameKey(e);
  else if (F && !$('#cards').hidden) onCardsKey(e);
});

renderHome();
