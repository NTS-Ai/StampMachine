/* ---------- Speeltuin: zelf Python proberen ----------
   Een editor met voorbeelden. De code draait in dezelfde Python-worker als de kennisbank
   (pyWorker/PY/killWorker/PY_TIMEOUT uit kb.js). Python laadt pas bij de eerste Run.
   Je laatste code blijft bewaard in deze browser, zodat je verder kunt waar je was. */

/** Waar de speeltuin je laatste code bewaart (alleen in deze browser). */
const PG_KEY = 'nts-stamp-speeltuin';

/** Voorbeelden om mee te beginnen. */
const PG_EXAMPLES = [
  { key: 'hallo', label: 'Hallo', code: 'naam = "Stampy"\nprint("Hallo,", naam)\nprint("Welkom in de speeltuin!")\n' },
  { key: 'fstring', label: 'f-string', code: 'naam = "Sam"\nleeftijd = 19\nprint(f"{naam} is {leeftijd} jaar.")\nprint(f"Over 5 jaar is {naam} {leeftijd + 5}.")\n\nprijs = 3.5\nprint(f"Prijs: {prijs:.2f} euro")\n' },
  { key: 'loop', label: 'Loop', code: 'for i in range(1, 6):\n    print(i, "x 7 =", i * 7)\n\nteller = 3\nwhile teller > 0:\n    print("Nog", teller)\n    teller -= 1\nprint("Start!")\n' },
  { key: 'functie', label: 'Functie', code: 'def begroet(naam, groet="Hoi"):\n    """Geeft een begroeting terug."""\n    return f"{groet}, {naam}!"\n\n\nprint(begroet("Noor"))\nprint(begroet("Ali", groet="Goedemorgen"))\n' },
  { key: 'comprehension', label: 'List comprehension', code: 'getallen = [1, 2, 3, 4, 5, 6]\n\nkwadraten = [n * n for n in getallen]\neven = [n for n in getallen if n % 2 == 0]\n\nprint(kwadraten)\nprint(even)\n' },
  { key: 'dict', label: 'Dict', code: 'stagiair = {"naam": "Sam", "week": 2, "talen": ["Python", "SQL"]}\n\nprint(stagiair["naam"])\nstagiair["week"] += 1\n\nfor sleutel, waarde in stagiair.items():\n    print(f"{sleutel}: {waarde}")\n\nprint(stagiair.get("team", "nog geen team"))\n' },
  { key: 'fout', label: 'Een fout lezen', code: 'def gemiddelde(cijfers):\n    return sum(cijfers) / len(cijfers)\n\n\nprint(gemiddelde([7, 8, 6]))\nprint(gemiddelde([]))\n' },
];

/** @type {Bot | null} */
let pgBot = null;
/** Stopt de lopende run (Stop-knop); null als er niets draait. @type {(() => void) | null} */
let pgStop = null;

const PG_ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';
const PG_ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';
const PG_ICON_RESET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Leest je bewaarde code. @returns {{ code: string, ex: string } | null} */
function pgLoad() {
  try {
    const raw = localStorage.getItem(PG_KEY);
    const v = raw && JSON.parse(raw);
    return v && typeof v.code === 'string' ? { code: v.code, ex: String(v.ex || '') } : null;
  } catch (e) { return null; }
}

/** @param {string} code @param {string} ex */
function pgSave(code, ex) {
  try { localStorage.setItem(PG_KEY, JSON.stringify({ code, ex })); } catch (e) { /* niet bewaren is geen ramp */ }
}

