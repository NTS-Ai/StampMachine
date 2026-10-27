/* ---------- Kaart: zes eilanden met levels en een draak ----------
   Elke wereld (week) is een isometrisch eiland met een eigen sfeer. Een pad loopt langs vijf levels
   naar de draak op de top. Alle werelden en levels zijn te bekijken; spelen kan alleen volgens de
   regels in progress.js (levelUnlocked, dragonUnlocked). Een tik of Enter op een node opent een
   paneel onderin met de les, je sterren en wat je moet doen om het te openen.
   Route: #/kaart (wereld waar je nu bent) en #/kaart/N. */

/** Hoogte van elk vakje van het eiland, per rij (y) en kolom (x). Achteraan is het hoger: daar woont de draak. */
const MAP_H = [
  [3, 3, 2, 2, 3, 2, 1],
  [3, 2, 2, 2, 2, 1, 1],
  [2, 2, 2, 1, 1, 1, 1],
  [2, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
];
/** Vakjes van het pad: vijf levels en als laatste de draak. [x, y] */
const MAP_PATH = [[3, 6], [5, 3], [2, 4], [3, 1], [1, 2], [0, 0]];

/** Van vakje (x, y) op hoogte z naar een punt in de SVG (viewBox 0 -36 360 456). */
const mapIso = (x, y, z) => [180 + (x - y) * 30, 128 + (x + y) * 17 - z * 18];
/** Het midden van de bovenkant van vakje (x, y). */
const mapAt = (x, y) => mapIso(x, y, MAP_H[y][x]);

/**
 * Het uiterlijk van elk eiland. tops: bovenkant (hoog, midden, laag; telkens twee tinten),
 * left/right: zijkanten (hoog, laag), water: zee (boven, onder), path: zandpad, decor: wat er op staat.
 * @type {{ name: string, tops: string[], left: string[], right: string[], water: string[], shine: string, path: string, pathOp: number, decor: () => string }[]}
 */
const ISLANDS = [
  { name: 'Groene weide', tops: ['#7BD88F', '#6BCB80', '#5CC28A', '#52B881', '#47B57F', '#3FAA77'], left: ['#7A5A8E', '#6B4A7A'], right: ['#5F4473', '#553A66'],
    water: ['#3FA7E8', '#1E5FB0'], shine: '#BFE6FF', path: '#E3CD92', pathOp: .6, decor: () => decorMeadow() },
  { name: 'Pakkettenbos', tops: ['#58B56E', '#4EAA64', '#43A05B', '#3B9653', '#338B4B', '#2C8044'], left: ['#7A5236', '#6A462D'], right: ['#5E3E28', '#523522'],
    water: ['#2FB6A8', '#18706C'], shine: '#B8F2E6', path: '#D9B47C', pathOp: .6, decor: () => decorForest() },
  { name: 'IJsvlakte van data', tops: ['#F6FBFF', '#E8F4FF', '#D6EBFB', '#C9E3F8', '#B9DAF4', '#ACD2F0'], left: ['#7FA7D6', '#6E94C4'], right: ['#5F82B3', '#5273A3'],
    water: ['#5CC3F0', '#2A6FB8'], shine: '#E6F7FF', path: '#9CC4EA', pathOp: .55, decor: () => decorIce() },
  { name: 'Serverwoestijn', tops: ['#F6D58B', '#EFCB7C', '#EBC071', '#E3B565', '#DCA95A', '#D49F50'], left: ['#C07A45', '#AE6C3B'], right: ['#9C5C32', '#8A512B'],
    water: ['#35C9C1', '#1A7F94'], shine: '#C8FFF8', path: '#FFF1CC', pathOp: .65, decor: () => decorDesert() },
  { name: 'Kristalvulkaan', tops: ['#9466D6', '#895CCB', '#7C50BC', '#7248B0', '#653FA2', '#5C3896'], left: ['#432870', '#3A2262'], right: ['#2F1C55', '#28184A'],
    water: ['#8E46C9', '#3F1A78'], shine: '#FFB37A', path: '#FF9F5A', pathOp: .45, decor: () => decorVolcano() },
  { name: 'Nachtrots', tops: ['#66709A', '#5E6891', '#545D84', '#4D567B', '#454D70', '#3F4767'], left: ['#2C3150', '#272C48'], right: ['#20243F', '#1C2038'],
    water: ['#27427E', '#101C44'], shine: '#9FB6FF', path: '#AEB9E8', pathOp: .4, decor: () => decorNight() },
];

/** Wereldkleuren als vaste tint (zoals --w1..--w6 in Dag), donker genoeg voor witte tekst in beide thema's. */
const WORLD_HEX = ['#3A5BD8', '#7A45D8', '#2563EB', '#0B7A5F', '#B34A17', '#B8326F'];

const MAP_ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFC93D" stroke="#B87500" stroke-width="1"/></svg>',
  starOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="currentColor" opacity=".22"/></svg>',
  xp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#FFD84A" stroke="#B87500" stroke-width="1"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z" fill="#FF5C86"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5c3-1.5 6-1.5 8 .5v14c-2-2-5-2-8-.5zM20 5c-3-1.5-6-1.5-8 .5v14c2-2 5-2 8-.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="currentColor"/></svg>',
};

/** Kaart-weergave: welke wereld, Stampy in de hoek, het open paneel. */
const MAPV = {
  world: 1,
  /** @type {Bot | null} */ bot: null,
  /** Index van de node waarvan het paneel open is, of -1. */ sel: -1,
  /** Welke knop na het opnieuw tekenen de focus krijgt (bij wisselen van wereld). @type {string} */ refocus: '',
};

/* ---------- gegevens per node ---------- */

/** Korte naam van een les: het stuk voor de dubbele punt. @param {string} title */
const shortTitle = title => String(title).split(/:\s/)[0];
/** Korte naam van een wereld, bijvoorbeeld "Python basis". @param {number} week */
const worldName = week => String((weekOf(week) || { title: '' }).title).split(/ & |: /)[0];
/** Naam en titel van de draak (DRAGONS van werkstroom DRAAK, als die er is). @param {number} week */
function dragonInfo(week) {
  const d = typeof DRAGONS !== 'undefined' && DRAGONS[week - 1];
  return {
    name: d && d.name ? d.name : `De draak van wereld ${week}`,
    title: d && d.title ? d.title : `Bewaker van ${worldName(week)}`,
  };
}

/**
 * Alles wat de kaart over een node moet weten.
 * @typedef {{ kind: 'level', level: Level, state: 'done' | 'open' | 'lock', stars: number, playable: boolean }
 *   | { kind: 'dragon', week: number, state: 'sleep' | 'awake' | 'defeated', playable: boolean }} MapNode
 * @param {number} week
 * @returns {MapNode[]}
 */
function mapNodes(week) {
  /** @type {MapNode[]} */
  const nodes = worldLevels(week).map(level => {
    const stars = levelStars(level.id);
    const playable = levelUnlocked(level);
    return { kind: 'level', level, stars, playable, state: stars > 0 ? 'done' : playable ? 'open' : 'lock' };
  });
  const state = dragonDefeated(week) ? 'defeated' : dragonUnlocked(week) ? 'awake' : 'sleep';
  nodes.push({ kind: 'dragon', week, state, playable: dragonUnlocked(week) });
  return nodes;
}

