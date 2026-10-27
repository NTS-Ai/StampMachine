// Laadt de frontend-scripts in een afgeschermde omgeving, zoals de browser ze laadt:
// gewone scripts die hun globale variabelen delen. De DOM is nagebootst, zodat de
// rekenlogica getest kan worden zonder browser.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend');

/** Scripts in dezelfde volgorde als in index.html, zonder main.js (die start de app). */
const SCRIPTS = [
  'js/data/content.js',
  'js/core/utils.js',
  'js/core/content.js',
  'js/core/state.js',
  'js/core/progress.js',
  'js/fx/sound.js',
  'js/fx/confetti.js',
  'js/ui/dialog.js',
  'js/ui/hud.js',
  'js/stampy/bot.js',
  'js/stampy/dragon.js',
  'js/play/question.js',
  'js/screens/results.js',
  'js/screens/home.js',
  'js/screens/game.js',
  'js/screens/cards.js',
  'js/screens/search.js',
  'js/screens/map.js',
  'js/screens/level.js',
  'js/screens/boss.js',
  'js/screens/hub.js',
  'js/screens/profile.js',
  'js/screens/playground.js',
  'js/kb/highlight.js',
  'js/kb/kb.js',
  'js/core/router.js',
];

/** Een nep-element dat alles slikt wat de scripts er bij het laden mee doen. */
function fakeElement() {
  return {
    style: { setProperty() {} }, dataset: {}, hidden: false, innerHTML: '', textContent: '', value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute: () => null,
    toggleAttribute() {}, focus() {}, blur() {}, appendChild() {}, setSelectionRange() {},
    querySelector: () => fakeElement(), querySelectorAll: () => [], contains: () => false,
  };
}

/**
 * @param {{ storage?: Record<string, string>, now?: number }} [opts]
 *   storage: wat er al in localStorage staat; now: de 'huidige' tijd in ms.
 */
export function loadApp({ storage = {}, now } = {}) {
  const store = { ...storage };
  const RealDate = Date;
  // Optioneel een vaste klok, zodat dagen-op-rij en de bewaartermijn testbaar zijn.
  const FixedDate = now == null ? RealDate : class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };

  const context = {
    console,
    Date: FixedDate,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    performance: { now: () => 0 },
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    document: {
      querySelector: () => fakeElement(), querySelectorAll: () => [], createElement: () => fakeElement(),
      addEventListener() {}, body: fakeElement(), documentElement: fakeElement(), activeElement: null,
    },
    matchMedia: () => ({ matches: true, addEventListener() {} }), // 'reduced motion': geen animaties
    addEventListener() {}, scrollTo() {}, scrollY: 0, innerWidth: 1280, innerHeight: 800,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    HTMLElement: class {}, HTMLInputElement: class {}, HTMLTextAreaElement: class {}, HTMLButtonElement: class {},
  };
  context.window = context;
  vm.createContext(context);
  for (const file of SCRIPTS) {
    vm.runInContext(readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }

  return {
    /** Voert een expressie uit in de app, zodat je ook bij top-level const/let kunt. */
    run: code => vm.runInContext(code, context),
    store,
  };
}
