// Tests voor de kaart: werelden, levels, draken en de regels wanneer iets open gaat.
// Draaien met: node --test tests/*.test.mjs

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './load.mjs';

/** Verse app met een gekozen voortgang op de kaart. */
function withMap(map = {}, dragons = {}) {
  const app = loadApp();
  app.run(`S.map = ${JSON.stringify(map)}; S.dragons = ${JSON.stringify(dragons)};`);
  return { run: code => app.run(code), get: code => JSON.parse(app.run(`JSON.stringify(${code})`)) };
}
/** Alle levels van een wereld als gehaald (met 2 sterren). */
const doneWorld = (app, week) => Object.fromEntries(app.get(`worldLevels(${week}).map(l => l.id)`).map(id => [id, 2]));

describe('werelden en levels', () => {
  const app = withMap();

  test('zes werelden met elk vijf levels (de lessen, zonder de losse eindopdracht)', () => {
    for (let w = 1; w <= 6; w++) {
      const levels = app.get(`worldLevels(${w})`);
      assert.equal(levels.length, 5, `wereld ${w}`);
      assert.ok(levels.every(l => !l.id.endsWith('.A') && l.week === w && l.title), `wereld ${w}`);
      assert.deepEqual(levels.map(l => l.index), [0, 1, 2, 3, 4]);
    }
  });

  test('elk level heeft genoeg vragen om te spelen', () => {
    for (let w = 1; w <= 6; w++) {
      for (const l of app.get(`worldLevels(${w})`)) {
        const n = app.run(`levelPool(${JSON.stringify(l.id)}).length`);
        assert.ok(n >= 5, `${l.id} heeft maar ${n} vragen`);
      }
    }
  });

  test('de draak vecht met alle vragen van zijn wereld, ook genoeg voor zijn levenspunten', () => {
    for (let w = 1; w <= 6; w++) {
      const n = app.run(`dragonPool(${w}).length`);
      assert.ok(n >= app.run('DRAGON_HP'), `wereld ${w}: ${n} vragen`);
      assert.ok(app.run(`dragonPool(${w}).every(q => q.week === ${w})`));
    }
  });

  test('puzzels uit het prototype zitten in de levels van week 1', () => {
    assert.ok(app.run(`levelPool('1.2').some(q => q.type === 'fill')`));
    assert.ok(app.run(`levelPool('1.3').some(q => q.type === 'parsons')`));
  });
});

describe('wat er open is', () => {
  test('nieuwe speler: alleen level 1 van wereld 1 is speelbaar, alles is wel te bekijken', () => {
    const app = withMap();
    assert.equal(app.run('levelUnlocked(worldLevels(1)[0])'), true);
    assert.equal(app.run('levelUnlocked(worldLevels(1)[1])'), false);
    assert.equal(app.run('dragonUnlocked(1)'), false);
    assert.equal(app.run('worldOpen(1)'), true);
    assert.equal(app.run('worldOpen(2)'), false);
    assert.equal(app.run('levelUnlocked(worldLevels(2)[0])'), false);
    // Bekijken kan altijd: de levels van elke wereld bestaan gewoon.
    assert.equal(app.run('worldLevels(6).length'), 5);
  });

  test('een gehaald level opent het volgende', () => {
    const app = withMap({ '1.1': 1 });
    assert.equal(app.run('levelUnlocked(worldLevels(1)[1])'), true);
    assert.equal(app.run('levelUnlocked(worldLevels(1)[2])'), false);
  });

  test('de draak wordt wakker als alle levels van de wereld gehaald zijn', () => {
    const base = withMap();
    const all = doneWorld(base, 1);
    const almost = { ...all };
    delete almost['1.5'];
    assert.equal(withMap(almost).run('dragonUnlocked(1)'), false);
    assert.equal(withMap(all).run('dragonUnlocked(1)'), true);
  });

  test('een nieuwe wereld gaat pas open na de draak van de vorige', () => {
    const base = withMap();
    const all = doneWorld(base, 1);
    assert.equal(withMap(all).run('levelUnlocked(worldLevels(2)[0])'), false);
    const after = withMap(all, { 1: true });
    assert.equal(after.run('worldOpen(2)'), true);
    assert.equal(after.run('levelUnlocked(worldLevels(2)[0])'), true);
  });

  test('levels in een gesloten wereld blijven dicht, ook met oude sterren', () => {
    // Bijvoorbeeld sterren uit een eerdere versie: zonder verslagen draak blijft wereld 2 dicht.
    const app = withMap({ '2.1': 3 });
    assert.equal(app.run('levelUnlocked(worldLevels(2)[1])'), false);
  });

  test('volgende stap: level, dan draak, dan de volgende wereld, en klaar na alles', () => {
    assert.deepEqual(withMap().get('nextStep()').level.id, '1.1');
    const base = withMap();
    const w1 = doneWorld(base, 1);
    assert.deepEqual(withMap(w1).get('nextStep()'), { type: 'dragon', week: 1 });
    assert.equal(withMap(w1, { 1: true }).get('nextStep()').level.id, '2.1');
    assert.equal(withMap(w1, { 1: true }).run('currentWorld()'), 2);
    let map = {};
    const dragons = {};
    for (let w = 1; w <= 6; w++) { map = { ...map, ...doneWorld(base, w) }; dragons[w] = true; }
    assert.deepEqual(withMap(map, dragons).get('nextStep()'), { type: 'done' });
  });
});