/** Toont de Python-speeltuin. */
function openPlayground() {
  if (pgBot) pgBot.destroy();
  if (pgStop) pgStop(); // een run van de vorige keer stopt
  const saved = pgLoad();
  const ex = PG_EXAMPLES.find(x => saved && x.key === saved.ex) || PG_EXAMPLES[0];
  const el = $('#speeltuin');
  el.innerHTML = `
    <header class="hello pg-head">
      <div class="grow">
        <h1>Speeltuin</h1>
        <p>Probeer zelf Python. Je code draait in je browser; er gaat niets naar een server.</p>
      </div>
      <div class="mascot right" id="pgBot"></div>
    </header>

    <div class="pg-examples" role="group" aria-label="Voorbeelden">
      ${PG_EXAMPLES.map(x => `<button class="pg-chip" type="button" data-ex="${x.key}" aria-pressed="${x === ex}">${esc(x.label)}</button>`).join('')}
    </div>

    <div class="pg-editor">
      <div class="pg-bar">
        <label class="pg-file" for="pgCode">main.py</label>
        <span class="pg-keys kbd" aria-hidden="true"><span class="keycap">Ctrl</span>+<span class="keycap">Enter</span> run · <span class="keycap">Tab</span> inspringen · <span class="keycap">Esc</span> verlaat de editor</span>
      </div>
      <textarea class="pg-code" id="pgCode" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" rows="12" aria-describedby="pgHelp">${esc(saved ? saved.code : ex.code)}</textarea>
      <p class="sr-only" id="pgHelp">Ctrl+Enter voert de code uit. Tab springt 4 spaties in, Shift+Tab haalt ze weg. Druk op Escape om de editor met Tab te verlaten.</p>
      <div class="pg-actions">
        <button class="hm-go pg-run" type="button" id="pgRun">${PG_ICON_PLAY}<span>Run</span></button>
        <button class="pg-stop" type="button" id="pgStop" hidden>${PG_ICON_STOP}<span>Stop</span></button>
        <button class="pg-reset" type="button" id="pgReset">${PG_ICON_RESET}<span>Herstel</span></button>
      </div>
    </div>

    <section class="pg-out" aria-labelledby="pgOutTitle">
      <h2 class="pg-out-title" id="pgOutTitle">Uitvoer</h2>
      <div class="pg-result" id="pgResult" aria-live="polite">
        <p class="pg-status">Druk op Run om je code uit te voeren. De eerste keer laadt Python (ongeveer 10 MB).</p>
      </div>
    </section>

    <p class="pg-tip"><b>Goed om te weten:</b> <code>input()</code> werkt hier niet, want er is geen toetsenbord in de worker. Zet de waarde direct in een variabele. Na ${PY_TIMEOUT / 1000} seconden stopt een run vanzelf, zodat een oneindige lus niets laat vastlopen.</p>`;

  pgBot = mountBot($('#pgBot'));
  const input = /** @type {HTMLTextAreaElement} */ ($('#pgCode'));
  let current = ex.key;

  el.querySelectorAll('[data-ex]').forEach(btn => btn.addEventListener('click', () => {
    const x = PG_EXAMPLES.find(e => e.key === /** @type {HTMLElement} */ (btn).dataset.ex);
    if (!x) return;
    current = x.key;
    input.value = x.code;
    pgSave(input.value, current);
    el.querySelectorAll('[data-ex]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    if (pgBot) pgBot.say(`Voorbeeld: ${x.label}. Druk op Run!`);
    input.focus();
  }));
  input.addEventListener('input', () => pgSave(input.value, current));
  input.addEventListener('keydown', e => pgKey(e, input));
  $('#pgRun').addEventListener('click', () => runPlayground());
  $('#pgStop').addEventListener('click', () => { if (pgStop) pgStop(); });
  $('#pgReset').addEventListener('click', () => {
    const x = PG_EXAMPLES.find(e => e.key === current) || PG_EXAMPLES[0];
    input.value = x.code;
    pgSave(input.value, current);
    $('#pgResult').innerHTML = '<p class="pg-status">Het voorbeeld staat weer zoals het was.</p>';
    input.focus();
  });

  showScreen('speeltuin');
  setTimeout(() => {
    if (pgBot && !$('#speeltuin').hidden) pgBot.say('Kies een voorbeeld of schrijf je eigen code.', 3400);
  }, 600);
}

/**
 * Toetsen in de editor: Ctrl+Enter = run, Tab = 4 spaties, Shift+Tab = minder inspringen,
 * Enter = nieuwe regel met dezelfde inspringing (en 4 extra na een dubbele punt), Esc = naar de Run-knop.
 * @param {KeyboardEvent} e @param {HTMLTextAreaElement} input
 */
function pgKey(e, input) {
  const NL = '\n';
  const { value, selectionStart: s, selectionEnd: end } = input;
  const lineStart = value.lastIndexOf(NL, s - 1) + 1;
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runPlayground();
  } else if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    // Meerdere regels geselecteerd: alles 4 spaties naar rechts; anders 4 spaties op de cursor.
    if (s !== end && value.slice(s, end).includes(NL)) pgInsert(input, value.slice(lineStart, end).replace(/^/gm, '    '), lineStart, end, true);
    else pgInsert(input, '    ', s, end, false);
  } else if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    const block = value.slice(lineStart, end);
    const less = block.replace(/^ {1,4}/gm, '');
    if (less !== block) pgInsert(input, less, lineStart, end, s !== end);
  } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    const line = value.slice(lineStart, s);
    const indent = (line.match(/^ */) || [''])[0] + (/:\s*$/.test(line) ? '    ' : '');
    pgInsert(input, NL + indent, s, end, false);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    /** @type {HTMLElement} */ ($('#pgRun')).focus();
  }
}

/**
 * Vervangt een stuk tekst in de editor zo dat Ctrl+Z het nog kan terugdraaien.
 * @param {HTMLTextAreaElement} input @param {string} text @param {number} from @param {number} to @param {boolean} select
 */
function pgInsert(input, text, from, to, select) {
  input.setSelectionRange(from, to);
  // execCommand houdt de geschiedenis van ongedaan maken intact; anders setRangeText als terugval.
  const done = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
  if (!done) {
    input.setRangeText(text, from, to, 'end');
    input.dispatchEvent(new Event('input'));
  }
  if (select) input.setSelectionRange(from, from + text.length);
}

