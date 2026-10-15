// Tests voor de kennisbank: de data in frontend/data/kb/ en de code die hem toont.
// Draaien met: node --test tests/*.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadApp } from './load.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));

const lessons = [1, 2, 3, 4, 5, 6].map(w => read(`frontend/data/kb/lessons/w${w}.json`));
const sections = lessons.flatMap(l => l.sections.map(s => ({ ...s, week: l.week })));
const sectionIds = new Set(sections.map(s => s.id));
const glossary = read('frontend/data/kb/glossary.json');
const reference = read('frontend/data/kb/reference.json');
const content = [1, 2, 3, 4, 5, 6].map(w => read(`content/w${w}.json`));

const BLOCK_TYPES = new Set(['h', 'p', 'code', 'table', 'list', 'note']);
const LANGS = new Set(['python', 'bash', 'sql', 'json', 'yaml', 'toml', 'dockerfile', 'ini', 'text', 'http']);
const evenTicks = s => ((s || '').match(/`/g) || []).length % 2 === 0;

const app = loadApp();

describe('lessen', () => {
  test('elke week heeft de secties uit het workbook, in volgorde', () => {
    for (const l of lessons) {
      const ids = l.sections.map(s => s.id);
      const expected = l.week === 6 ? ['6.1', '6.2', '6.3', '6.4', '6.5'] : [1, 2, 3, 4, 5].map(n => `${l.week}.${n}`).concat(`${l.week}.A`);
      assert.deepEqual(ids, expected, `week ${l.week}`);
      assert.ok(l.title, `week ${l.week}: titel`);
    }
  });

  test('elke les heeft titel, samenvatting, simpele uitleg, inhoud en kernpunten', () => {
    for (const s of sections) {
      for (const f of ['title', 'summary', 'simple']) assert.ok(String(s[f] || '').trim(), `${s.id}: ${f}`);
      assert.ok(s.blocks.length >= 5, `${s.id}: te weinig inhoud`);
      assert.ok(s.takeaways && s.takeaways.length >= 2, `${s.id}: takeaways`);
      assert.ok(s.blocks.some(b => b.type === 'h'), `${s.id}: geen tussenkopjes`);
    }
  });

  test('eindopdrachten hebben een inleverlijst', () => {
    for (const s of sections.filter(s => s.kind === 'assessment')) {
      assert.ok(s.checklist && s.checklist.length >= 5, `${s.id}: checklist`);
    }
    assert.equal(sections.filter(s => s.kind === 'assessment').length, 6);
  });

  test('blokken hebben een bekend type en geldige velden', () => {
    for (const s of sections) {
      for (const [i, b] of s.blocks.entries()) {
        const where = `${s.id} blok ${i}`;
        assert.ok(BLOCK_TYPES.has(b.type), `${where}: type ${b.type}`);
        if (b.type === 'code') {
          assert.ok(LANGS.has(b.lang), `${where}: taal ${b.lang}`);
          assert.ok(b.code && b.code.trim(), `${where}: lege code`);
          if (b.run) assert.equal(b.lang, 'python', `${where}: alleen Python kan draaien`);
        }
        if (b.type === 'table') {
          assert.ok(b.head.length >= 2, `${where}: kop`);
          for (const r of b.rows) assert.equal(r.length, b.head.length, `${where}: rij met ${r.length} cellen`);
        }
        if (b.type === 'list') assert.ok(b.items.length, `${where}: lege lijst`);
        if (b.type === 'note') assert.ok(['tip', 'info', 'warn'].includes(b.tone), `${where}: tone ${b.tone}`);
      }
    }
  });

  test('backticks staan in paren in alle teksten', () => {
    const odd = [];
    for (const s of sections) {
      const texts = [s.title, s.summary, s.simple, s.exercise, ...(s.takeaways || []), ...(s.checklist || []),
        ...s.blocks.flatMap(b => [b.text, b.caption, ...(b.items || []), ...(b.head || []), ...(b.rows || []).flat()])];
      for (const t of texts) if (!evenTicks(t)) odd.push(`${s.id}: ${t.slice(0, 50)}`);
    }
    assert.deepEqual(odd, []);
  });

  test('links zijn https en hebben een label', () => {
    for (const s of sections) {
      for (const l of s.links || []) {
        assert.match(l.url, /^https:\/\//, `${s.id}: ${l.url}`);
        assert.ok(l.label.trim(), `${s.id}: label`);
      }
    }
  });

  test('geen echte API-keys of secrets in codevoorbeelden', () => {
    const secret = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)/;
    for (const s of sections) for (const b of s.blocks) if (b.code) assert.doesNotMatch(b.code, secret, s.id);
  });
});

describe('begrippen en naslag', () => {
  test('minstens 120 unieke begrippen, elk met uitleg en een bestaande les', () => {
    assert.ok(glossary.length >= 120, `${glossary.length} begrippen`);
    const seen = new Set();
    for (const t of glossary) {
      const key = t.term.toLowerCase();
      assert.ok(!seen.has(key), `dubbel: ${t.term}`);
      seen.add(key);
      assert.ok(t.short && t.simple, `${t.term}: uitleg`);
      assert.ok(sectionIds.has(t.section), `${t.term}: sectie ${t.section}`);
    }
  });

  test('naslag: unieke tabel-ids, gelijke rijen en bestaande secties', () => {
    const ids = new Set();
    for (const g of reference.groups) {
      assert.ok(g.id && g.title && g.tables.length, `groep ${g.id}`);
      for (const t of g.tables) {
        assert.ok(!ids.has(t.id), `dubbele tabel ${t.id}`);
        ids.add(t.id);
        assert.ok(sectionIds.has(t.section), `${t.id}: sectie ${t.section}`);
        for (const r of t.rows) assert.equal(r.length, t.head.length, `${t.id}: rij`);
        for (const c of t.rows.flat()) assert.ok(evenTicks(c), `${t.id}: backticks in "${c}"`);
      }
    }
    assert.ok(ids.size >= 35, `${ids.size} tabellen`);
  });

  test('elke vraag en flashcard verwijst naar een les die bestaat', () => {
    for (const w of content) {
      for (const item of [...w.questions, ...w.typing, ...w.flashcards]) {
        assert.ok(sectionIds.has(item.section), `${item.id}: sectie ${item.section}`);
      }
    }
  });
});

describe('syntax-kleuring', () => {
  const highlight = (code, lang) => app.run(`highlightCode(${JSON.stringify(code)}, ${JSON.stringify(lang)})`);
  const unhtml = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  test('escapet HTML, zodat code nooit als HTML wordt uitgevoerd', () => {
    for (const lang of ['python', 'sql', 'bash', 'json', 'text', 'onbekend']) {
      const html = highlight('x = "<img src=x onerror=alert(1)>" # <b>', lang);
      assert.ok(!html.includes('<img'), lang);
      assert.ok(!html.includes('<b>'), lang);
    }
  });

  test('de tekst blijft precies gelijk aan de code, voor elk codeblok in de kennisbank', () => {
    for (const s of sections) {
      for (const b of s.blocks.filter(b => b.type === 'code')) {
        assert.equal(unhtml(highlight(b.code, b.lang)), b.code, `${s.id}: ${b.code.slice(0, 40)}`);
      }
    }
  });

  test('herkent sleutelwoorden, strings en commentaar', () => {
    const html = highlight('def f(x):\n    return "hi"  # groet', 'python');
    assert.match(html, /<span class="tk-kw">def<\/span>/);
    assert.match(html, /<span class="tk-str">&quot;hi&quot;<\/span>/);
    assert.match(html, /<span class="tk-com"># groet<\/span>/);
    assert.match(highlight('SELECT name FROM t -- alles', 'sql'), /<span class="tk-kw">SELECT<\/span>.*<span class="tk-com">-- alles<\/span>/);
  });
});

describe('kennisbank: routes en tekst', () => {
  const route = h => JSON.parse(app.run(`JSON.stringify(parseRoute(${JSON.stringify(h)}))`));

  test('routes', () => {
    assert.deepEqual(route(''), { name: 'home' });
    assert.deepEqual(route('#/'), { name: 'home' });
    assert.deepEqual(route('#/kennis'), { name: 'kb', page: 'home' });
    assert.deepEqual(route('#/kennis/3.2'), { name: 'kb', page: 'les', id: '3.2' });
    assert.deepEqual(route('#/kennis/naslag/sql'), { name: 'kb', page: 'naslag', id: 'sql' });
    assert.deepEqual(route('#/kennis/begrippen'), { name: 'kb', page: 'begrippen' });
  });

  test('kbText: escapen, `code` en **vet**, geen ruwe HTML', () => {
    assert.equal(app.run('kbText("**let op**: `a<b` <i>")'), '<strong>let op</strong>: <code>a&lt;b</code> &lt;i&gt;');
  });

  test('"Simpel gezegd:" aan het begin wordt niet dubbel getoond', () => {
    assert.equal(app.run('withoutLabel("Simpel gezegd: een variabele is een etiket.")'), 'Een variabele is een etiket.');
    assert.equal(app.run('withoutLabel("Een etiket.")'), 'Een etiket.');
  });

  test('begrippen beginnen bij de eerste letter, zonder punt of underscore', () => {
    assert.equal(app.run('firstLetter(".dockerignore")'), 'D');
    assert.equal(app.run('firstLetter("__init__")'), 'I');
    assert.equal(app.run('firstLetter("200 OK")'), '#');
  });
});
