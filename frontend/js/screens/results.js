/* ---------- resultaatscherm na een ronde ---------- */

/**
 * @typedef {Object} ResultButton
 * @property {string} label
 * @property {() => void} onClick
 * @property {boolean} [primary]
 * @property {number} [week]   Kleurt de knop in de kleur van deze week.
 */

/**
 * @param {Object} r
 * @param {string} r.title
 * @param {string} r.sub
 * @param {[string, string][]} r.stats   Paren van [waarde, label].
 * @param {ResultButton[]} r.buttons
 * @param {boolean} [r.record]
 * @param {string} [r.extraHtml]        Bijvoorbeeld de lijst met fouten.
 */
function showResult({ title, sub, stats, buttons, record = false, extraHtml = '' }) {
  let h = `<div class="res-head">${record ? '<span class="record">Nieuw record</span>' : ''}<h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  h += '<div class="stats">' + stats.map(([value, label]) => `<div class="stat"><b>${esc(value)}</b><small>${esc(label)}</small></div>`).join('') + '</div>';
  h += extraHtml;
  h += '<div class="res-btns">' + buttons.map((b, i) => {
    const style = b.week != null ? ` style="--hue:${hue(b.week)}"` : '';
    return `<button class="btn lg${b.primary ? ' primary' : ''}" type="button" data-i="${i}"${style}>${esc(b.label)}</button>`;
  }).join('') + '</div>';

  const body = $('#resBody');
  body.innerHTML = h;
  body.querySelectorAll('.res-btns .btn').forEach(el => {
    el.addEventListener('click', () => buttons[Number(/** @type {HTMLElement} */ (el).dataset.i)].onClick());
  });
  showScreen('result');
}
