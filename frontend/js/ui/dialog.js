/* ---------- bevestigingsdialoog ----------
   Een eigen venster in plaats van window.confirm: past bij het thema en werkt goed op mobiel.
   Escape of 'annuleren' geeft false; de veilige knop krijgt de focus. */

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

  return new Promise(resolve => {
    dlg.returnValue = '';
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
    $('#dlgCancel').focus();
  });
}

const isDialogOpen = () => /** @type {HTMLDialogElement} */ ($('#confirmDialog')).open;