/** Waarom een node op slot zit, in gewone taal. @param {MapNode} n */
function lockReason(n) {
  const week = n.kind === 'level' ? n.level.week : n.week;
  if (!worldOpen(week)) return `Wereld ${week} gaat open als je ${dragonInfo(week - 1).name} in wereld ${week - 1} verslaat.`;
  if (n.kind === 'level') return `Haal eerst level ${n.level.index} om dit level te openen.`;
  const left = worldLevels(week).filter(l => !levelDone(l.id)).length;
  return `Haal eerst alle levels van deze wereld. Nog ${left} te gaan.`;
}

/** Toegankelijke naam van een node. @param {MapNode} n */
function nodeLabel(n) {
  if (n.kind === 'dragon') {
    const d = dragonInfo(n.week).name;
    return `${d}, eindbaas. ` + { sleep: 'Slaapt, op slot.', awake: 'Wakker: je kunt hem bevechten.', defeated: 'Verslagen.' }[n.state];
  }
  const head = `Level ${n.level.index + 1}: ${shortTitle(n.level.title)}. `;
  if (n.state === 'done') return head + `Gehaald met ${n.stars} van 3 sterren.`;
  return head + (n.state === 'open' ? 'Open: speel dit level.' : 'Op slot.');
}

/* ---------- openen en tekenen ---------- */

/** Toont de kaart van een wereld (0 = de wereld waar je nu bent). @param {number} world */
function openMap(world) {
  const week = world >= 1 && world <= WEEKS.length ? world : currentWorld();
  MAPV.world = week;
  MAPV.sel = -1;
  renderMap();
  showScreen('map');
  const focus = MAPV.refocus && /** @type {HTMLElement | null} */ (document.querySelector(MAPV.refocus));
  MAPV.refocus = '';
  if (focus) focus.focus({ preventScroll: true });
  greetOnMap();
}

function renderMap() {
  const week = MAPV.world;
  const w = weekOf(week);
  const open = worldOpen(week);
  const prog = worldProgress(week);
  if (MAPV.bot) MAPV.bot.destroy();

  const prev = week > 1 ? `<button class="wnav prev" type="button" data-world="${week - 1}" aria-label="Vorige wereld: wereld ${week - 1}, ${esc(worldName(week - 1))}">${MAP_ICON.left}<span>Wereld ${week - 1}</span></button>` : '';
  const next = week < WEEKS.length ? `<button class="wnav next" type="button" data-world="${week + 1}" aria-label="Volgende wereld: wereld ${week + 1}, ${esc(worldName(week + 1))}"><span>Wereld ${week + 1}</span>${MAP_ICON.right}</button>` : '';
  const chip = open
    ? (prog.dragon ? `<span class="mapchip won">${MAP_ICON.check}Uitgespeeld</span>` : `<span class="mapchip">${prog.done} / ${prog.levels} levels</span>`)
    : `<span class="mapchip locked">${MAP_ICON.lock}Op slot</span>`;

  $('#map').innerHTML = `
    <div class="mapbar">
      <button class="rbtn" type="button" data-act="home" aria-label="Terug naar home">${MAP_ICON.back}</button>
      <button class="wsel" type="button" id="wselBtn" aria-haspopup="true" aria-expanded="false" aria-controls="wPanel">
        <span class="wsel-num" style="--wc:${WORLD_HEX[week - 1]}">${week}</span><span class="wsel-t">${esc(worldName(week))}</span>${MAP_ICON.chev}
      </button>
    </div>
    <div class="wpanel" id="wPanel" hidden>
      <h2 class="wpanel-t" id="wPanelT">Kies een wereld</h2>
      <ul class="wlist2" aria-labelledby="wPanelT">${WEEKS.map(x => worldOption(x.week)).join('')}</ul>
    </div>
    <div class="mapstats" aria-label="Je stand">
      <span title="Sterren">${MAP_ICON.star}<b id="msStars">0</b><span class="sr-only"> sterren</span></span>
      <span title="XP">${MAP_ICON.xp}<b id="msXp">0</b><span class="sr-only"> XP</span></span>
      <span title="Levens per level">${MAP_ICON.heart}<b>3</b><span class="sr-only"> levens per level</span></span>
    </div>
    <div class="mapwrap" data-world="${week}" data-open="${open}">
      <div class="mascot left" id="mapBot"></div>
      ${chip}
      <svg class="map" viewBox="0 -36 360 456" role="group" aria-label="Wereld ${week}: ${esc(w.title)}. Vijf levels en de draak.">${islandSvg(week)}</svg>
      ${prev}${next}
    </div>
    <div class="legend" aria-hidden="true"><span><i style="background:#FFC93D"></i>Gehaald</span><span><i style="background:#3AA8FF"></i>Volgende</span><span><i style="background:#8C8AB8"></i>Op slot</span><span><i style="background:#FF7A4D"></i>Draak</span></div>
    ${worldCard(week)}
    <div class="npanel" id="nPanel" role="dialog" aria-modal="false" aria-labelledby="npTitle" hidden></div>`;

  MAPV.bot = mountBot($('#mapBot'));
  updateMapStats();
}

/** Eén wereld in de wereldkiezer. @param {number} week */
function worldOption(week) {
  const p = worldProgress(week);
  const open = worldOpen(week);
  const status = !open ? 'Op slot · bekijken mag'
    : p.dragon ? `Uitgespeeld · ${p.stars} van ${p.maxStars} sterren`
    : `${p.done} van ${p.levels} levels · ${p.stars} sterren`;
  const icon = !open ? `<span class="wo-ic lock">${MAP_ICON.lock}</span>` : p.dragon ? `<span class="wo-ic won">${MAP_ICON.check}</span>` : '';
  const cur = week === MAPV.world ? ' aria-current="true"' : '';
  return `<li><button class="wopt" type="button" data-world="${week}"${cur}>
    <span class="num" style="--wc:${WORLD_HEX[week - 1]}">${week}</span>
    <span class="wo-txt"><b>${esc(worldName(week))}</b><small>${esc(status)}</small></span>${icon}</button></li>`;
}

/** Kaart met uitleg over de wereld onder het eiland. @param {number} week */
function worldCard(week) {
  const w = weekOf(week);
  const p = worldProgress(week);
  const open = worldOpen(week);
  const d = dragonInfo(week);
  const steps = p.levels + 1;
  const done = p.done + (p.dragon ? 1 : 0);
  const dragonState = p.dragon ? 'verslagen' : dragonUnlocked(week) ? 'wakker' : 'slaapt';
  const note = open ? '' : `<p class="wc-lock">${MAP_ICON.lock}<span>${esc(lockReason({ kind: 'dragon', week, state: 'sleep', playable: false }))} Rondkijken en de lessen lezen kan al.</span></p>`;
  return `<section class="wcard glass" aria-labelledby="wcT" style="--wc:${WORLD_HEX[week - 1]}">
    <div class="wc-head"><span class="num">${week}</span><div><h2 id="wcT">${esc(w.title)}</h2><p class="wc-sub">${esc(ISLANDS[week - 1].name)} · ${esc(w.level)}</p></div></div>
    <p class="wc-topics">${esc(w.topics)}</p>
    <div class="wc-bar" role="progressbar" aria-label="Voortgang in wereld ${week}" aria-valuemin="0" aria-valuemax="${steps}" aria-valuenow="${done}"><i style="width:${Math.round(done / steps * 100)}%"></i></div>
    <p class="wc-stats"><span>${p.done} van ${p.levels} levels</span><span>${p.stars} van ${p.maxStars} sterren</span><span>${esc(d.name)}: ${dragonState}</span></p>
    ${note}
  </section>`;
}

