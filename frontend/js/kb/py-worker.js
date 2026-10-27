// @ts-nocheck -- draait als Web Worker (andere globale omgeving dan de pagina), met Pyodide van het CDN.
/* ---------- Python in de browser (Pyodide), in een aparte Web Worker ----------
   De code van de gebruiker draait hier, los van de pagina. Loopt hij vast, dan beëindigt de
   pagina deze worker na een timeout; de rest van de site blijft gewoon werken. */

const PYODIDE_VERSION = '0.29.5';
importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);

const ready = loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` }).then(py => {
  // input() kan hier niet wachten op een toetsenbord; geef een duidelijke melding.
  py.runPython(`
import builtins
def _no_input(prompt=""):
    raise RuntimeError("input() werkt niet in de browser-editor. Zet de waarde direct in een variabele.")
builtins.input = _no_input
`);
  self.postMessage({ type: 'ready' });
  return py;
}).catch(err => {
  self.postMessage({ type: 'fatal', text: String(err && err.message || err) });
});

self.onmessage = async e => {
  const { id, code } = e.data;
  const py = await ready;
  if (!py) return;
  const send = (type, text) => self.postMessage({ id, type, text });
  py.setStdout({ batched: text => send('out', text + '\n') });
  py.setStderr({ batched: text => send('err', text + '\n') });
  try {
    // Elke run begint schoon: variabelen van een vorige run tellen niet mee.
    // De code draait in __main__, zodat `if __name__ == "__main__":` gewoon werkt.
    py.runPython("for _k in [k for k in list(globals()) if not k.startswith('__')]: del globals()[_k]");
    await py.runPythonAsync(code);
    send('done', '');
  } catch (err) {
    // Alleen het relevante deel van de traceback: de regels uit <exec> en de foutmelding.
    const lines = String(err && err.message || err).split('\n');
    const start = lines.findIndex(l => l.includes('File "<exec>"'));
    send('error', (start >= 0 ? ['Traceback (most recent call last):', ...lines.slice(start)] : lines).join('\n').trim());
  }
};
