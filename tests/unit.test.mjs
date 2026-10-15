// Unit tests voor de rekenlogica en de inhoud. Draaien met: node --test tests/
// Geen dependencies nodig: alleen de testrunner die in Node zit.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

const app = loadApp();
/** Haalt een waarde uit de app als gewone JSON, los van de afgeschermde omgeving. */
const get = code => JSON.parse(app.run(`JSON.stringify(${code})`));

const DAY = 24 * 60 * 60 * 1000;
const NOON = new Date(2026, 9, 15, 12).getTime(); // 15 oktober 2026, 12:00 lokale tijd

describe('inhoud', () => {
  const weeks = get('WEEKS');
  const questions = weeks.flatMap(w => w.questions.map(q => ({ ...q, week: w.week })));
  const typing = weeks.flatMap(w => w.typing.map(q => ({ ...q, week: w.week })));
  const cards = weeks.flatMap(w => w.flashcards.map(c => ({ ...c, week: w.week })));
  const allQ = questions.concat(typing);

  test('zes weken, op volgorde', () => {
    assert.deepEqual(weeks.map(w => w.week), [1, 2, 3, 4, 5, 6]);
  });

  test('aantallen kloppen met de README', () => {
    assert.equal(questions.length, 228);
    assert.equal(typing.length, 60);
    assert.equal(cards.length, 112);
  });

  test('elke id is uniek', () => {
    const ids = allQ.map(q => q.id).concat(cards.map(c => c.id));
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dupes, []);
  });

  test('ids volgen het patroon week-nummer (vragen), week-t (typ) en week-f (kaarten)', () => {
    for (const q of questions) assert.match(q.id, new RegExp(`^${q.week}-\\d+$`), q.id);
    for (const q of typing) assert.match(q.id, new RegExp(`^${q.week}-t\\d+$`), q.id);
    for (const c of cards) assert.match(c.id, new RegExp(`^${c.week}-f\\d+$`), c.id);
  });

  // Zinvragen zijn uitgezonderd: daar dienen het modelantwoord en de kernpunten als uitleg.
  test('elke vraag en kaart heeft een uitleg "Simpel gezegd" (behalve zinvragen)', () => {
    const missing = allQ.concat(cards).filter(x => x.type !== 'sentence' && !(x.simple || '').trim()).map(x => x.id);
    assert.deepEqual(missing, []);
  });

  test('meerkeuze: geen dubbele opties, en het goede antwoord staat niet tussen de foute', () => {
    for (const q of questions.filter(q => q.type === 'choice')) {
      const opts = [q.correct, ...q.wrong].map(o => o.trim().toLowerCase());
      assert.equal(new Set(opts).size, opts.length, `${q.id}: dubbele optie`);
      assert.ok(q.wrong.length >= 2, `${q.id}: te weinig foute opties`);
    }
  });

  test('meerkeuze: per fout antwoord een reden, in dezelfde volgorde', () => {
    for (const q of questions.filter(q => q.type === 'choice' && q.why_wrong)) {
      assert.equal(q.why_wrong.length, q.wrong.length, q.id);
      for (const reason of q.why_wrong) assert.ok(reason.trim(), `${q.id}: lege reden`);
    }
  });

  test('backticks staan in paren, anders breekt de code-opmaak', () => {
    const fields = x => [x.question, x.correct, ...(x.wrong || []), ...(x.why_wrong || []), x.explanation, x.simple,
      x.front, x.back, x.model, ...(x.points || []), ...(x.answers || [])];
    const odd = [];
    for (const x of allQ.concat(cards)) {
      for (const f of fields(x)) if (f && (f.match(/`/g) || []).length % 2) odd.push(`${x.id}: ${f.slice(0, 60)}`);
    }
    assert.deepEqual(odd, []);
  });

  test('elk goedgekeurd typ-antwoord wordt door de app zelf goed gerekend', () => {
    for (const q of allQ.filter(q => q.type === 'type')) {
      for (const a of q.answers) {
        assert.equal(app.run(`matchTyped(${JSON.stringify(q)}, ${JSON.stringify(a)}).ok`), true, `${q.id}: "${a}"`);
      }
    }
  });

  test('zinvragen hebben een modelantwoord en kernpunten', () => {
    for (const q of allQ.filter(q => q.type === 'sentence')) {
      assert.ok(q.model && q.model.trim(), `${q.id}: geen model`);
      assert.ok(Array.isArray(q.points) && q.points.length, `${q.id}: geen punten`);
    }
  });
});

describe('hulpfuncties', () => {
  test('esc maakt tekst veilig voor HTML', () => {
    assert.equal(app.run(`esc('<a href="x">&</a>')`), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });

  test('fmt zet `backticks` om naar <code> en escapet de rest', () => {
    assert.equal(app.run('fmt("gebruik `a < b` hier")'), 'gebruik <code>a &lt; b</code> hier');
  });

  test('shuffle geeft dezelfde elementen terug en laat het origineel staan', () => {
    const out = get('(() => { const a = [1,2,3,4,5]; const b = shuffle(a); return { a, b: b.slice().sort() }; })()');
    assert.deepEqual(out.a, [1, 2, 3, 4, 5]);
    assert.deepEqual(out.b, [1, 2, 3, 4, 5]);
  });

  test('editDistance telt toevoegen, weghalen en vervangen', () => {
    assert.equal(app.run(`editDistance('kitten', 'sitting')`), 3);
    assert.equal(app.run(`editDistance('', 'abc')`), 3);
    assert.equal(app.run(`editDistance('same', 'same')`), 0);
  });

  test('dayKey geeft jjjj-mm-dd in lokale tijd', () => {
    assert.equal(app.run('dayKey(new Date(2026, 0, 5, 23, 59))'), '2026-01-05');
  });

  test('nl gebruikt een punt als duizendtal-scheiding', () => {
    assert.equal(app.run('nl(1234567)'), '1.234.567');
  });

  test('hue: week 0 is de accentkleur', () => {
    assert.equal(app.run('hue(0)'), 'var(--accent)');
    assert.equal(app.run('hue(4)'), 'var(--w4)');
  });

  test('countUp zet zonder animatie meteen de eindwaarde, met opmaak', () => {
    assert.equal(app.run(`(() => { const el = { textContent: '' }; countUp(el, 1500, { format: n => nl(n) + ' XP' }); return el.textContent; })()`), '1.500 XP');
  });
});

describe('typvragen nakijken', () => {
  const q = { id: 'x', type: 'type', answers: ['git status'] };
  const check = (answer, raw) => get(`matchTyped(${JSON.stringify(answer)}, ${JSON.stringify(raw)})`);

  test('hoofdletters, spaties, quotes en een $ vooraan tellen niet', () => {
    for (const raw of ['git status', 'GIT STATUS', '  git   status ', '$ git status', '`git status`', '"git status"']) {
      assert.equal(check(q, raw).ok, true, raw);
    }
  });

  test('leeg antwoord is fout', () => {
    assert.equal(check(q, '   ').ok, false);
  });

  test('één typfout mag bij antwoorden vanaf 6 tekens, en dan wordt de juiste spelling getoond', () => {
    assert.deepEqual(check(q, 'git statsu'), { ok: false });
    assert.deepEqual(check(q, 'git statu'), { ok: true, spelling: 'git status' });
  });

  test('geen typfout bij korte antwoorden', () => {
    assert.equal(check({ answers: ['ls'] }, 'la').ok, false);
  });

  test('exact: geen typfouten, zodat json.load niet goed is voor json.loads', () => {
    assert.equal(check({ answers: ['json.loads'], exact: true }, 'json.load').ok, false);
    assert.equal(check({ answers: ['json.loads'] }, 'json.load').ok, true);
  });

  test('extra argumenten na het antwoord zijn goed', () => {
    assert.equal(check(q, 'git status -s').ok, true);
  });
});

describe('bakjes en beheersing', () => {
  test('goed gaat een bakje omhoog tot maximaal 3, fout terug naar 0, bijna blijft staan', () => {
    const steps = get(`(() => {
      S.m = {};
      const out = [];
      for (const o of ['right', 'right', 'right', 'right', 'almost', 'wrong', 'almost']) { recordAnswer('t', o); out.push(box('t')); }
      return { out, seen: S.m.t.s };
    })()`);
    assert.deepEqual(steps.out, [1, 2, 3, 3, 3, 0, 0]);
    assert.equal(steps.seen, 7);
  });

  test('zwak = gezien en in bakje 0; nooit gezien is niet zwak', () => {
    const r = get(`(() => { S.m = { a: { b: 0, s: 1 }, b: { b: 2, s: 3 } };
      return [isWeak({ id: 'a' }), isWeak({ id: 'b' }), isWeak({ id: 'c' })]; })()`);
    assert.deepEqual(r, [true, false, false]);
  });

  test('beheersing is het gemiddelde bakje als fractie', () => {
    assert.equal(app.run(`(() => { S.m = { a: { b: 3, s: 1 }, b: { b: 0, s: 1 } }; return mastery([{ id: 'a' }, { id: 'b' }]); })()`), 0.5);
    assert.equal(app.run('mastery([])'), 0);
  });

  test('weighted kiest n vragen zonder dubbele, met voorrang voor lage bakjes', () => {
    const r = get(`(() => {
      const pool = Array.from({ length: 20 }, (_, i) => ({ id: 'w' + i }));
      S.m = {}; for (let i = 10; i < 20; i++) S.m['w' + i] = { b: 3, s: 1 };
      let lowFirst = 0;
      for (let t = 0; t < 200; t++) { const pick = weighted(pool, 5); if (Number(pick[0].id.slice(1)) < 10) lowFirst++; }
      const pick = weighted(pool, 5);
      return { n: pick.length, unique: new Set(pick.map(q => q.id)).size, lowFirst };
    })()`);
    assert.equal(r.n, 5);
    assert.equal(r.unique, 5);
    assert.equal(r.lowFirst, 200, 'bakje 0 komt altijd voor bakje 3 (toeval is maximaal 1,6)');
  });

  test('levels: elke 400 XP een level, de titel blijft op de hoogste staan', () => {
    const at = xp => get(`(() => { S.xp = ${xp}; return levelInfo(); })()`);
    assert.deepEqual(at(0), { number: 1, title: 'Stagiair', progress: 0 });
    assert.deepEqual(at(399), { number: 1, title: 'Stagiair', progress: 399 / 400 });
    assert.equal(at(400).number, 2);
    assert.equal(at(1e6).title, 'CTO-materiaal');
  });
});

describe('dagen op rij en bewaren', () => {
  const key = 'fayora-stamp-v1';

  test('vandaag twee keer spelen telt één dag, morgen +1, een dag overslaan begint opnieuw', () => {
    const today = loadApp({ now: NOON });
    today.run(`S.streak = { count: 4, day: dayKey(new Date(${NOON - DAY})) }; markPlayed(); markPlayed();`);
    assert.equal(today.run('currentStreak()'), 5);

    const gap = loadApp({ now: NOON });
    gap.run(`S.streak = { count: 9, day: dayKey(new Date(${NOON - 2 * DAY})) };`);
    assert.equal(gap.run('currentStreak()'), 0, 'eergisteren gespeeld: reeks is verbroken');
    gap.run('markPlayed()');
    assert.equal(gap.run('currentStreak()'), 1);
  });

  test('opslaan en opnieuw laden geeft dezelfde voortgang', () => {
    const a = loadApp({ now: NOON });
    a.run(`S.xp = 1234; recordAnswer('1-0', 'right'); S.best.q1 = 900; save();`);
    const b = loadApp({ storage: a.store, now: NOON + DAY });
    assert.equal(b.run('S.xp'), 1234);
    assert.equal(b.run(`box('1-0')`), 1);
    assert.equal(b.run('S.best.q1'), 900);
  });

  test('oud formaat met een lijst speeldagen wordt omgezet naar alleen een reeks', () => {
    const d = n => new Date(NOON - n * DAY);
    const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const old = { xp: 50, m: {}, best: {}, fc: {}, days: [iso(d(0)), iso(d(1)), iso(d(2)), iso(d(5))], sound: true, last: NOON };
    const app2 = loadApp({ storage: { [key]: JSON.stringify(old) }, now: NOON });
    assert.equal(app2.run('S.days'), undefined);
    assert.equal(app2.run('currentStreak()'), 3);
    assert.equal(app2.run('S.xp'), 50);
  });

  test('na 30 dagen niet spelen wordt de voortgang gewist en gemeld', () => {
    const saved = JSON.stringify({ xp: 999, m: {}, best: {}, fc: {}, streak: { count: 1, day: '' }, sound: true, last: NOON - 31 * DAY });
    const app2 = loadApp({ storage: { [key]: saved }, now: NOON });
    assert.equal(app2.run('S.xp'), 0);
    assert.equal(app2.run('progressWasCleared'), true);
    assert.equal(key in app2.store, false);
  });

  test('29 dagen niet spelen: voortgang blijft', () => {
    const saved = JSON.stringify({ xp: 999, m: {}, best: {}, fc: {}, streak: { count: 1, day: '' }, sound: true, last: NOON - 29 * DAY });
    assert.equal(loadApp({ storage: { [key]: saved }, now: NOON }).run('S.xp'), 999);
  });

  test('kapotte opslag laat de app gewoon starten', () => {
    const app2 = loadApp({ storage: { [key]: '{niet geldig' }, now: NOON });
    assert.equal(app2.run('S.xp'), 0);
  });

  test('wissen zet alles terug en haalt de sleutel weg', () => {
    const a = loadApp({ now: NOON });
    a.run('S.xp = 10; save(); resetProgress();');
    assert.equal(a.run('S.xp'), 0);
    assert.equal(key in a.store, false);
  });
});

describe('spelregels', () => {
  test('combo: ×2 vanaf 3, ×3 vanaf 6, ×4 vanaf 10 op rij', () => {
    const at = s => app.run(`(() => { G = { streak: ${s} }; const m = mult(); G = null; return m; })()`);
    assert.deepEqual([0, 2, 3, 5, 6, 9, 10, 50].map(at), [1, 1, 2, 2, 3, 3, 4, 4]);
  });

  test('typ-modus: typvragen uit de quiz plus de extra typvragen', () => {
    for (let w = 1; w <= 6; w++) {
      const r = get(`(() => { const w = weekOf(${w}); return {
        pool: poolFor('type', ${w}).length,
        expected: w.questions.filter(q => q.type === 'type').length + w.typing.length,
        allTyped: poolFor('type', ${w}).every(q => q.type === 'type' || q.type === 'sentence') }; })()`);
      assert.equal(r.pool, r.expected, `week ${w}`);
      assert.ok(r.allTyped, `week ${w}: geen meerkeuze in de typ-modus`);
    }
  });

  test('speedrun en eindbaas hebben geen typvragen (die kosten te veel tijd)', () => {
    assert.equal(app.run(`poolFor('speed', 0).some(q => q.type === 'type')`), false);
  });

  test('alleen de typ-modus heeft geen klok', () => {
    assert.deepEqual(get(`['quiz','speed','boss','retry','type'].map(hasTimer)`), [true, true, true, true, false]);
  });
});

describe('zoeken', () => {
  test('fold: kleine letters, zonder accenten en backticks', () => {
    assert.equal(app.run('fold("Café `Async`")'), 'cafe async');
  });

  test('elk resultaat bevat alle zoekwoorden', () => {
    const hits = get(`findHits(termsOf('session commit')).map(h => h.hay.join(' '))`);
    assert.ok(hits.length > 0);
    for (const hay of hits) assert.ok(hay.includes('session') && hay.includes('commit'));
  });

  test('treffer in de vraag zelf staat boven een treffer alleen in de uitleg', () => {
    const hits = get(`findHits(termsOf('dataclass')).map(h => h.hay[0].includes('dataclass'))`);
    const firstMiss = hits.indexOf(false);
    if (firstMiss !== -1) assert.ok(!hits.slice(firstMiss).includes(true), 'titel-treffers horen bovenaan');
  });

  test('geen zoekwoorden of onzin geeft geen resultaten', () => {
    assert.equal(app.run(`findHits(termsOf('   ')).length`), 0);
    assert.equal(app.run(`findHits(termsOf('zzqqxx')).length`), 0);
  });

  test('zoeken vindt quizvragen, typvragen en flashcards', () => {
    const kinds = get(`[...new Set(findHits(termsOf('docker')).map(h => h.kind))].sort()`);
    assert.deepEqual(kinds, ['f', 'q', 't']);
  });

  test('highlight markeert tekst maar nooit binnen een HTML-tag', () => {
    assert.equal(app.run(`highlight('<code class="code">code</code> code', ['code'])`),
      '<code class="code"><mark>code</mark></code> <mark>code</mark>');
  });

  test('highlight is veilig met speciale tekens in de zoekterm', () => {
    assert.equal(app.run(`highlight(esc('a (b) c'), ['(b)'])`), 'a <mark>(b)</mark> c');
  });

  test('answerOf geeft voor elk soort item een antwoord', () => {
    const empty = get(`[...ALLQ, ...ALLT, ...ALLF].filter(it => !String(answerOf(it)).trim()).map(it => it.id)`);
    assert.deepEqual(empty, []);
  });
});