/** Stand bovenaan de kaart; wordt ook bijgewerkt via renderHud(). */
function updateMapStats() {
  const stars = document.getElementById('msStars');
  const xp = document.getElementById('msXp');
  if (stars) stars.textContent = nl(mapTotals().stars);
  if (xp) xp.textContent = nl(S.xp);
}
HUD_HOOKS.push(updateMapStats);

/** Stampy geeft een tip die past bij waar je bent. */
function greetOnMap() {
  const week = MAPV.world;
  const bot = MAPV.bot;
  if (!bot) return;
  const nodes = mapNodes(week);
  let tip;
  if (!worldOpen(week)) tip = `Wereld ${week} zit nog op slot. Kijk gerust rond!`;
  else {
    const open = nodes.find(n => n.kind === 'level' && n.state === 'open');
    const dragon = nodes[nodes.length - 1];
    if (open && open.kind === 'level') tip = `Level ${open.level.index + 1}: ${shortTitle(open.level.title)}. Tik erop!`;
    else if (dragon.state === 'awake') tip = 'De draak is wakker! Durf jij?';
    else tip = week < WEEKS.length ? `Wereld klaar! Op naar wereld ${week + 1}.` : 'Alles uitgespeeld. Legendarisch!';
  }
  setTimeout(() => { if (MAPV.bot === bot) bot.say(tip, 3600); }, 450);
}

/* ---------- het eiland ---------- */

/** De hele SVG-inhoud van een eiland: lucht, zee, vakjes, decor, pad en nodes. @param {number} week */
function islandSvg(week) {
  const look = ISLANDS[week - 1];
  let s = `<defs><linearGradient id="mapWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${look.water[0]}"/><stop offset="1" stop-color="${look.water[1]}"/></linearGradient>
    <radialGradient id="mapGlow"><stop offset="0" stop-color="#FFE08A" stop-opacity=".9"/><stop offset="1" stop-color="#FFE08A" stop-opacity="0"/></radialGradient></defs>`;
  s += `<g aria-hidden="true">${skySvg(week)}`;

  // Zee rond het eiland
  const [wx, wy] = mapIso(3, 3, 0);
  s += `<path d="M${wx} ${wy - 160} L${wx + 260} ${wy - 3} L${wx} ${wy + 154} L${wx - 260} ${wy - 3} Z" fill="url(#mapWater)" opacity=".92"/>`;
  s += `<path class="water-sh" d="M${wx - 150} ${wy + 40} q20 -6 40 0 M${wx + 90} ${wy + 70} q20 -6 40 0 M${wx - 40} ${wy + 112} q20 -6 40 0 M${wx + 150} ${wy + 10} q14 -5 28 0" stroke="${look.shine}" stroke-width="2" fill="none" opacity=".65"/>`;

  // Vakjes, van achter naar voor
  const onPath = new Set(MAP_PATH.map(p => p.join(',')));
  const tiles = [];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) tiles.push([x, y, MAP_H[y][x]]);
  tiles.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  for (const [x, y, h] of tiles) {
    const [cx, cy] = mapIso(x, y, h);
    const hh = h * 18 + 10;
    const alt = (x + y) % 2;
    const top = look.tops[(h >= 3 ? 0 : h === 2 ? 2 : 4) + alt];
    const hi = h >= 2 ? 0 : 1;
    s += `<path d="M${cx - 30} ${cy} L${cx} ${cy + 17} L${cx} ${cy + 17 + hh} L${cx - 30} ${cy + hh} Z" fill="${look.left[hi]}"/>`;
    s += `<path d="M${cx} ${cy + 17} L${cx + 30} ${cy} L${cx + 30} ${cy + hh} L${cx} ${cy + 17 + hh} Z" fill="${look.right[hi]}"/>`;
    s += `<path d="M${cx} ${cy - 17} L${cx + 30} ${cy} L${cx} ${cy + 17} L${cx - 30} ${cy} Z" fill="${top}"/>`;
    if (onPath.has(x + ',' + y)) s += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="9.5" fill="${look.path}" opacity="${look.pathOp}"/>`;
  }
  s += look.decor();
  s += '</g>';

  // Pad en nodes
  const nodes = mapNodes(week);
  const pts = MAP_PATH.map(([x, y]) => mapAt(x, y));
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const n = nodes[i + 1];
    const walked = n.kind === 'level' ? n.state === 'done' : n.state === 'defeated';
    s += `<path d="M${ax} ${ay - 4} L${bx} ${by - 4}" aria-hidden="true" fill="none" stroke="${walked ? '#FFD84A' : '#FFFFFF'}" stroke-opacity="${walked ? .95 : .75}" stroke-width="${walked ? 3.5 : 2.5}" stroke-dasharray="${walked ? '1 7' : '2 6'}" stroke-linecap="round"/>`;
  }
  nodes.forEach((n, i) => { s += nodeSvg(n, i, pts[i][0], pts[i][1] - 6); });
  return s;
}

/** Een node op het pad. @param {MapNode} n @param {number} i @param {number} cx @param {number} cy */
function nodeSvg(n, i, cx, cy) {
  const big = n.kind === 'dragon';
  const rx = big ? 27 : 15;
  const ry = big ? 14 : 8.5;
  const look = big
    ? { sleep: ['#8C8AB8', '#5D5B88'], awake: ['#FF8A5C', '#B8441F'], defeated: ['#FFC93D', '#B87500'] }[n.state]
    : { done: ['#FFC93D', '#B87500'], open: ['#3AA8FF', '#1C63B8'], lock: ['#8C8AB8', '#5D5B88'] }[n.state];
  const pulse = n.state === 'open' || n.state === 'awake';
  let s = `<g class="node${big ? ' dragon' : ''}" role="button" tabindex="0" aria-haspopup="dialog" data-node="${i}" aria-label="${esc(nodeLabel(n))}">`;
  s += `<ellipse class="hit" cx="${cx}" cy="${cy - (big ? 26 : 4)}" rx="${big ? 36 : 26}" ry="${big ? 44 : 22}" fill="transparent"/>`;
  s += `<g class="ring"><ellipse cx="${cx}" cy="${cy + 2}" rx="${rx + 7}" ry="${ry + 5}" fill="none" stroke="#1A1450" stroke-width="6"/><ellipse cx="${cx}" cy="${cy + 2}" rx="${rx + 7}" ry="${ry + 5}" fill="none" stroke="#FFC93D" stroke-width="3"/></g>`;
  if (pulse) s += `<ellipse class="pulse" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${big ? '#FFB08A' : '#7FD0FF'}" stroke-width="2.5"/>`;
  s += `<g class="top"><ellipse cx="${cx}" cy="${cy + 5}" rx="${rx}" ry="${ry}" fill="${look[1]}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${look[0]}" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>`;
  if (big) {
    s += dragonOnMap(n.week, /** @type {'sleep' | 'awake' | 'defeated'} */ (n.state), cx, cy + 1);
  } else {
    s += `<text x="${cx}" y="${cy + 4.5}" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="13" fill="${n.state === 'lock' ? '#1A1840' : '#1A1450'}" aria-hidden="true">${n.level.index + 1}</text>`;
  }
  s += '</g>';
  if (n.kind === 'level' && n.state === 'done') {
    for (let k = 0; k < 3; k++) {
      const sx = cx - 13 + k * 13;
      const sy = cy - 17 - (k === 1 ? 4 : 0);
      s += `<polygon points="${mapStar(sx, sy, 5.5)}" fill="${k < n.stars ? '#FFE27A' : '#4B4880'}" stroke="#8A5A00" stroke-width=".8"/>`;
    }
  }
  if ((n.kind === 'level' && n.state === 'lock') || (big && n.state === 'sleep')) {
    const lx = cx + rx - 3;
    const ly = cy - (big ? 6 : 12);
    s += `<g transform="translate(${lx} ${ly})"><circle r="8" fill="#3B3966"/><rect x="-4" y="-1" width="8" height="6.5" rx="1.5" fill="#E6E5FF"/><path d="M-2.4 -1v-1.8a2.4 2.4 0 014.8 0V-1" stroke="#E6E5FF" stroke-width="1.5" fill="none"/></g>`;
  }
  if (big && n.state === 'defeated') s += victoryFlag(cx + rx + 2, cy + 2, n.week);
  return s + '</g>';
}

