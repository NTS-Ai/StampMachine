/* ---------- hulpfuncties ---------- */

/**
 * Zoekt één element. Gooit een duidelijke fout als het niet bestaat,
 * zodat een tikfout in een id meteen opvalt.
 * @param {string} selector
 * @returns {HTMLElement}
 */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element niet gevonden: ${selector}`);
  return /** @type {HTMLElement} */ (el);
}

/** Maakt tekst veilig om in HTML te zetten. @param {unknown} s */
const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Zoals esc, maar zet `backticks` om naar <code>. @param {unknown} s */
const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

/**
 * Geeft een geschudde kopie terug (Fisher-Yates).
 * @template T
 * @param {T[]} list
 * @returns {T[]}
 */
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Datum als 'jjjj-mm-dd' in lokale tijd. @param {Date} [d] */
function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** CSS-kleur van een week; week 0 (alle weken) krijgt de accentkleur. @param {number} week */
const hue = week => week ? `var(--w${week})` : 'var(--accent)';

/** True op apparaten met een touchscreen als belangrijkste invoer. */
const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/** Getal in Nederlandse notatie, bijvoorbeeld 1.234. @param {number} n */
const nl = n => n.toLocaleString('nl-NL');

/** @type {WeakMap<HTMLElement, number>} */
const counting = new WeakMap();

/**
 * Telt een getal rustig op of af naar de eindwaarde, bijvoorbeeld gelijk met het vullen van een balk.
 * @param {HTMLElement} el
 * @param {number} to
 * @param {{ from?: number, ms?: number, format?: (n: number) => string }} [opts]
 */
function countUp(el, to, { from = 0, ms = 1100, format = String } = {}) {
  cancelAnimationFrame(counting.get(el) || 0);
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || from === to) { el.textContent = format(to); return; }
  const start = performance.now();
  const step = (/** @type {number} */ now) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = format(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
    if (t < 1) counting.set(el, requestAnimationFrame(step));
  };
  counting.set(el, requestAnimationFrame(step));
}

/**
 * Levenshtein-afstand: hoeveel tekens je moet toevoegen, weghalen of vervangen.
 * Gebruikt om kleine typfouten bij typvragen goed te rekenen.
 * @param {string} a
 * @param {string} b
 */
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** @typedef {'home' | 'play' | 'cards' | 'result' | 'search'} ScreenId */

/** Toont één scherm en verbergt de rest. @param {ScreenId} id */
function showScreen(id) {
  for (const s of ['home', 'play', 'cards', 'result', 'search']) $('#' + s).hidden = s !== id;
  document.body.dataset.screen = id;
  // Direct naar boven, ook al scrolt de pagina verder vloeiend.
  window.scrollTo({ top: 0, behavior: 'instant' });
}
