/* ---------- de draken: één eindbaas per wereld ----------
   Elke wereld (week) eindigt met een draak. Ze zijn getekend in dezelfde cartoonstijl als Stampy:
   dikke donkere omlijning, platte kleurvlakken, schattig maar stoer. De draak kijkt naar links,
   want Stampy staat linksonder in de arena.

   Gebruik:
     DRAGONS[week - 1]                        → { name, title, color, trait, lines, ... }
     dragonSVG(week, { state, hp })           → complete <svg class="dragon"> voor het gevecht
     dragonMapSprite(week, 'sleep' | 'awake' | 'defeated')  → <g> voor op de kaart, rond (0,0)
     dragonLine(week, 'intro' | 'hit' | 'miss' | 'low' | 'win' | 'lose')  → een zinnetje van de draak

   Staten: idle (ademt), sleep (slaapt, Zzz), hurt (geraakt), attack (spuwt vuur),
   dizzy (lage HP: spiraalogen, rookwolkjes), defeated (ligt neer, kruisjes-ogen, sterretjes).
   Hoe lager de HP, hoe gehavender hij eruitziet: elke treffer voegt een schram, pleister of buil toe.
   Alle losse delen zijn <g>'s met een class (d-head, d-wingN, d-tail, d-fire …), zodat boss.css ze animeert. */

/**
 * @typedef {Object} DragonColors
 * @property {string} body
 * @property {string} dark     Schaduwkant: achterpoot, oorvin.
 * @property {string} belly
 * @property {string} wing
 * @property {string} wingDark Achterste vleugel.
 * @property {string} horn
 * @property {string} accent   Stekels en accessoire.
 */

/**
 * @typedef {Object} Dragon
 * @property {number} week
 * @property {string} name
 * @property {string} title
 * @property {string} color      Hoofdkleur (hex), voor wie de draak buiten de SVG wil tonen.
 * @property {string} trait      Het kenmerk in gewone taal.
 * @property {DragonColors} colors
 * @property {string[]} glyphs   Code-flarden die in de arena zweven.
 * @property {Object<string, string[]>} lines  Zinnetjes per moment.
 */