/** Ster met vijf punten als polygon-punten. @param {number} cx @param {number} cy @param {number} r */
function mapStar(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * .45 : r;
    p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
  }
  return p.join(' ');
}

/** Vlag naast een verslagen draak. @param {number} x @param {number} y @param {number} week */
function victoryFlag(x, y, week) {
  return `<g aria-hidden="true"><rect x="${x - 1.2}" y="${y - 44}" width="2.4" height="44" rx="1" fill="#5B4A2E"/>
    <path d="M${x + 1} ${y - 43} L${x + 22} ${y - 37} L${x + 1} ${y - 30} Z" fill="${WORLD_HEX[week - 1]}" stroke="#fff" stroke-width="1"/>
    <polygon points="${mapStar(x + 9, y - 36.5, 3.2)}" fill="#FFE27A"/><circle cx="${x}" cy="${y - 45}" r="2.4" fill="#FFC93D"/></g>`;
}

/**
 * De draak op zijn node. Gebruikt dragonMapSprite van werkstroom DRAAK als die bestaat,
 * anders een eenvoudige draak in de kleur van de wereld.
 * @param {number} week @param {'sleep' | 'awake' | 'defeated'} state @param {number} cx @param {number} cy
 */
function dragonOnMap(week, state, cx, cy) {
  if (typeof dragonMapSprite === 'function') {
    try { return `<g transform="translate(${cx} ${cy}) scale(.95)" aria-hidden="true">${dragonMapSprite(week, state)}</g>`; } catch (e) { /* val terug op de placeholder */ }
  }
  const c = WORLD_HEX[week - 1];
  const down = state === 'defeated';
  const eyes = state === 'awake'
    ? '<circle cx="15" cy="-49" r="3.4" fill="#fff"/><circle cx="16" cy="-49" r="1.8" fill="#1A1450"/>'
    : down ? '<path d="M12 -51l5 5M17 -51l-5 5" stroke="#1A1450" stroke-width="1.8" stroke-linecap="round"/>'
    : '<path d="M11.5 -49q3.5 2.5 7 0" stroke="#1A1450" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  const extra = state === 'sleep'
    ? '<g class="zz" font-family="Fredoka, sans-serif" font-weight="700" fill="#fff"><text x="26" y="-58" font-size="9">z</text><text x="33" y="-68" font-size="12">z</text></g>'
    : state === 'awake' ? '<path class="puff" d="M28 -47 q8 -3 12 2 q-6 0 -12 2z" fill="#FF9A2E"/>' : '';
  const body = `<path d="M-14 -14 q-16 2 -20 -12 q8 6 14 4z" fill="${c}"/>
    <path d="M-6 -40 l-20 -16 l4 14 l-12 -2 l14 14z" fill="${c}" opacity=".75"/>
    <ellipse cx="0" cy="-20" rx="18" ry="16" fill="${c}"/><ellipse cx="3" cy="-16" rx="10" ry="10" fill="#FFE2B8" opacity=".9"/>
    <rect x="-12" y="-8" width="8" height="8" rx="3" fill="${c}"/><rect x="5" y="-8" width="8" height="8" rx="3" fill="${c}"/>
    <path d="M8 -58 l3 -9 l3 8z M17 -57 l4 -8 l1 9z" fill="#FFE27A"/>
    <circle cx="14" cy="-46" r="12" fill="${c}"/><ellipse cx="22" cy="-41" rx="6" ry="4.5" fill="${c}"/><circle cx="25" cy="-42" r="1" fill="#1A1450"/>${eyes}`;
  const pose = down ? `transform="rotate(-14) translate(0 4)" opacity=".8"` : '';
  return `<g transform="translate(${cx} ${cy}) scale(.95)" aria-hidden="true"><g ${pose}>${body}</g>${extra}</g>`;
}

/* ---------- lucht en decor per wereld ---------- */

/** Lucht: wolken overdag, maan en sterren 's nachts (Nachtrots heeft altijd sterren). @param {number} week */
function skySvg(week) {
  const cloud = (x, y, k) => `<g class="cloud dayonly" opacity=".7"><ellipse cx="${x}" cy="${y}" rx="${26 * k}" ry="${9 * k}" fill="#fff"/><ellipse cx="${x - 12 * k}" cy="${y - 6 * k}" rx="${14 * k}" ry="${10 * k}" fill="#fff"/><ellipse cx="${x + 8 * k}" cy="${y - 7 * k}" rx="${11 * k}" ry="${8 * k}" fill="#fff"/></g>`;
  const stars = [[104, 30], [126, 62], [240, 24], [262, 52], [300, 92], [96, 96], [228, 70], [330, 60]]
    .map(([x, y], i) => `<circle class="twinkle" style="animation-delay:${(i * .37).toFixed(2)}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}" fill="#fff"/>`).join('');
  const moon = '<path d="M290 61a13 13 0 1 0 12 18a10.5 10.5 0 1 1 -12 -18z" fill="#FFF3C4"/>';
  if (week === 6) return `<g opacity=".9">${stars}</g>${moon}`;
  let s = cloud(116, 46, 1) + cloud(274, 96, .8);
  if (week === 3) s += '<g class="dayonly" fill="#fff" opacity=".9"><circle cx="230" cy="30" r="1.8"/><circle cx="150" cy="22" r="1.4"/><circle cx="320" cy="120" r="1.6"/><circle cx="60" cy="120" r="1.4"/></g>';
  return s + `<g class="nightonly">${stars}${moon}</g>`;
}