/** Voert de code uit in de Python-worker, met een timeout en een Stop-knop. */
async function runPlayground() {
  const input = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('pgCode'));
  const result = document.getElementById('pgResult');
  const runBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('pgRun'));
  const stopBtn = document.getElementById('pgStop');
  if (!input || !result || !runBtn || !stopBtn) return;
  if (PY.busy) {
    toast('Er draait al code. Even wachten…');
    return;
  }
  const bot = pgBot;
  PY.busy = true;
  runBtn.disabled = true;

  const firstLoad = !PY.ready;
  result.innerHTML = `<p class="pg-status"><span class="pg-spin" aria-hidden="true"></span>${firstLoad ? 'Python wordt geladen. De eerste keer duurt dit even (ongeveer 10 MB).' : 'Bezig…'}</p>`;
  if (bot && firstLoad) bot.react('think', 'Even Python opstarten…');
  const ok = await pyWorker();
  if (!ok) {
    killWorker();
    result.innerHTML = '<p class="pg-status err">Python kon niet worden geladen. Controleer je internetverbinding en probeer het opnieuw.</p>';
    if (bot) bot.react('no', 'Python laadt niet. Heb je internet?');
    PY.busy = false;
    runBtn.disabled = false;
    return;
  }
  if (firstLoad) result.innerHTML = '<p class="pg-status"><span class="pg-spin" aria-hidden="true"></span>Bezig…</p>';

  const id = PY.nextId++;
  const worker = /** @type {Worker} */ (PY.worker);
  let out = '';
  let err = '';
  const started = performance.now();
  stopBtn.hidden = false;
  const outcome = await new Promise(resolve => {
    const done = (/** @type {string} */ how) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMsg);
      pgStop = null;
      resolve(how);
    };
    const timer = setTimeout(() => done('timeout'), PY_TIMEOUT);
    pgStop = () => done('stopped');
    function onMsg(/** @type {MessageEvent} */ e) {
      if (e.data.id !== id) return;
      if (e.data.type === 'out') out += e.data.text;
      else if (e.data.type === 'err') err += e.data.text;
      else {
        if (e.data.type === 'error') err += e.data.text;
        done(e.data.type);
      }
    }
    worker.addEventListener('message', onMsg);
    worker.postMessage({ id, code: input.value });
  });
  // Een vastgelopen of gestopte run: de worker gaat weg, de volgende Run start een nieuwe.
  if (outcome === 'timeout' || outcome === 'stopped') killWorker();
  stopBtn.hidden = true;

  const secs = ((performance.now() - started) / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  let h = '';
  if (out) h += `<pre class="pg-stdout" tabindex="0">${esc(out.replace(/\n$/, ''))}</pre>`;
  if (err) h += `<pre class="pg-stderr" tabindex="0">${pgTraceback(err.trim())}</pre>`;
  if (outcome === 'timeout') h += `<p class="pg-status err">Gestopt na ${PY_TIMEOUT / 1000} seconden. Zit er een oneindige lus in je code?</p>`;
  else if (outcome === 'stopped') h += '<p class="pg-status err">Gestopt.</p>';
  else {
    if (!out && !err) h += '<p class="pg-status">Klaar, maar er is niets geprint. Gebruik <code>print()</code> om iets te zien.</p>';
    if (outcome === 'error') h += '<p class="pg-hint"><b>Tip:</b> lees een foutmelding van onder naar boven. De laatste regel zegt wat er mis is, de regels erboven zeggen waar.</p>';
    h += `<p class="pg-status ${outcome === 'error' ? 'err' : 'ok'}">${outcome === 'error' ? 'Fout' : 'Klaar'} in ${secs} s</p>`;
  }
  result.innerHTML = h;
  PY.busy = false;
  runBtn.disabled = false;

  if (!bot) return;
  if (outcome === 'timeout') bot.react('alarm', 'Vastgelopen! Een oneindige lus?');
  else if (outcome === 'stopped') bot.react('think', 'Gestopt. Pas je code aan en probeer opnieuw.');
  else if (outcome === 'error' && /input\(\)/.test(err)) bot.react('think', 'input() werkt hier niet. Zet de waarde in een variabele.');
  else if (outcome === 'error') bot.react('think', 'Lees de foutmelding van onder naar boven.');
  else if (!out) bot.react('think', 'Niets geprint. Vergeten print() te gebruiken?');
  else bot.react('ok', randomOf(['Het werkt!', 'Netjes, je code draait.', 'Mooi zo. Probeer eens iets aan te passen.']));
  if (outcome === 'error' || outcome === 'stopped' || (!out && outcome === 'done')) setTimeout(() => { if (bot === pgBot) bot.rest(); }, 3200);
}

/** Traceback met de laatste regel (de eigenlijke fout) vetgedrukt. @param {string} text */
function pgTraceback(text) {
  const lines = text.split('\n');
  const last = lines.pop() || '';
  return (lines.length ? esc(lines.join('\n')) + '\n' : '') + `<b class="pg-errline">${esc(last)}</b>`;
}