/** @type {Dragon[]} */
const DRAGONS = [
  {
    week: 1, name: 'Syntaxdraak', title: 'Bewaker van Python basis',
    color: '#5B76F2', trait: 'Accolades als hoorns en >>> op zijn buik',
    colors: { body: '#5B76F2', dark: '#3A50C8', belly: '#FFE6A8', wing: '#A9B8FF', wingDark: '#7F91EA', horn: '#FFC93D', accent: '#FFC93D' },
    glyphs: ['print()', 'def', 'if x:'],
    lines: {
      intro: ['Wie komt mijn eiland op zonder dubbele punt?', 'SyntaxError! Jij komt er niet langs.', 'Ik eet vergeten haakjes als ontbijt.'],
      hit: ['Au! Geldige Python doet pijn.', 'Hé, die inspringing klopte!', 'Nee, niet nog een nette functie!'],
      miss: ['Ha! IndentationError voor jou.', 'Haakje vergeten? Vuur!', 'NameError! Wie ben jij ook alweer?'],
      low: ['Mijn accolades trillen...', 'Dit is niet... syntactisch correct...'],
      win: ['Kom terug als je je dubbele punten kent.'],
      lose: ['Oké, oké. Je spreekt Python.'],
    },
  },
  {
    week: 2, name: 'Bugdraak', title: "Bewaker van echte programma's",
    color: '#8C57E3', trait: 'Een bug-antenne en stippen als een kever',
    colors: { body: '#8C57E3', dark: '#6538B8', belly: '#DDF7AE', wing: '#CDB0FF', wingDark: '#A786EC', horn: '#7FE05A', accent: '#7FE05A' },
    glyphs: ['pytest', 'try:', 'pip install'],
    lines: {
      intro: ['Ik zit in elke regel die je niet test.', 'Zonder pytest vind je mij nooit.', 'Works on my machine. Niet op de jouwe.'],
      hit: ['Nee! Een test die slaagt!', 'Wie heeft die except geschreven?', 'Au, een type hint!'],
      miss: ['Traceback! Lees hem maar eens.', 'Ik verstop me in je venv.', 'KeyError! Hihi.'],
      low: ['Ik word... gerefactord...', 'Mijn antennes... vangen niks meer...'],
      win: ['Ik blijf gewoon in productie zitten.'],
      lose: ['Gefixt. En nog met een test erbij ook.'],
    },
  },
  {
    week: 3, name: 'Querydraak', title: 'Bewaker van de databases',
    color: '#2E8BEA', trait: 'Database-schubben op zijn rug',
    colors: { body: '#2E8BEA', dark: '#1A62BD', belly: '#C4F1FF', wing: '#95CDFF', wingDark: '#6AAEF0', horn: '#F2F6FF', accent: '#FFC93D' },
    glyphs: ['SELECT *', 'JOIN', 'id PK'],
    lines: {
      intro: ['SELECT moed FROM jou. Nul rijen.', 'Mijn schubben zijn genormaliseerd.', 'Jouw query loopt vast op mij.'],
      hit: ['Au! Een index op mijn zwakke plek.', 'Die JOIN kwam aan.', 'Een foreign key? Gemeen!'],
      miss: ['WHERE vergeten? Alles weg!', 'Deadlock! Jouw beurt is voorbij.', 'Full table scan. Lekker traag.'],
      low: ['Mijn transactie... rollback...', 'Te veel... migrations...'],
      win: ['COMMIT. Ik heb gewonnen.'],
      lose: ['DROP TABLE draak. Goed gespeeld.'],
    },
  },
  {
    week: 4, name: 'Timeoutdraak', title: 'Bewaker van de backend',
    color: '#1FA884', trait: 'Een zandloper aan zijn staart',
    colors: { body: '#1FA884', dark: '#0F7A5E', belly: '#FFF1BF', wing: '#86E5C9', wingDark: '#5CCBAA', horn: '#FFF6E0', accent: '#FFB020' },
    glyphs: ['GET /notes', '200 OK', '504'],
    lines: {
      intro: ['Jouw request duurt te lang. 504!', 'Ik laat elke API wachten.', 'Geen token? Geen toegang.'],
      hit: ['Een 200 OK? Au!', 'Async? Dat is te snel voor mij.', 'Gecachet in Redis? Gemeen!'],
      miss: ['Time-out! Probeer het later opnieuw.', '401: jij komt er niet in.', '422! Je JSON klopt niet.'],
      low: ['Mijn zandloper... loopt leeg...', 'Connection... reset...'],
      win: ['Verbinding verbroken. Tot de volgende retry.'],
      lose: ['Request voltooid. Ik ga uitrusten in de cache.'],
    },
  },
  {
    week: 5, name: 'Hallucinatiedraak', title: "Bewaker van de LLM's",
    color: '#EC7A40', trait: 'Een glitch-oog op zijn voorhoofd',
    colors: { body: '#EC7A40', dark: '#BE5420', belly: '#FFE3C2', wing: '#FFC09A', wingDark: '#F59E6E', horn: '#FFF2E2', accent: '#62F0FF' },
    glyphs: ['tokens', 'RAG', 'temperature'],
    lines: {
      intro: ['Ik ben de sterkste draak ter wereld. Bron: ikzelf.', 'Al mijn antwoorden klinken zeker. Ook de foute.', 'Ik heb nog een heel context window vuur.'],
      hit: ['Au! Een bron in je antwoord?', 'Grounding? Dat is niet eerlijk.', 'Structured output! Mijn zwakke plek.'],
      miss: ['Fout, maar ik zei het heel overtuigend.', 'Ik verzon net een nieuwe Python-functie.', 'Temperature 2.0! Vuur!'],
      low: ['Mijn context... raakt vol...', 'Ik weet het... niet zeker meer...'],
      win: ['Volgens mij heb ik gewonnen. Waarschijnlijk.'],
      lose: ['De eval liegt niet. Ik heb verloren.'],
    },
  },
  {
    week: 6, name: 'Pagerdraak', title: 'Bewaker van productie',
    color: '#D2468A', trait: 'Een piepende pager om zijn nek',
    colors: { body: '#D2468A', dark: '#A0295F', belly: '#FFD9E8', wing: '#FFA6CC', wingDark: '#EE80B0', horn: '#FFF0F5', accent: '#FFC93D' },
    glyphs: ['03:00', 'CI/CD', '/health'],
    lines: {
      intro: ['Het is 03:00. Mijn pieper gaat. Voor jou.', 'Productie ligt plat en ik lig hier lekker.', 'Wie heeft er op vrijdag gedeployed?'],
      hit: ['Au! Een health check die slaagt!', 'Wie heeft logging aangezet?', 'Een rollback-plan? Gemeen!'],
      miss: ['Rollback! Rollback!', 'Secret gelekt in de logs. Vuur!', 'De pipeline is rood!'],
      low: ['Alerts... worden... stil...', 'Mijn pager... batterij leeg...'],
      win: ['Ik piep je morgen om 03:00 weer.'],
      lose: ['Alles groen. Ik ga eindelijk slapen.'],
    },
  },
];