/** Isometrisch blok met een ruitvormige voet. a = halve breedte, h = hoogte. */
function islBox(cx, cy, a, h, top, left, right) {
  const b = a * 17 / 30;
  return `<path d="M${cx - a} ${cy} L${cx} ${cy + b} L${cx} ${cy + b - h} L${cx - a} ${cy - h}Z" fill="${left}"/>`
    + `<path d="M${cx} ${cy + b} L${cx + a} ${cy} L${cx + a} ${cy - h} L${cx} ${cy + b - h}Z" fill="${right}"/>`
    + `<path d="M${cx - a} ${cy - h} L${cx} ${cy + b - h} L${cx + a} ${cy - h} L${cx} ${cy - b - h}Z" fill="${top}"/>`;
}

/** Cilinder, bijvoorbeeld een database. */
function islCyl(cx, cy, r, h, top, side, line) {
  const ry = r * .5;
  return `<path d="M${cx - r} ${cy - h} L${cx - r} ${cy} A${r} ${ry} 0 0 0 ${cx + r} ${cy} L${cx + r} ${cy - h}Z" fill="${side}"/>`
    + `<ellipse cx="${cx}" cy="${cy - h}" rx="${r}" ry="${ry}" fill="${top}"/>`
    + (line ? `<path d="M${cx - r} ${cy - h / 2} A${r} ${ry} 0 0 0 ${cx + r} ${cy - h / 2}" fill="none" stroke="${line}" stroke-width="1.5"/>` : '');
}

/** Ronde boom (uit het ontwerp). */
function islTree(x, y, k = 1) {
  const [cx, cy] = mapAt(x, y);
  return `<rect x="${cx - 2.5}" y="${cy - 16 * k}" width="5" height="${16 * k}" rx="2" fill="#7A4E2E"/><circle cx="${cx}" cy="${cy - 24 * k}" r="${12 * k}" fill="#1F8F6A"/><circle cx="${cx - 6 * k}" cy="${cy - 18 * k}" r="${8 * k}" fill="#26A97A"/><circle cx="${cx + 5 * k}" cy="${cy - 30 * k}" r="${6 * k}" fill="#3CC48F"/>`;
}

/** Den; met snow = true een besneeuwde den. */
function islPine(x, y, k = 1, snow = false) {
  const [cx, cy] = mapAt(x, y);
  const g = snow ? ['#3C7A8C', '#2F6878'] : ['#1E7A4E', '#17663F'];
  const tri = (w, top, bot, c) => `<path d="M${cx - w} ${cy - bot} L${cx} ${cy - top} L${cx + w} ${cy - bot}Z" fill="${c}"/>`;
  let s = `<rect x="${cx - 2}" y="${cy - 10 * k}" width="4" height="${10 * k}" fill="#6A4428"/>`;
  s += tri(13 * k, 30 * k, 8 * k, g[1]) + tri(10 * k, 40 * k, 20 * k, g[0]) + tri(7 * k, 48 * k, 31 * k, g[1]);
  if (snow) s += `<path d="M${cx - 4 * k} ${cy - 41 * k} L${cx} ${cy - 48 * k} L${cx + 4 * k} ${cy - 41 * k} Q${cx} ${cy - 39 * k} ${cx - 4 * k} ${cy - 41 * k}Z" fill="#fff"/><path d="M${cx - 6 * k} ${cy - 30 * k} L${cx} ${cy - 40 * k} L${cx + 6 * k} ${cy - 30 * k} Q${cx} ${cy - 28 * k} ${cx - 6 * k} ${cy - 30 * k}Z" fill="#fff" opacity=".9"/>`;
  return s;
}

/** Bloemetjes. */
function islFlowers(x, y, colors = ['#FF5C86', '#FFC93D', '#fff']) {
  const [cx, cy] = mapAt(x, y);
  return [[-10, -2], [6, -5], [12, 3], [-2, 5]].map(([dx, dy], i) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="2.4" fill="${colors[i % colors.length]}"/><circle cx="${cx + dx}" cy="${cy + dy}" r=".9" fill="#8A5A00"/>`).join('');
}

/** Terminal met een prompt (uit het ontwerp). */
function islTerminal(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<path d="M${cx - 14} ${cy - 2} L${cx} ${cy + 6} L${cx + 14} ${cy - 2} L${cx} ${cy - 10}Z" fill="#2A2A55"/><path d="M${cx - 12} ${cy - 26} L${cx + 10} ${cy - 34} L${cx + 10} ${cy - 14} L${cx - 12} ${cy - 6}Z" fill="#1A1A3A" stroke="#8A6BFF" stroke-width="2"/><text x="${cx - 6}" y="${cy - 15}" font-family="JetBrains Mono, monospace" font-size="9" fill="#7EE7A8" transform="translate(${cx} ${cy}) skewY(-20) translate(${-cx} ${-cy})">&gt;_</text>`;
}

/** Een pakket (doos met tape). */
function islPackage(cx, cy, a = 9, h = 12) {
  return islBox(cx, cy, a, h, '#E2B178', '#C08A4E', '#A4723C') + `<path d="M${cx - a / 2} ${cy - h - a * 17 / 60} L${cx + a / 2} ${cy - h + a * 17 / 60}" stroke="#F7E3B5" stroke-width="2.5"/>`;
}

/** Stapel boeken. */
function islBooks(x, y) {
  const [cx, cy] = mapAt(x, y);
  return islBox(cx, cy, 10, 4, '#FFE7C2', '#D9485F', '#B5324A') + islBox(cx + 1, cy - 4, 9, 4, '#FFE7C2', '#3A7BD5', '#2A5FAE') + islBox(cx - 1, cy - 8, 8, 4, '#FFE7C2', '#F2A93B', '#C98512');
}

/** Stapel database-schijven. */
function islDatabase(x, y, k = 1) {
  const [cx, cy] = mapAt(x, y);
  let s = '';
  for (let i = 0; i < 3; i++) s += islCyl(cx, cy - i * 11 * k, 11 * k, 9 * k, '#9CC2FF', '#3F6FD8', null);
  return s + `<circle cx="${cx + 6 * k}" cy="${cy - 2 * k}" r="1.6" fill="#7EE7A8"/><circle cx="${cx + 6 * k}" cy="${cy - 13 * k}" r="1.6" fill="#7EE7A8"/><circle cx="${cx + 6 * k}" cy="${cy - 24 * k}" r="1.6" fill="#FFC93D"/>`;
}

/** Container met ribbels. */
function islContainer(x, y) {
  const [cx, cy] = mapAt(x, y);
  let s = islBox(cx, cy, 20, 16, '#7DB7FF', '#2F7DD6', '#2263B0');
  for (let i = 1; i < 5; i++) s += `<path d="M${cx - 20 + i * 4} ${cy + i * 2.27} l0 -16" stroke="#1D5AA0" stroke-width="1.2"/>`;
  for (let i = 1; i < 5; i++) s += `<path d="M${cx + i * 4} ${cy + 11.3 - i * 2.27} l0 -16" stroke="#184B86" stroke-width="1.2"/>`;
  return s;
}

/** IJskristal op de grond. */
function islIce(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<path d="M${cx - 8} ${cy} L${cx - 3} ${cy - 18} L${cx + 1} ${cy}Z" fill="#E6F7FF" stroke="#9CCFF2"/><path d="M${cx} ${cy + 2} L${cx + 5} ${cy - 12} L${cx + 10} ${cy + 1}Z" fill="#CFEFFF" stroke="#9CCFF2"/>`;
}

/** Servertoren met lampjes. */
function islTower(x, y, colors = ['#7A6AD0', '#5A4B9E', '#43387C'], k = 1) {
  const [cx, cy] = mapAt(x, y);
  const h = 50 * k;
  let s = islBox(cx, cy, 12, h, colors[0], colors[1], colors[2]);
  for (let i = 0; i < 5; i++) {
    const yy = cy - 10 - i * 8 * k;
    s += `<path d="M${cx + 2} ${yy + 5} l8 -4.5" stroke="#1E1840" stroke-width="2.5" opacity=".5"/><circle cx="${cx + 4}" cy="${yy + 3.2}" r="1.6" fill="${['#FF5C7A', '#3DDC97', '#FFC93D'][i % 3]}"/>`;
  }
  return s;
}

/** Cactus. */
function islCactus(x, y, k = 1) {
  const [cx, cy] = mapAt(x, y);
  return `<rect x="${cx - 4 * k}" y="${cy - 30 * k}" width="${8 * k}" height="${30 * k}" rx="${4 * k}" fill="#3E9B5A"/>
    <path d="M${cx - 4 * k} ${cy - 14 * k} h-5 a3 3 0 0 1 -3 -3 v-8" stroke="#3E9B5A" stroke-width="${5 * k}" fill="none" stroke-linecap="round"/>
    <path d="M${cx + 4 * k} ${cy - 18 * k} h4 a3 3 0 0 0 3 -3 v-6" stroke="#358A4F" stroke-width="${5 * k}" fill="none" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy - 31 * k}" r="${2.5 * k}" fill="#FF5C86"/>`;
}