describe('sterren en opslaan', () => {
  test('sterren: 3 zonder fouten, 2 met één fout, anders 1', () => {
    const app = withMap();
    assert.deepEqual([0, 1, 2, 5].map(m => app.run(`starsFor(${m})`)), [3, 2, 1, 1]);
  });

  test('het beste resultaat telt en blijft bewaard', () => {
    const app = loadApp();
    app.run(`S.map = {}; recordLevel('1.1', 2); recordLevel('1.1', 1); recordLevel('1.2', 3); recordDragon(1);`);
    const reloaded = loadApp({ storage: app.store });
    assert.equal(reloaded.run(`levelStars('1.1')`), 2);
    assert.equal(reloaded.run(`levelStars('1.2')`), 3);
    assert.equal(reloaded.run('dragonDefeated(1)'), true);
  });

  test('oude opslag zonder kaart-velden werkt en krijgt lege kaart', () => {
    const old = { xp: 300, m: { '1-0': { b: 2, s: 3 } }, best: {}, fc: {}, streak: { count: 2, day: '' }, sound: true, last: Date.now() };
    const app = loadApp({ storage: { 'fayora-stamp-v1': JSON.stringify(old) } });
    assert.equal(app.run('S.xp'), 300);
    assert.equal(app.run(`box('1-0')`), 2);
    assert.equal(app.run('levelUnlocked(worldLevels(1)[0])'), true);
    assert.equal(app.run('JSON.stringify(mapTotals())'), JSON.stringify({ levels: 30, done: 0, stars: 0, dragons: 0 }));
  });
});

describe('routes', () => {
  const app = withMap();
  const route = h => app.get(`parseRoute(${JSON.stringify(h)})`);
  test('alle tabbladen hebben een route', () => {
    assert.deepEqual(route(''), { name: 'home' });
    assert.deepEqual(route('#/kaart'), { name: 'map', world: 0 });
    assert.deepEqual(route('#/kaart/4'), { name: 'map', world: 4 });
    assert.deepEqual(route('#/oefenen'), { name: 'oefenen' });
    assert.deepEqual(route('#/profiel'), { name: 'profiel' });
    assert.deepEqual(route('#/speeltuin'), { name: 'speeltuin' });
    assert.deepEqual(route('#/kennis/2.3'), { name: 'kb', page: 'les', id: '2.3' });
    assert.deepEqual(route('#/onbekend'), { name: 'home' });
  });
});