/** De draak van een week (valt terug op de eerste). @param {number} week */
const dragonOf = week => DRAGONS[week - 1] || DRAGONS[0];

/** Een willekeurig zinnetje van de draak. @param {number} week @param {'intro' | 'hit' | 'miss' | 'low' | 'win' | 'lose'} kind */
const dragonLine = (week, kind) => randomOf(dragonOf(week).lines[kind] || ['...']);

/** Waarom de draak (nog) op slot is, of '' als je hem kunt bevechten. @param {number} week */
function dragonLockText(week) {
  if (dragonUnlocked(week)) return '';
  if (!worldOpen(week)) return `Wereld ${week} is nog op slot. Versla eerst de ${dragonOf(week - 1).name} in wereld ${week - 1}.`;
  const left = worldLevels(week).filter(l => !levelDone(l.id)).length;
  return `Haal eerst alle levels van wereld ${week}. Nog ${left} ${left === 1 ? 'level' : 'levels'} te gaan.`;
}

/* ---------- tekenen ---------- */

/** Omlijning, gelijk aan die van Stampy. */
const D_OL = '#131A2F';
/** Hoeveel schrammen, pleisters en builen er bij 0 HP op de draak zitten. */
const DRAGON_MARKS = 11;

/** Pad met omlijning. */
const dPath = (d, fill, sw = 3.5, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${D_OL}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`;
/** Ellips, met of zonder omlijning (sw = 0). */
const dEll = (cx, cy, rx, ry, fill, sw = 3.5, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${sw ? ` stroke="${D_OL}" stroke-width="${sw}"` : ''}${extra}/>`;
/** Losse lijn. */
const dLine = (d, color = D_OL, sw = 3.5, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
/** Dikke lijn met omlijning: eerst donker en breed, dan de kleur er smal overheen. */
const dTube = (d, color, w = 6) => dLine(d, D_OL, w + 6) + dLine(d, color, w);

/** Vijfpuntige ster als polygon-punten. @param {number} cx @param {number} cy @param {number} r */
function dStar(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
  }
  return p.join(' ');
}

/** Een rookwolkje: drie bolletjes, zonder harde rand. */
const dPuff = (x, y, r) => `<g class="d-puff" opacity=".9">${dEll(x - r * .55, y + r * .2, r * .7, r * .62, '#C9CDDA', 0)}`
  + dEll(x + r * .5, y + r * .25, r * .65, r * .58, '#C9CDDA', 0) + dEll(x, y - r * .2, r * .8, r * .72, '#EEF0F7', 0) + '</g>';

/** Een kleine database-cilinder (rugschub van de Querydraak). */
function dCylinder(x, y, w, h, fill, rot = 0) {
  const r = w / 2, ry = w / 4.5;
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${dPath(`M${-r} 0 V${h} A${r} ${ry} 0 0 0 ${r} ${h} V0`, fill, 3)}`
    + dEll(0, 0, r, ry, '#FFE9A6', 3)
    + dLine(`M${-r} ${h / 2} A${r} ${ry} 0 0 0 ${r} ${h / 2}`, D_OL, 2) + '</g>';
}

/**
 * Houding per staat: transforms voor de losse delen. Hoe gehavender (lost 0..1), hoe meer hij doorzakt.
 * @param {string} state @param {number} lost
 */
function dragonPose(state, lost) {
  const sag = state === 'sleep' || state === 'defeated' ? 0 : lost;
  const p = {
    head: `translate(0 ${(sag * 6).toFixed(1)}) rotate(${(sag * 5).toFixed(1)} 110 118)`,
    body: '',
    wingN: `rotate(${(sag * 16).toFixed(1)} 160 122)`,
    wingF: `rotate(${(-sag * 8).toFixed(1)} 146 120)`,
    tail: '',
  };
  if (state === 'sleep') Object.assign(p, { head: 'translate(2 10) rotate(8 110 118)', wingN: 'rotate(30 160 122)', wingF: 'rotate(-4 146 120)' });
  if (state === 'attack') p.head = `translate(-8 ${(sag * 4).toFixed(1)}) rotate(-6 110 118)`;
  if (state === 'hurt') p.head = `translate(6 ${(sag * 4 - 2).toFixed(1)}) rotate(7 110 118)`;
  if (state === 'defeated') Object.assign(p, {
    head: 'translate(-16 90) rotate(-8 92 72)',
    body: 'translate(136 208) scale(1.08 .78) translate(-136 -208)',
    wingN: 'translate(0 24) rotate(42 160 122)',
    wingF: 'translate(0 24) rotate(58 146 120)',
    tail: 'translate(0 8) rotate(16 160 190)',
  });
  return p;
}

/** Ogen en wenkbrauwen per staat. @param {string} state @param {DragonColors} c */
function dragonEyes(state, c) {
  const eye = (cx, cy, rx, ry, px, pr) => `<g class="d-eye">${dEll(cx, cy, rx, ry, '#FFFFFF', 3)}${dEll(px, cy + 2, pr, pr + .6, D_OL, 0)}${dEll(px + 2, cy - 2, pr * .34, pr * .34, '#FFFFFF', 0)}</g>`;
  const open = eye(78, 66, 13, 15, 73, 6.5) + eye(108, 62, 10.5, 13, 104, 5.5);
  switch (state) {
    case 'sleep':
      return dLine('M66 68 Q78 77 90 68', D_OL, 4) + dLine('M99 64 Q108 71 117 64', D_OL, 4)
        + dLine('M66 52 Q78 48 90 52', D_OL, 4) + dLine('M100 49 Q108 46 117 49', D_OL, 4);
    case 'hurt':
      return dLine('M70 57 L85 66 L70 75', D_OL, 4.5) + dLine('M115 54 L102 62 L115 70', D_OL, 4.5)
        + dLine('M64 44 Q76 38 88 44', D_OL, 4.5) + dLine('M100 41 Q109 36 118 40', D_OL, 4.5);
    case 'attack':
      // Half dichtgeknepen ogen: het ooglid in lichaamskleur over de bovenkant, met een schuine lijn.
      return eye(78, 66, 13, 15, 72, 5.5) + eye(108, 62, 10.5, 13, 103, 4.6)
        + `<path d="M60 44 H96 V58 L60 66 Z" fill="${c.body}"/><path d="M96 44 H122 V54 L96 60 Z" fill="${c.body}"/>`
        + dLine('M62 64 L94 57', D_OL, 5) + dLine('M97 59 L120 53', D_OL, 5);
    case 'dizzy': {
      const spiral = (x, y, s) => `<g class="d-spin">${dEll(x, y, 12 * s, 14 * s, '#FFFFFF', 3)}${dLine(`M${x} ${y} m-1 0 a2 2 0 1 1 3 2 a5 5 0 1 1 -7 -5 a8 8 0 1 1 9 11`, D_OL, 2.6, ` transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})"`)}</g>`;
      return spiral(78, 66, 1) + spiral(108, 62, .82) + dLine('M64 48 Q76 52 88 47', D_OL, 4) + dLine('M100 46 Q108 43 117 47', D_OL, 4);
    }
    case 'defeated':
      return dLine('M70 58 L86 74 M86 58 L70 74', D_OL, 4.5) + dLine('M101 56 L115 70 M115 56 L101 70', D_OL, 4.5);
    default:
      return open + dLine('M63 51 L90 45', D_OL, 5) + dLine('M98 47 L120 42', D_OL, 5);
  }
}

/** Mond per staat. @param {string} state */
function dragonMouth(state) {
  const fang = dPath('M44 103 L47 112 L51 104 Z', '#FFFFFF', 2.5);
  if (state === 'attack' || state === 'hurt') {
    const small = state === 'hurt';
    return dPath(small ? 'M32 98 Q48 94 64 98 Q58 114 46 114 Q34 112 32 98 Z' : 'M26 96 Q50 90 78 97 Q68 124 44 122 Q28 118 26 96 Z', '#7A1530', 3)
      + (small ? '' : dEll(50, 114, 11, 5, '#FF6F8E', 0))
      + dPath('M36 97 L39 104 L43 96 Z', '#FFFFFF', 2) + dPath('M60 96 L62 103 L66 97 Z', '#FFFFFF', 2);
  }
  if (state === 'dizzy' || state === 'defeated') {
    return dLine('M30 101 Q38 95 46 101 Q54 107 62 101 Q68 97 74 101', D_OL, 3.5)
      + dPath('M48 103 Q47 118 55 118 Q62 118 61 103 Z', '#FF6F8E', 3) + dLine('M54.5 106 V113', '#C2304F', 2);
  }
  if (state === 'sleep') return dLine('M32 100 Q50 107 70 102', D_OL, 3.5) + fang;
  return dLine('M30 100 Q48 109 74 101', D_OL, 3.5) + fang;
}

/**
 * De draak zelf: één <g class="dragon-art"> in een vlak van 240 x 220, voeten op y = 209.
 * @param {number} week
 * @param {{ state?: string, lost?: number, mini?: boolean }} [opts]  lost: 0 (vol) tot 1 (geen HP meer)
 */
function dragonArt(week, { state = 'idle', lost = 0, mini = false } = {}) {
  const d = dragonOf(week), c = d.colors, w = d.week;
  // 'awake' (kaart) ziet eruit als 'idle', met een rookpluimpje uit de neus.
  const look = state === 'awake' ? 'idle' : state;
  lost = Math.max(0, Math.min(1, lost || 0));
  const marks = mini ? 0 : Math.ceil(lost * DRAGON_MARKS - 1e-9);
  const has = n => marks > n;
  const pose = dragonPose(look, lost);

  /* staart, met punt of zandloper */
  let tail = dTube('M150 192 Q200 204 212 170 Q220 146 205 130', c.body, 15);
  if (w === 4) {
    tail += `<g transform="translate(199 116) rotate(-35)">${dPath('M-9 -12 L9 -12 L0 0 L9 12 L-9 12 L0 0 Z', '#DDF4FF', 3)}`
      + `<path d="M-4 -7 L4 -7 L0 -2 Z" fill="${c.accent}"/><path d="M0 2 L7 10 L-7 10 Z" fill="${c.accent}"/>`
      + dPath('M-13 -16 H13 V-11 H-13 Z', '#8A5A2B', 3) + dPath('M-13 11 H13 V16 H-13 Z', '#8A5A2B', 3) + '</g>';
  } else {
    tail += dPath('M206 136 Q224 124 214 112 Q200 104 184 102 Q186 120 192 138 Q199 132 206 136 Z', c.accent, 3.5);
  }
  if (has(6)) tail += `<g transform="rotate(-62 214 160)">${dPath('M200 154 H228 V166 H200 Z', '#F4F1EA', 2.5)}${dLine('M209 154 V166 M219 154 V166', '#C9BFA8', 1.6)}</g>`;

  /* vleugels */
  const bones = (pts, from) => pts.map(p => dLine(`M${from} L${p}`, D_OL, 2.4)).join('');
  let wingF = dPath('M134 124 L146 62 L156 18 Q178 42 184 68 Q170 66 166 82 Q158 78 152 92 Q144 92 146 114 Z', c.wingDark)
    + bones(['184 68', '166 82', '152 92'], '150 46');
  let wingN = dPath('M150 128 L178 72 L230 38 Q236 66 226 92 Q214 85 206 99 Q196 92 188 108 Q176 104 168 128 Z', c.wing)
    + bones(['226 92', '206 99', '188 108'], '200 56');
  if (w === 2) wingN += dEll(206, 76, 5, 4, '#3A1F78', 0) + dEll(188, 92, 4, 3.5, '#3A1F78', 0) + dEll(214, 60, 3.5, 3, '#3A1F78', 0);
  if (has(3)) wingN += dLine('M196 70 l10 8 M192 76 l10 8', '#7A1530', 2.5);

  /* rugstekels (achter het lijf) */
  // Op de rand van het lijf (ellips 136,158 / 50,46), loodrecht op de rand.
  const spikesAt = [-82, -62, -42, -22].map(t => {
    const a = t * Math.PI / 180, x = 136 + 50 * Math.cos(a), y = 158 + 46 * Math.sin(a);
    const r = Math.atan2(Math.cos(a) / 50, -Math.sin(a) / 46) * 180 / Math.PI;
    return [x.toFixed(1), y.toFixed(1), r.toFixed(0)];
  });
  const spikes = spikesAt.map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">`
    + (w === 3 ? dCylinder(0, -14, 13, 12, c.accent) : dPath('M-10 6 Q-4 -6 0 -16 Q4 -6 10 6 Z', c.accent, 3)) + '</g>').join('');

  /* lijf: eerst alle omlijning, dan alle vulling, zodat nek en lijf één vorm zijn */
  let body = spikes
    + dEll(166, 202, 18, 9, c.dark) + dPath('M150 206 l-4 5 l7 -1 Z M157 208 l-2 5 l6 -2 Z', '#FFF6E0', 2)
    + dEll(106, 118, 24, 22, 'none', 7) + dEll(136, 158, 50, 46, 'none', 7)
    + dEll(106, 118, 24, 22, c.body, 0) + dEll(136, 158, 50, 46, c.body, 0);
  if (w === 2) body += dEll(160, 136, 6, 5, '#3A1F78', 0) + dEll(170, 166, 5, 4.5, '#3A1F78', 0) + dEll(152, 190, 4, 3.5, '#3A1F78', 0);
  body += dEll(118, 166, 30, 34, c.belly, 3);
  if (w === 1) {
    body += `<text x="118" y="172" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="15" fill="${D_OL}" opacity=".7">&gt;&gt;&gt;</text>`;
  } else if (w === 3) {
    body += dCylinder(118, 154, 22, 22, '#FFFFFF');
  } else if (w === 4) {
    body += dEll(118, 166, 15, 15, '#FFFFFF', 3) + dLine('M118 166 V157 M118 166 L125 170', D_OL, 2.6)
      + [0, 90, 180, 270].map(a => `<path d="M118 153.5 V156" stroke="${D_OL}" stroke-width="2" stroke-linecap="round" transform="rotate(${a} 118 166)"/>`).join('');
  } else {
    body += dLine('M95 150 Q118 156 141 150', D_OL, 2.5, ' opacity=".3"') + dLine('M92 164 Q118 170 144 164', D_OL, 2.5, ' opacity=".3"')
      + dLine('M94 178 Q118 184 142 178', D_OL, 2.5, ' opacity=".3"') + dLine('M100 191 Q118 196 136 191', D_OL, 2.5, ' opacity=".3"');
  }
  if (w === 6) {
    body += dLine('M88 112 Q104 132 128 114', '#2A2A44', 4)
      + dPath('M90 128 H120 Q124 128 124 132 V146 Q124 150 120 150 H90 Q86 150 86 146 V132 Q86 128 90 128 Z', '#2A2A44', 3)
      + `<rect x="90" y="132" width="21" height="11" rx="2" fill="#9BE7A0"/>`
      + `<text x="100.5" y="140.6" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="7" fill="#12331A">03:00</text>`
      + `<circle class="d-blink" cx="117.5" cy="137.5" r="3" fill="#FF3B3B"/>`;
  }
  if (has(0)) body += dLine('M150 142 l10 10 M156 138 l10 10 M162 136 l8 8', '#7A1530', 2.6);
  if (has(4)) body += `<g transform="rotate(-28 132 190)">${dPath('M118 185 H146 V195 H118 Z', '#F6D9A8', 2.5)}<path d="M128 187 v6 M136 187 v6" stroke="#C9A26B" stroke-width="1.6"/></g>`;
  if (has(7)) body += dLine('M170 168 l8 8 M175 164 l8 8', '#7A1530', 2.4);
  if (has(9)) body += dEll(104, 186, 9, 6, '#2A2438', 0, ' opacity=".28"') + dEll(132, 150, 6, 4, '#2A2438', 0, ' opacity=".22"');
  /* voorpoot en arm */
  body += dPath('M104 144 Q84 150 82 166 Q84 175 93 171 Q95 161 108 158 Z', c.body, 3.5)
    + dPath('M84 170 l-6 3 l7 2 Z', '#FFF6E0', 2);
  if (has(10)) body += `<g transform="rotate(30 92 158)">${dPath('M84 153 H100 V162 H84 Z', '#F4F1EA', 2.2)}</g>`;
  body += dEll(110, 203, 21, 10, c.body) + dPath('M90 207 l-6 3 l7 1 Z M97 210 l-5 4 l7 -1 Z', '#FFF6E0', 2);

  /* kop */
  let head = '';
  if (w === 1) {
    const brace = 'M6 -18 Q-2 -18 -1 -10 L-1 -5 Q-1 0 -7 0 Q-1 0 -1 5 L-1 10 Q-2 18 6 18';
    head += `<g transform="translate(86 22) rotate(-12) scale(1 1.1)">${dTube(brace, c.horn, 4.5)}</g>`
      + `<g transform="translate(117 20) rotate(14) scale(-1 1.1)">${dTube(brace, c.horn, 4.5)}</g>`;
  } else if (w === 2) {
    head += dTube('M86 40 Q80 16 66 8', c.dark, 3) + dEll(64, 7, 6, 6, c.accent, 3)
      + dTube('M106 36 Q112 12 128 6', c.dark, 3) + dEll(130, 6, 6, 6, c.accent, 3);
  } else {
    head += dPath('M76 44 Q80 16 106 6 Q96 22 98 38 Z', c.horn) + dPath('M102 38 Q112 14 134 10 Q122 24 122 42 Z', c.horn)
      + dLine('M84 32 Q90 30 95 33 M108 28 Q114 26 118 30', D_OL, 2, ' opacity=".45"');
  }
  head += dPath('M128 58 L156 48 L148 64 L160 74 L132 82 Z', c.dark)
    + dEll(92, 72, 46, 38, 'none', 7) + dEll(56, 90, 30, 20, 'none', 7)
    + dEll(92, 72, 46, 38, c.body, 0) + dEll(56, 90, 30, 20, c.body, 0)
    + dEll(80, 46, 15, 6, '#FFFFFF', 0, ' opacity=".28" transform="rotate(-18 80 46)"');
  head += dEll(34, 84, 2.6, 3.6, D_OL, 0) + dEll(46, 80, 2.4, 3.4, D_OL, 0)
    + dEll(98, 95, 9, 5, '#FF7A9C', 0, ' opacity=".5"');
  if (has(1)) head += dEll(102, 90, 10, 6, '#2A2438', 0, ' opacity=".3"') + dEll(110, 98, 4, 3, '#2A2438', 0, ' opacity=".25"');
  if (w === 5 && look !== 'sleep' && look !== 'defeated' && look !== 'hurt') {
    // Het glitch-oog: het voorste oog valt uiteen in een cyaan en een roze kopie.
    head += `<g class="d-glitch-eye">${dEll(74, 66, 14, 16, 'none', 0, ` stroke="${c.accent}" stroke-width="3"`)}`
      + dEll(83, 67, 14, 16, 'none', 0, ' stroke="#FF5CB8" stroke-width="3"')
      + `<rect x="60" y="74" width="9" height="4" fill="${c.accent}"/><rect x="88" y="54" width="8" height="4" fill="#FF5CB8"/></g>`;
  }
  head += `<g class="d-eyes">${dragonEyes(look, c)}</g>`;
  head += `<g class="d-jaw">${dragonMouth(look)}</g>`;
  if (has(2)) head += `<g transform="rotate(-20 104 40)">${dPath('M92 36 H116 V44 H92 Z', '#F6D9A8', 2.4)}</g><g transform="rotate(28 104 40)">${dPath('M92 36 H116 V44 H92 Z', '#F6D9A8', 2.4)}</g>`;
  if (has(5)) head += dEll(64, 42, 9, 7, c.body, 3) + dEll(62, 40, 3, 2, '#FFFFFF', 0, ' opacity=".5"');
  if (has(8)) head += dPath('M128 44 Q134 52 131 57 Q126 59 124 54 Q124 49 128 44 Z', '#8FD8FF', 2.2);
  if (has(10) && w !== 5) head += `<g transform="rotate(-10 50 82)">${dPath('M42 78 H58 V85 H42 Z', '#F6D9A8', 2)}</g>`;
  if (state === 'attack') {
    head += `<g class="d-fire">${dPath('M30 104 C6 92 -26 100 -52 124 C-34 122 -30 128 -44 142 C-22 134 -10 136 -18 150 C4 134 18 122 32 112 Z', '#FF6A2B', 3)}`
      + `<path d="M28 106 C8 100 -14 108 -30 124 C-16 122 -10 128 -16 136 C0 126 14 118 28 110 Z" fill="#FFC93D"/>`
      + `<path d="M26 107 C12 104 0 110 -10 120 C2 118 12 114 26 110 Z" fill="#FFF4C2"/></g>`;
  }

  /* effecten: Zzz, rook, sterretjes, glitch-pixels, inslag */
  let fx = '';
  const txt = (x, y, s, t, cls) => `<text class="${cls}" x="${x}" y="${y}" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="${s}" fill="#FFFFFF" stroke="${D_OL}" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${t}</text>`;
  if (state === 'sleep') fx += `<g class="d-zzz">${txt(132, 40, 15, 'z', 'd-z')}${txt(146, 26, 20, 'z', 'd-z')}${txt(162, 8, 27, 'Z', 'd-z')}</g>`;
  if (state === 'dizzy' || (!mini && lost >= .5 && (state === 'idle' || state === 'hurt' || state === 'attack'))) {
    fx += `<g class="d-smoke">${dPuff(24, 70, 5)}${dPuff(14, 54, 7)}${dPuff(8, 34, 9)}</g>`;
  }
  if (state === 'awake') {
    fx += `<g class="d-smoke">${dPuff(24, 72, 7)}${dPuff(12, 54, 10)}</g>`;
  }
  if (state === 'dizzy' || state === 'defeated') {
    const sy = state === 'defeated' ? 84 : -4, sx = state === 'defeated' ? -18 : 0;
    fx += `<g class="d-stars">${[[62, 14, 9], [86, 2, 7], [112, 12, 8]].map(([x, y, r]) => `<polygon class="d-star" points="${dStar(x + sx, y + sy, r)}" fill="#FFE27A" stroke="${D_OL}" stroke-width="2.4" stroke-linejoin="round"/>`).join('')}</g>`;
  }
  if (w === 5 && state !== 'defeated') {
    fx += `<g class="d-glitch"><rect x="124" y="30" width="7" height="7" fill="${c.accent}"/><rect x="134" y="42" width="5" height="5" fill="#FF5CB8"/><rect x="52" y="22" width="6" height="6" fill="${c.accent}"/><rect x="44" y="34" width="4" height="4" fill="#FF5CB8"/></g>`;
  }
  if (state === 'hurt') {
    fx += `<g class="d-impact"><polygon points="${dStar(140, 146, 26)}" fill="#FFF4C2" stroke="${D_OL}" stroke-width="3" stroke-linejoin="round"/>`
      + `<polygon points="${dStar(140, 146, 13)}" fill="#FFC93D"/></g>`;
  }

  const sat = mini || state === 'defeated' ? '' : lost > 0 ? ` style="filter:saturate(${(1 - lost * .35).toFixed(2)})"` : '';
  return `<g class="dragon-art d-w${w}" data-state="${state}"${sat}>`
    + `<ellipse class="d-shadow" cx="132" cy="210" rx="${state === 'defeated' ? 92 : 74}" ry="7" fill="#000000" opacity=".16"/>`
    + `<g transform="${pose.tail}"><g class="d-tail">${tail}</g></g>`
    + `<g transform="${pose.wingF}"><g class="d-wingF">${wingF}</g></g>`
    + `<g transform="${pose.wingN}"><g class="d-wingN">${wingN}</g></g>`
    + `<g transform="${pose.body}"><g class="d-body">${body}</g></g>`
    + `<g transform="${pose.head}"><g class="d-head">${head}</g></g>`
    + fx + '</g>';
}

