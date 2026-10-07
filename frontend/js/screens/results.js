/* ---------- resultaatscherm na een ronde ---------- */

/**
 * @typedef {Object} ResultButton
 * @property {string} label
 * @property {() => void} onClick
 * @property {boolean} [primary]
 * @property {number} [week]   Kleurt de knop in de kleur van deze week.
 */

/**
 * @typedef {Object} ResultStat
 * @property {number} value
 * @property {string} label
 * @property {'gold' | 'good' | 'bad' | 'accent'} tone  Kleur van de tegel.
 * @property {string} [prefix]
 * @property {string} [suffix]
 */

/**
 * @param {Object} r
 * @param {string} r.title
 * @param {string} r.sub
 * @param {ResultStat[]} r.stats
 * @param {ResultButton[]} r.buttons
 * @param {boolean} [r.record]
 * @param {string} [r.extraHtml]        Bijvoorbeeld de lijst met fouten.
 */
function showResult({ title, sub, stats, buttons, record = false, extraHtml = '' }) {
  let h = `<div class="res-head">${record ? '<span class="record">Nieuw record</span>' : ''}<h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
  // Bij een record krijgt de eerste tegel (de score) een gouden gloed.
  h += '<div class="stats">' + stats.map((s, i) =>
    `<div class="stat tone-${s.tone}${record && i === 0 ? ' is-record' : ''}" style="--i:${i}"><b data-i="${i}">${esc((s.prefix || '') + '0' + (s.suffix || ''))}</b><small>${esc(s.label)}</small></div>`
  ).join('') + '</div>';
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
  body.querySelectorAll('.stat b').forEach(el => {
    const s = stats[Number(/** @type {HTMLElement} */ (el).dataset.i)];
    countUp(/** @type {HTMLElement} */ (el), s.value, { format: n => (s.prefix || '') + nl(n) + (s.suffix || '') });
  });
}