/** Schotelantenne (API's). */
function islDish(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<rect x="${cx - 1.5}" y="${cy - 20}" width="3" height="20" fill="#8A93B8"/><path d="M${cx - 14} ${cy - 30} Q${cx} ${cy - 8} ${cx + 14} ${cy - 30} Z" fill="#E8ECF8" stroke="#8A93B8" stroke-width="1.5"/>
    <path d="M${cx} ${cy - 22} L${cx + 6} ${cy - 36}" stroke="#8A93B8" stroke-width="1.5"/><circle cx="${cx + 6}" cy="${cy - 37}" r="2.4" fill="#FF5C7A"/>
    <path class="signal" d="M${cx + 12} ${cy - 44} q6 4 4 12 M${cx + 17} ${cy - 49} q9 7 6 18" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
}

/** Palmboom bij het water. */
function islPalm(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<path d="M${cx} ${cy} Q${cx - 4} ${cy - 18} ${cx + 3} ${cy - 34}" stroke="#9C6B3C" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M${cx + 3} ${cy - 34} q-14 -4 -20 6 q10 -8 20 -6z M${cx + 3} ${cy - 34} q14 -6 20 4 q-10 -6 -20 -4z M${cx + 3} ${cy - 34} q-4 -12 -14 -14 q10 2 14 14z M${cx + 3} ${cy - 34} q8 -12 18 -10 q-10 0 -18 10z" fill="#2FA866"/>`;
}

/** Kristal: twee vlakken met een gloed. */
function islCrystal(x, y, k = 1, c = ['#FF8AD8', '#C04FA0']) {
  const [cx, cy] = mapAt(x, y);
  const shard = (dx, h, w) => `<path d="M${cx + dx - w} ${cy - h * .3} L${cx + dx} ${cy - h} L${cx + dx} ${cy + 2} Z" fill="${c[0]}"/><path d="M${cx + dx} ${cy - h} L${cx + dx + w} ${cy - h * .3} L${cx + dx} ${cy + 2} Z" fill="${c[1]}"/>`;
  return `<ellipse class="glow" cx="${cx}" cy="${cy - 10 * k}" rx="${16 * k}" ry="${14 * k}" fill="${c[0]}" opacity=".25"/>` + shard(-6 * k, 18 * k, 4 * k) + shard(2 * k, 28 * k, 6 * k) + shard(9 * k, 14 * k, 4 * k);
}

/** Vulkaan met lava en rook. */
function islVolcano(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<path d="M${cx - 34} ${cy + 6} L${cx - 11} ${cy - 44} L${cx + 11} ${cy - 44} L${cx + 34} ${cy + 6} Q${cx} ${cy + 18} ${cx - 34} ${cy + 6}Z" fill="#4A2C7A"/>
    <path d="M${cx + 11} ${cy - 44} L${cx + 34} ${cy + 6} Q${cx + 18} ${cy + 13} ${cx + 4} ${cy + 12}Z" fill="#3A2262"/>
    <ellipse cx="${cx}" cy="${cy - 44}" rx="11" ry="4.5" fill="#FF7A2E"/><ellipse cx="${cx}" cy="${cy - 44}" rx="6" ry="2.4" fill="#FFD84A"/>
    <path d="M${cx - 3} ${cy - 41} Q${cx - 10} ${cy - 24} ${cx - 6} ${cy - 14} Q${cx - 14} ${cy - 2} ${cx - 10} ${cy + 8}" stroke="#FF8A3D" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <g class="smoke" fill="#B7A6D9" opacity=".7"><circle cx="${cx - 2}" cy="${cy - 56}" r="6"/><circle cx="${cx + 6}" cy="${cy - 64}" r="7.5"/><circle cx="${cx - 1}" cy="${cy - 74}" r="5"/></g>`;
}

/** Vuurtoren met een draaiende lichtbundel. */
function islLighthouse(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<path class="beam" d="M${cx} ${cy - 52} L${cx + 80} ${cy - 70} L${cx + 80} ${cy - 40} Z" fill="url(#mapGlow)" opacity=".75"/>
    <path d="M${cx - 9} ${cy} L${cx - 6} ${cy - 44} L${cx + 6} ${cy - 44} L${cx + 9} ${cy} Q${cx} ${cy + 4} ${cx - 9} ${cy}Z" fill="#F3F5FB"/>
    <path d="M${cx - 8.2} ${cy - 12} L${cx + 8.2} ${cy - 12} L${cx + 7.4} ${cy - 22} L${cx - 7.4} ${cy - 22}Z M${cx - 6.8} ${cy - 30} L${cx + 6.8} ${cy - 30} L${cx + 6.2} ${cy - 38} L${cx - 6.2} ${cy - 38}Z" fill="#E0475F"/>
    <rect x="${cx - 6}" y="${cy - 54}" width="12" height="10" rx="2" fill="#FFE27A" stroke="#2A2F48" stroke-width="2"/>
    <path d="M${cx - 8} ${cy - 54} L${cx} ${cy - 62} L${cx + 8} ${cy - 54}Z" fill="#E0475F"/>`;
}

/** Gebouw met verlichte ramen (serverstad). */
function islBuilding(cx, cy, a, h, k = 0) {
  let s = islBox(cx, cy, a, h, '#7C86B8', '#4A5280', '#383F66');
  const rows = Math.floor((h - 6) / 8);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 2; i++) {
      const on = (r + i + k) % 3 !== 0;
      const wxL = cx - a + 4 + i * (a / 2);
      const wyL = cy - h + 8 + r * 8 + (wxL - (cx - a)) * 17 / 30;
      s += `<rect x="${wxL.toFixed(1)}" y="${wyL.toFixed(1)}" width="3" height="4" fill="${on ? '#FFE27A' : '#2A2F48'}"/>`;
      const wxR = cx + 3 + i * (a / 2);
      const wyR = cy - h + 8 + r * 8 + (cx + a - wxR) * 17 / 30;
      s += `<rect x="${wxR.toFixed(1)}" y="${wyR.toFixed(1)}" width="3" height="4" fill="${(r + i + k) % 2 ? '#7EE7FF' : '#2A2F48'}"/>`;
    }
  }
  return s;
}