/** Beschrijving van een staat, voor schermlezers. */
const DRAGON_STATE_LABEL = {
  idle: 'klaar voor het gevecht', sleep: 'slaapt', hurt: 'is geraakt', attack: 'spuwt vuur',
  dizzy: 'is duizelig', defeated: 'is verslagen', awake: 'is wakker',
};

/**
 * De draak voor het gevecht, als complete SVG.
 * @param {number} week
 * @param {{ state?: 'idle' | 'sleep' | 'hurt' | 'attack' | 'dizzy' | 'defeated', hp?: number }} [opts]
 */
function dragonSVG(week, { state = 'idle', hp = DRAGON_HP } = {}) {
  const d = dragonOf(week);
  const lost = 1 - Math.max(0, Math.min(DRAGON_HP, hp)) / DRAGON_HP;
  return `<svg class="dragon" viewBox="0 0 240 220" role="img" aria-label="${esc(`${d.name} ${DRAGON_STATE_LABEL[state] || ''}`.trim())}">`
    + dragonArt(week, { state, lost }) + '</svg>';
}

/**
 * De draak voor op de kaart: getekend rond (0,0) met de voeten op y = 0, ongeveer 70 px hoog.
 * @param {number} week
 * @param {'sleep' | 'awake' | 'defeated'} state
 */
function dragonMapSprite(week, state) {
  const look = state === 'awake' ? 'awake' : state === 'defeated' ? 'defeated' : 'sleep';
  return `<g class="dragon-sprite" data-state="${look}"><g transform="scale(.34) translate(-132 -211)">`
    + dragonArt(week, { state: look, mini: true })
    + '</g></g>';
}
