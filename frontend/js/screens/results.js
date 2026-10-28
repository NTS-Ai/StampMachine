/* ---------- resultaatscherm na een ronde ----------
   Een badge met wat je speelde, Stampy die juicht of meeleeft, tegels met je cijfers,
   eventueel je fouten en de knoppen om verder te gaan. */

/**
 * @typedef {Object} ResultButton
 * @property {string} label
 * @property {() => void} onClick
 * @property {boolean} [primary]  De hoofdknop (goud); de rest is rustiger.
 * @property {number} [week]      Niet meer gebruikt voor de kleur; mag blijven staan.
 */

/**
 * @typedef {Object} ResultStat
 * @property {number} value
 * @property {string} label
 * @property {'gold' | 'good' | 'bad' | 'accent'} tone  Kleur van het getal.
 * @property {string} [prefix]
 * @property {string} [suffix]
 */

/** Stampy op het resultaatscherm; wordt bij elk nieuw resultaat vervangen. @type {any} */
let resultBot = null;

/**
 * @param {Object} r
 * @param {string} r.title
 * @param {string} r.sub
 * @param {ResultStat[]} r.stats
 * @param {ResultButton[]} r.buttons
 * @param {boolean} [r.record]
 * @param {string} [r.extraHtml]        Bijvoorbeeld de lijst met fouten (al veilig opgemaakt).
 * @param {string} [r.badge]            Korte tekst bovenaan, bijvoorbeeld "Quiz · Week 2".
 * @param {'win' | 'ok' | 'sad'} [r.mood]  Hoe Stampy reageert.
 */
function showResult({ title, sub, stats, buttons, record = false, extraHtml = '', badge = '', mood = 'ok' }) {
  const badgeHtml = (badge ? `<span class="badge">${esc(badge)}</span>` : '')
    + (record ? '<span class="badge record">Nieuw record</span>' : '');
  let h = `<div class="intro res-head"><div class="res-badges">${badgeHtml}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>`;
  h += '<div class="bigbot res-bot" id="resBot"></div>';
  h += `<div class="rgrid n${stats.length}">` + stats.map((s, i) =>
    `<div class="rstat tone-${s.tone}${record && i === 0 ? ' is-record' : ''}"><b data-i="${i}">${esc((s.prefix || '') + '0' + (s.suffix || ''))}</b><small>${esc(s.label)}</small></div>`
  ).join('') + '</div>';
  h += extraHtml;
  h += '<div class="res-btns">' + buttons.map((b, i) =>
    `<button class="cta${b.primary ? '' : ' alt'}" type="button" data-i="${i}">${esc(b.label)}</button>`
  ).join('') + '</div>';

  const body = $('#resBody');
  if (resultBot) resultBot.destroy();
  resultBot = null;
  body.innerHTML = h;
  body.querySelectorAll('.res-btns .cta').forEach(el => {
    el.addEventListener('click', () => buttons[Number(/** @type {HTMLElement} */ (el).dataset.i)].onClick());
  });
  showScreen('result');

  if (typeof mountBot === 'function') {
    resultBot = mountBot($('#resBot'), { bubble: false });
    if (mood === 'win') resultBot.react('win');
    else if (mood === 'sad') resultBot.set('sad');
    else resultBot.set('happy');
  }
  body.querySelectorAll('.rstat b').forEach(el => {
    const s = stats[Number(/** @type {HTMLElement} */ (el).dataset.i)];
    countUp(/** @type {HTMLElement} */ (el), s.value, { format: n => (s.prefix || '') + nl(n) + (s.suffix || '') });
  });
  const first = /** @type {HTMLElement | null} */ (body.querySelector('.res-btns .cta'));
  if (first) first.focus({ preventScroll: true });
}