/** Rotsblokjes. */
function islRocks(x, y, c = ['#8A90B0', '#6A708E', '#565B78']) {
  const [cx, cy] = mapAt(x, y);
  return islBox(cx - 6, cy + 2, 6, 6, c[0], c[1], c[2]) + islBox(cx + 6, cy - 1, 4, 4, c[0], c[1], c[2]);
}

/** Houten bordje met een stukje code. */
function islSign(x, y, text) {
  const [cx, cy] = mapAt(x, y);
  return `<rect x="${cx - 1.5}" y="${cy - 20}" width="3" height="20" fill="#7A4E2E"/><path d="M${cx - 15} ${cy - 30} L${cx + 15} ${cy - 36} L${cx + 15} ${cy - 22} L${cx - 15} ${cy - 16}Z" fill="#C89A5E" stroke="#7A4E2E" stroke-width="1.5"/>
    <text x="${cx}" y="${cy - 22}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="8" fill="#3A2412" transform="translate(${cx} ${cy - 26}) skewY(-11) translate(${-cx} ${-(cy - 26)})">${esc(text)}</text>`;
}

/** Sneeuwpop. */
function islSnowman(x, y) {
  const [cx, cy] = mapAt(x, y);
  return `<circle cx="${cx}" cy="${cy - 8}" r="9" fill="#FFFFFF" stroke="#B9DAF4"/><circle cx="${cx}" cy="${cy - 22}" r="6.5" fill="#FFFFFF" stroke="#B9DAF4"/>
    <circle cx="${cx - 2}" cy="${cy - 23}" r="1" fill="#1A1450"/><circle cx="${cx + 2}" cy="${cy - 23}" r="1" fill="#1A1450"/><path d="M${cx} ${cy - 21} l5 1.5 l-5 1z" fill="#FF8A3D"/>
    <path d="M${cx - 6} ${cy - 16} h12" stroke="#E0475F" stroke-width="3" stroke-linecap="round"/>`;
}

/* Decor per wereld; vakjes zijn gekozen zodat niets het pad of de sterren bedekt. Van achter naar voor. */

function decorMeadow() {
  return islTree(4, 0, 1.1) + islTree(0, 3, .95) + islTree(5, 0, .8) + islTree(0, 4, .85) + islTerminal(4, 2) + islTree(5, 1, .75)
    + islTree(1, 5, .8) + islFlowers(4, 4) + islSign(5, 5, 'print()') + islFlowers(6, 5) + islFlowers(2, 6, ['#fff', '#FFC93D']) + islTree(1, 6, .7) + islFlowers(6, 6, ['#B58CFF', '#fff']);
}

function decorForest() {
  const [px, py] = mapAt(4, 2);
  const [ex, ey] = mapAt(5, 1);
  return islPine(4, 0, 1.15) + islPine(0, 3, 1) + islPine(5, 0, .85) + islPine(0, 4, .9) + islPackage(px - 6, py + 2) + islPackage(px + 8, py - 1, 7, 9) + islPackage(px - 2, py - 10, 7, 9)
    + islPackage(ex, ey, 8, 10) + islPine(1, 5, .85) + islBooks(4, 4) + islPackage(...mapAt(5, 5), 7, 9) + islPine(1, 6, .7) + islFlowers(6, 5, ['#FFE27A', '#fff']) + islPine(6, 6, .6);
}

function decorIce() {
  return islDatabase(4, 0, 1.1) + islPine(0, 3, 1, true) + islDatabase(5, 0, .8) + islDatabase(0, 4, .85) + islContainer(4, 2) + islPine(5, 1, .75, true)
    + islPine(1, 5, .85, true) + islIce(4, 4) + islSnowman(5, 5) + islIce(6, 5) + islPine(1, 6, .7, true) + islIce(6, 6);
}

function decorDesert() {
  const [rx, ry] = mapAt(4, 2);
  return islTower(4, 0, ['#C6CCE0', '#8A93B8', '#6A7396'], 1.1) + islCactus(0, 3) + islTower(5, 0, ['#C6CCE0', '#8A93B8', '#6A7396'], .7) + islCactus(0, 4, .8)
    + islBox(rx, ry, 11, 10, '#FF7A7A', '#D8323F', '#B0222F') + islBox(rx, ry - 12, 8, 9, '#FF9A9A', '#E04450', '#B82A38') + islDish(5, 1) + islPalm(1, 5) + islCactus(4, 4, .6) + islSign(5, 5, 'GET /') + islPalm(1, 6) + islRocks(6, 5, ['#E8C88A', '#C49A5A', '#A8804A']);
}

function decorVolcano() {
  return islVolcano(4, 0) + islCrystal(0, 3, 1) + islCrystal(5, 0, .8, ['#7AF0FF', '#2FA8C8']) + islCrystal(0, 4, .8, ['#FFE27A', '#E0A020'])
    + islCrystal(4, 2, .9) + islCrystal(5, 1, .7, ['#7AF0FF', '#2FA8C8']) + islCrystal(1, 5, .75, ['#B58CFF', '#7B5CFF']) + islRocks(4, 4, ['#6A4A9A', '#4A2C7A', '#3A2262']) + islCrystal(5, 5, .55, ['#7AF0FF', '#2FA8C8'])
    + islCrystal(1, 6, .6) + islCrystal(6, 5, .6, ['#FFE27A', '#E0A020']);
}

function decorNight() {
  const [ax, ay] = mapAt(4, 0);
  const [fx, fy] = mapAt(5, 0);
  const [dx, dy] = mapAt(4, 2);
  const [ex, ey] = mapAt(5, 1);
  return islBuilding(ax - 8, ay + 4, 10, 46, 1) + islBuilding(ax + 10, ay + 2, 9, 30, 2) + islBuilding(fx, fy, 10, 36, 0) + islLighthouse(0, 3) + islRocks(0, 4)
    + islBuilding(ex, ey, 9, 26, 1) + islBuilding(dx, dy, 11, 22, 2) + islRocks(1, 5) + islRocks(4, 4) + islBuilding(...mapAt(5, 5), 7, 18, 0) + islRocks(6, 5);
}

/* ---------- paneel onderin ---------- */

