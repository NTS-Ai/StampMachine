/* ---------- bevestigingsdialoog ----------
   Een eigen venster in plaats van window.confirm: past bij het thema en werkt goed op mobiel.
   Stampy kijkt mee (twijfelend, of verdrietig bij iets dat je niet terug kunt draaien).
   Escape of 'annuleren' geeft false; de veilige knop krijgt de focus. */

/** Stampy in de dialoog; pas getekend als de dialoog voor het eerst opengaat. @type {any} */
let dialogBot = null;

/**
 * @param {{ title: string, text: string, ok: string, cancel: string, danger?: boolean }} opts
 * @returns {Promise<boolean>}
 */
function confirmDialog({ title, text, ok, cancel, danger = false }) {
  const dlg = /** @type {HTMLDialogElement} */ ($('#confirmDialog'));
  $('#dlgTitle').textContent = title;
  $('#dlgText').textContent = text;
  $('#dlgOk').textContent = ok;
  $('#dlgOk').classList.toggle('danger', danger);
  $('#dlgCancel').textContent = cancel;

  const host = document.querySelector('#dlgBot');
  if (host && typeof mountBot === 'function') {
    if (!dialogBot) dialogBot = mountBot(/** @type {HTMLElement} */ (host), { bubble: false });
    dialogBot.set(danger ? 'sad' : 'think');
  }

  return new Promise(resolve => {
    dlg.returnValue = '';
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
    $('#dlgCancel').focus();
  });
}

const isDialogOpen = () => /** @type {HTMLDialogElement} */ ($('#confirmDialog')).open;

// Klik op de donkere achtergrond naast het venster: hetzelfde als annuleren.
document.addEventListener('click', e => {
  const dlg = /** @type {HTMLDialogElement | null} */ (document.querySelector('#confirmDialog'));
  if (dlg && dlg.open && e.target === dlg) dlg.close('cancel');
});