/** Opent het paneel van een node. @param {number} i */
function openNodePanel(i) {
  const n = mapNodes(MAPV.world)[i];
  if (!n) return;
  MAPV.sel = i;
  document.querySelectorAll('#map .node').forEach(el => el.classList.toggle('sel', el.getAttribute('data-node') === String(i)));
  const panel = $('#nPanel');
  const week = MAPV.world;
  const starsRow = k => `<span class="np-stars" role="img" aria-label="${k} van 3 sterren">${[0, 1, 2].map(j => j < k ? MAP_ICON.star : MAP_ICON.starOff).join('')}</span>`;
  let h = `<button class="np-close" type="button" data-act="close" aria-label="Sluiten">${MAP_ICON.close}</button>`;

  if (n.kind === 'level') {
    const L = n.level;
    const count = Math.min(LEVEL_SIZE, levelPool(L.id).length);
    const gameNames = typeof levelGames === 'function' ? levelGames(L.id).map(k => GAMES[k].name) : [];
    h += `<p class="np-chip" style="--wc:${WORLD_HEX[week - 1]}">Wereld ${week} · Level ${L.index + 1}</p>
      <h2 id="npTitle">${esc(shortTitle(L.title))}</h2>
      ${shortTitle(L.title) !== L.title ? `<p class="np-sub">${esc(L.title)}</p>` : ''}
      <ul class="np-facts">
        <li>${count} vragen · 3 levens</li>
        ${gameNames.length ? `<li>Daarna een minigame: ${esc(gameNames.join(' of '))}</li>` : ''}
        <li>${n.stars ? `Beste score: ${starsRow(n.stars)}` : n.playable ? 'Nog niet gehaald' : 'Op slot'}</li>
      </ul>`;
    if (!n.playable) h += `<p class="np-lock">${MAP_ICON.lock}<span>${esc(lockReason(n))}</span></p>`;
    h += '<div class="np-btns">';
    if (n.playable) h += `<button class="cta" type="button" data-act="play" data-id="${esc(L.id)}">${MAP_ICON.play}${n.stars ? 'Speel opnieuw' : 'Speel'}</button>`;
    h += `<a class="cta blue np-read" href="#/kennis/${encodeURIComponent(L.id)}">${MAP_ICON.book}Lees de les</a></div>`;
  } else {
    const d = dragonInfo(week);
    h += `<p class="np-chip" style="--wc:${WORLD_HEX[week - 1]}">Wereld ${week} · Eindbaas</p>
      <h2 id="npTitle">${esc(d.name)}</h2>
      <p class="np-sub">${esc(d.title)}</p>
      <ul class="np-facts">
        <li>Vragen uit de hele wereld · ${DRAGON_HP} keer raak om te winnen</li>
        <li>${n.state === 'defeated' ? 'Verslagen! Je mag hem opnieuw uitdagen.' : n.state === 'awake' ? 'Hij is wakker en wacht op je.' : 'Hij slaapt nog.'}</li>
      </ul>`;
    if (!n.playable) h += `<p class="np-lock">${MAP_ICON.lock}<span>${esc(lockReason(n))}</span></p>`;
    h += '<div class="np-btns">';
    if (n.playable) h += `<button class="cta fire" type="button" data-act="boss">${MAP_ICON.flame}${n.state === 'defeated' ? 'Opnieuw bevechten' : 'Bevecht de draak'}</button>`;
    h += `<a class="cta blue np-read" href="#/kennis">${MAP_ICON.book}Naar de kennisbank</a></div>`;
  }
  panel.innerHTML = h;
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('on'));
  const first = /** @type {HTMLElement | null} */ (panel.querySelector('.np-btns .cta'));
  setTimeout(() => (first || /** @type {HTMLElement} */ (panel.querySelector('.np-close'))).focus({ preventScroll: true }), 60);

  if (MAPV.bot) {
    if (!n.playable) MAPV.bot.react('think', 'Die zit nog op slot.');
    else if (n.kind === 'dragon') MAPV.bot.react('combo', 'Daar gaan we!');
    else MAPV.bot.react('ok', 'Goede keuze!');
  }
}

/** Sluit het paneel; de focus gaat terug naar de node. @param {boolean} [refocus] */
function closeNodePanel(refocus = true) {
  const panel = document.getElementById('nPanel');
  if (!panel || panel.hidden) return;
  const i = MAPV.sel;
  MAPV.sel = -1;
  panel.classList.remove('on');
  panel.hidden = true;
  document.querySelectorAll('#map .node.sel').forEach(el => el.classList.remove('sel'));
  const node = /** @type {HTMLElement | null} */ (document.querySelector(`#map .node[data-node="${i}"]`));
  if (refocus && node) node.focus({ preventScroll: true });
}

/* ---------- wereldkiezer ---------- */

/** @param {boolean} [show] */
function toggleWorldPanel(show) {
  const panel = document.getElementById('wPanel');
  const btn = document.getElementById('wselBtn');
  if (!panel || !btn) return;
  const on = show == null ? panel.hidden : show;
  panel.hidden = !on;
  btn.setAttribute('aria-expanded', String(on));
  if (on) {
    closeNodePanel(false);
    const cur = /** @type {HTMLElement | null} */ (panel.querySelector('[aria-current="true"]'));
    if (cur) cur.focus({ preventScroll: true });
  }
}

/** Naar een andere wereld; de knop waarmee je wisselde houdt de focus. @param {number} week @param {string} [refocus] */
function goWorld(week, refocus = '') {
  MAPV.refocus = refocus;
  navigate('#/kaart/' + week);
}

/* ---------- klikken en toetsen ---------- */

document.addEventListener('click', e => {
  const map = document.getElementById('map');
  if (!map || map.hidden) return;
  const t = /** @type {HTMLElement} */ (e.target);
  if (!(t instanceof Element) || !map.contains(t)) {
    if (t instanceof Element && !t.closest('#map')) toggleWorldPanel(false);
    return;
  }
  const act = /** @type {HTMLElement | null} */ (t.closest('[data-act], [data-world], .node, #wselBtn'));
  // Klik buiten de wereldkiezer sluit hem.
  if (!t.closest('#wPanel') && !t.closest('#wselBtn')) toggleWorldPanel(false);
  if (!act) return;
  if (act.id === 'wselBtn') { toggleWorldPanel(); return; }
  if (act.classList.contains('node')) { openNodePanel(Number(act.getAttribute('data-node'))); return; }
  if (act.dataset.world) {
    const w = Number(act.dataset.world);
    const refocus = act.classList.contains('wnav') ? (act.classList.contains('prev') ? '#map .wnav.prev' : '#map .wnav.next') : '#wselBtn';
    toggleWorldPanel(false);
    if (w !== MAPV.world) goWorld(w, refocus);
    else /** @type {HTMLElement} */ ($('#wselBtn')).focus();
    return;
  }
  switch (act.dataset.act) {
    case 'home': navigate('#/'); break;
    case 'close': closeNodePanel(); break;
    case 'play': if (act.dataset.id) startLevel(act.dataset.id); break;
    case 'boss':
      if (typeof startBoss === 'function') startBoss(MAPV.world);
      else toast('Het gevecht met de draak komt binnenkort.');
      break;
  }
});

document.addEventListener('keydown', e => {
  if (document.body.dataset.screen !== 'map') return;
  if (typeof isDialogOpen === 'function' && isDialogOpen()) return;
  const t = /** @type {Element} */ (e.target);
  if (e.key === 'Escape') {
    const wp = document.getElementById('wPanel');
    if (wp && !wp.hidden) { toggleWorldPanel(false); /** @type {HTMLElement} */ ($('#wselBtn')).focus(); e.preventDefault(); return; }
    if (MAPV.sel >= 0) { closeNodePanel(); e.preventDefault(); }
    return;
  }
  if (t instanceof Element && t.classList.contains('node') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    openNodePanel(Number(t.getAttribute('data-node')));
  }
});
