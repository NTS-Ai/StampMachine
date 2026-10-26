/* ---------- Stampy, de NTS-robot en mascotte ----------
   Overgenomen uit het ontwerp (frontend/spel, ontwerp/stampy-robot.html).
   Gebruik:
     const bot = new Bot(hostElement, { bubble: true });   // tekent Stampy in het element
     bot.set('happy')            // gezicht: neutral, happy, cheer, sad, think, worried, sleep, alarm, power
     bot.react('ok', 'Goed zo')  // reactie met animatie: ok, no, combo, think, poke, win, risk, alarm, power
     bot.say('Hoi!')             // tekstballon (alleen met bubble: true)
     bot.show('worried')         // gezicht + animatie + een passend zinnetje uit BOT_LINES
     bot.stage(S.streak.count)   // upgrades op basis van je streak in dagen (0 = slaapstand)
     bot.rest()                  // terug naar rust: slapen bij streak 0, anders neutraal
     bot.destroy()               // opruimen als het scherm verdwijnt
   Opties: bubble (tekstballon), aura (vlammen-aura vanaf 7 dagen), interactive (porren met klik,
   ogen volgen de muis), label (toegankelijke naam; null = alleen decoratie).
   Mascot-hoek: <div class="mascot right"></div> als host geeft het ronde glazen hoekje.
   mountBot(host, opts) zet Stampy neer met je huidige streak en wordt wakker zodra je vandaag speelt. */

/** De zeven upgrades binnen 30 dagen streak. */
const STAMPY_STAGES = [
  { days: 0, name: 'Slaapstand' },
  { days: 1, name: 'Wakker' },
  { days: 3, name: 'Antenne gloeit' },
  { days: 7, name: 'Eerste vlam' },
  { days: 14, name: 'Pantser-upgrade' },
  { days: 21, name: 'Super-aura' },
  { days: 30, name: 'Legendarisch' },
];

/** Oude lijst (zonder de slaapstand), voor schermen die hem al gebruiken. */
const UPGRADES = STAMPY_STAGES.slice(1).map(s => s.name);

/**
 * Welke upgrade hoort bij een streak, en hoeveel dagen het nog is tot de volgende.
 * @param {number} days
 * @returns {{ days: number, name: string, index: number, next: { days: number, name: string } | null, left: number }}
 */
function stampyStage(days) {
  const d = Math.max(0, Math.floor(days) || 0);
  let index = 0;
  STAMPY_STAGES.forEach((s, i) => { if (d >= s.days) index = i; });
  const next = STAMPY_STAGES[index + 1] || null;
  return { ...STAMPY_STAGES[index], index, next, left: next ? next.days - d : 0 };
}

/** Zinnetjes per stemming; bot.show(mood) en bot.react() kiezen er een uit. */
const BOT_LINES = {
  neutral: ['Hoi! Zin in een rondje?', 'Klaar voor vandaag?'],
  happy: ['Goed zo, die zit erin.', 'Precies goed.', 'Netjes. Volgende!'],
  cheer: ['Vijf op rij! Ik ga dansen.', 'Combo! Niet te stoppen.'],
  sad: ['Oei, net niet.', 'Die was lastig.'],
  think: ['Even nadenken…', 'Hmm, laat me kijken.'],
  encourage: ['Lees de uitleg even, dan zit hij er zo in.', 'Fout is goed: nu onthoud je hem beter.'],
  worried: ['Je streak staat op het spel. Eén rondje?', 'Nog niet geoefend vandaag… vijf minuutjes?'],
  sleep: ['Zzz… begin een streak om me wakker te maken.'],
  alarm: ['Productie ligt eruit! Pak de pager!'],
  power: ['Hnnngh… bijna…', 'Kracht verzamelen…'],
  poke: ['Hé, dat kietelt! Nog een rondje?', 'Boop! Ik ben er klaar voor.', 'Python? Ik spreek het vloeiend.'],
};

/** De romp van Stampy; het gezicht komt in <g class="face">. */
const BOT_BODY = `<g class="armL arm"><rect class="shell ol" x="38" y="132" width="16" height="42" rx="8"/><circle class="accent ol" cx="46" cy="177" r="8"/></g>
<g class="armR arm"><rect class="shell ol" x="146" y="132" width="16" height="42" rx="8"/><circle class="accent ol" cx="154" cy="177" r="8"/></g>
<rect class="accent ol" x="70" y="190" width="22" height="14" rx="6"/><rect class="accent ol" x="108" y="190" width="22" height="14" rx="6"/>
<rect class="shell ol" x="56" y="122" width="88" height="74" rx="28"/><rect class="plate ol" x="71" y="140" width="58" height="32" rx="10"/>
<text class="nts" x="100" y="162" font-size="17">NTS</text>
<rect class="armor accent ol" x="44" y="120" width="28" height="16" rx="8"/><rect class="armor accent ol" x="128" y="120" width="28" height="16" rx="8"/>
<line class="ol-line" x1="100" y1="40" x2="100" y2="21"/><circle class="bulb ol" cx="100" cy="15" r="8"/>
<rect class="accent ol" x="30" y="66" width="12" height="32" rx="6"/><rect class="accent ol" x="158" y="66" width="12" height="32" rx="6"/>
<rect class="shell ol" x="38" y="38" width="124" height="88" rx="36"/><rect class="screen" x="51" y="51" width="98" height="62" rx="24"/><g class="face"></g>`;

/** Posities van ogen en mond op het scherm van Stampy. */
const BOT_GEO = { lx: 80, rx: 120, ey: 78, my: 98 };

/** Punten van een vijfpuntige ster (sterrenogen bij juichen). */
function botStar(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1));
  }
  return p.join(' ');
}

/** Een twinkelend sterretje (legendarisch, dag 30). */
const botSpark = (x, y, r) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z"/>`;

/** SVG van het gezicht bij een uitdrukking. @param {string} expr */
function botFace(expr) {
  const { lx, rx, ey, my } = BOT_GEO, c = 100;
  const pill = (x, h = 18, dy = 0) => `<rect class="eye blink" x="${x - 6}" y="${ey + dy - h / 2}" width="12" height="${h}" rx="6"/>`;
  const arc = x => `<path class="eye-line" d="M${x - 8} ${ey + 3} Q${x} ${ey - 10} ${x + 8} ${ey + 3}"/>`;
  const lid = x => `<path class="eye-line" d="M${x - 8} ${ey} Q${x} ${ey + 6} ${x + 8} ${ey}"/>`;
  const brow = (x1, y1, x2, y2) => `<path class="eye-line thin" d="M${x1} ${y1} L${x2} ${y2}"/>`;
  const mouth = d => `<path class="mouth-line" d="${d}"/>`;
  const mouthFill = d => `<path class="mouth-fill" d="${d}"/>`;
  switch (expr) {
    case 'happy':
      return arc(lx) + arc(rx) + mouthFill(`M${c - 11} ${my - 3} Q${c} ${my + 13} ${c + 11} ${my - 3} Z`);
    case 'cheer':
      return `<polygon class="eye" points="${botStar(lx, ey, 10)}"/><polygon class="eye" points="${botStar(rx, ey, 10)}"/>`
        + mouthFill(`M${c - 13} ${my - 4} Q${c} ${my + 16} ${c + 13} ${my - 4} Z`);
    case 'sad':
      return pill(lx, 13, 3) + pill(rx, 13, 3) + brow(lx - 8, ey - 9, lx + 7, ey - 14) + brow(rx - 7, ey - 14, rx + 8, ey - 9)
        + mouth(`M${c - 8} ${my + 5} Q${c} ${my - 3} ${c + 8} ${my + 5}`);
    case 'think':
      return pill(lx, 16, -2) + pill(rx, 16, -2) + brow(lx - 8, ey - 14, lx + 7, ey - 12) + mouth(`M${c - 6} ${my + 2} L${c + 8} ${my}`);
    case 'worried':
      return pill(lx, 16, 1) + pill(rx, 16, 1) + brow(lx - 8, ey - 11, lx + 7, ey - 15) + brow(rx - 7, ey - 15, rx + 8, ey - 11)
        + mouth(`M${c - 10} ${my + 2} q5 -4 10 0 t10 0`);
    case 'sleep':
      return lid(lx) + lid(rx) + `<circle class="mouth-line" cx="${c}" cy="${my + 2}" r="3.5"/>`;
    case 'alarm':
      return `<circle class="eye" cx="${lx}" cy="${ey}" r="7"/><circle class="eye" cx="${rx}" cy="${ey}" r="7"/>`
        + brow(lx - 8, ey - 15, lx + 7, ey - 10) + brow(rx - 7, ey - 10, rx + 8, ey - 15)
        + `<rect class="mouth-fill" x="${c - 7}" y="${my - 3}" width="14" height="10" rx="4"/>`;
    case 'power':
      return `<rect class="eye" x="${lx - 7}" y="${ey - 4}" width="14" height="10" rx="5"/><rect class="eye" x="${rx - 7}" y="${ey - 4}" width="14" height="10" rx="5"/>`
        + brow(lx - 9, ey - 14, lx + 7, ey - 8) + brow(rx - 7, ey - 8, rx + 9, ey - 14)
        + `<rect class="mouth-fill" x="${c - 12}" y="${my - 4}" width="24" height="10" rx="3"/>`
        + `<line class="teeth" x1="${c - 12}" y1="${my + 1}" x2="${c + 12}" y2="${my + 1}"/>`
        + `<line class="teeth" x1="${c - 4}" y1="${my - 4}" x2="${c - 4}" y2="${my + 6}"/><line class="teeth" x1="${c + 4}" y1="${my - 4}" x2="${c + 4}" y2="${my + 6}"/>`;
    default:
      return pill(lx) + pill(rx) + mouth(`M${c - 8} ${my} Q${c} ${my + 6} ${c + 8} ${my}`);
  }
}

/**
 * Reacties: [gezicht, animatie, zinnetjes als er geen tekst is meegegeven].
 * ok/no/combo/think/win zeggen alleen iets als je zelf tekst meegeeft (zo was het al).
 * @type {Object<string, [string, string | null, string[] | null]>}
 */
const BOT_REACTIONS = {
  ok: ['happy', 'hop', null], correct: ['happy', 'hop', null],
  no: ['sad', 'droop', null], wrong: ['sad', 'droop', null],
  combo: ['cheer', 'dance', null], win: ['cheer', 'dance', null],
  think: ['think', null, null],
  poke: ['happy', 'hop', BOT_LINES.poke],
  risk: ['worried', null, BOT_LINES.worried],
  alarm: ['alarm', 'shake', BOT_LINES.alarm], boss: ['alarm', 'shake', BOT_LINES.alarm],
  power: ['power', 'shake', BOT_LINES.power],
};

/** Animatie bij een gezicht, voor bot.show(). */
const BOT_EXPR_ANIM = { happy: 'hop', cheer: 'dance', sad: 'droop', alarm: 'shake', power: 'shake' };

/** Alle Stampy's die met de muis meekijken. @type {Bot[]} */
const BOTS = [];
let botUid = 0;

class Bot {
  /**
   * @param {HTMLElement} host
   * @param {{ bubble?: boolean, aura?: boolean, interactive?: boolean, label?: string | null }} [opts]
   */
  constructor(host, { bubble = true, aura = true, interactive = true, label = 'Stampy, de NTS-robot' } = {}) {
    this.id = 'stampy' + (++botUid);
    /** Streak in dagen; null zolang stage() niet is aangeroepen. @type {number | null} */
    this.days = null;
    /** Volgt deze Stampy je echte streak (mountBot)? */
    this.live = false;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spin = calm ? '' : '<animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="4s" repeatCount="indefinite"/>';
    const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
    host.innerHTML = (bubble ? '<div class="bubble" aria-live="polite"></div>' : '')
      + `<div class="host"><svg class="robot${aura ? '' : ' noaura'}" viewBox="0 0 200 230" ${a11y}><defs>
      <linearGradient id="${this.id}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEFB8"/><stop offset=".5" stop-color="#F7C03C"/><stop offset="1" stop-color="#D98E10"/></linearGradient>
      <linearGradient id="${this.id}-holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AF0FF"/><stop offset=".33" stop-color="#B58CFF"/><stop offset=".66" stop-color="#FF8AD8"/><stop offset="1" stop-color="#7AF0FF"/>${spin}</linearGradient>
      <radialGradient id="${this.id}-flame" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="#FFE08A" stop-opacity=".95"/><stop offset=".55" stop-color="#FF9A2E" stop-opacity=".55"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="shadow" cx="100" cy="221" rx="46" ry="6"/>
      <ellipse class="aura" cx="100" cy="118" rx="92" ry="104" fill="url(#${this.id}-flame)"/><g class="bob">${BOT_BODY}</g>
      <g class="zzz"><text x="150" y="44" font-size="13">Z</text><text x="162" y="30" font-size="16">Z</text><text x="176" y="14" font-size="19">Z</text></g>
      <g class="sparkles">${botSpark(26, 40, 8)}${botSpark(176, 58, 6)}${botSpark(20, 168, 6)}${botSpark(182, 176, 8)}</g></svg></div>`;
    if (!host.classList.contains('mascot')) /** @type {HTMLElement} */ (host.querySelector('.host')).style.width = '100%';
    this.svg = /** @type {SVGSVGElement} */ (host.querySelector('svg'));
    this.faceEl = /** @type {SVGGElement} */ (this.svg.querySelector('.face'));
    this.bubble = /** @type {HTMLElement | null} */ (host.querySelector('.bubble'));
    this.svg.style.setProperty('--rim', `url(#${this.id}-holo)`);
    this.set('neutral');
    if (interactive) {
      this.onPoke = () => this.react('poke');
      this.svg.addEventListener('click', this.onPoke);
      BOTS.push(this);
    }
  }

  /** Zet het gezicht. @param {string} expr */
  set(expr) {
    this.expr = expr;
    this.svg.dataset.expr = expr;
    this.faceEl.innerHTML = botFace(expr);
    if (expr === 'sleep') this.faceEl.style.transform = '';
  }

  /** Terug naar rust: slapen bij streak 0, anders neutraal. */
  rest() {
    clearTimeout(this.t);
    this.set(this.days === 0 ? 'sleep' : 'neutral');
  }

  /** Speelt een animatie af: hop, dance, droop of shake. @param {string | null} name */
  anim(name) {
    const c = this.svg.classList;
    ['anim-hop', 'anim-dance', 'anim-droop', 'anim-shake'].forEach(k => c.remove(k));
    if (!name) return;
    void this.svg.getBoundingClientRect();
    c.add('anim-' + name);
    clearTimeout(this.at);
    this.at = setTimeout(() => c.remove('anim-' + name), 2300);
  }

  /** Tekstballon. @param {string} text @param {number} [ms] */
  say(text, ms = 2400) {
    if (!this.bubble) return;
    this.bubble.textContent = text;
    this.bubble.classList.add('on');
    clearTimeout(this.bt);
    this.bt = setTimeout(() => this.bubble && this.bubble.classList.remove('on'), ms);
  }

  /** Gezicht, animatie en een passend zinnetje. @param {string} mood */
  show(mood) {
    clearTimeout(this.t);
    this.set(mood);
    this.anim(BOT_EXPR_ANIM[mood] || null);
    const lines = BOT_LINES[mood];
    if (lines) this.say(randomOf(lines));
  }

  /**
   * Reageert op wat er in het spel gebeurt; daarna gaat Stampy vanzelf terug naar rust (behalve bij think).
   * @param {string} kind  ok, no, combo, think, poke, win, risk, alarm, power (ook correct, wrong, boss)
   * @param {string} [text]
   */
  react(kind, text) {
    clearTimeout(this.t);
    // Speel je vandaag voor het eerst, dan wordt een slapende Stampy wakker.
    if (this.live && kind !== 'poke' && typeof currentStreak === 'function' && currentStreak() !== this.days) this.stage(currentStreak());
    if (kind === 'poke' && this.days === 0) {
      this.anim('hop');
      this.say(text || randomOf(BOT_LINES.sleep));
      return;
    }
    const [expr, animation, lines] = BOT_REACTIONS[kind] || BOT_REACTIONS.ok;
    this.set(kind === 'poke' && Math.random() < .5 ? 'cheer' : expr);
    this.anim(animation);
    if (text) this.say(text);
    else if (lines) this.say(randomOf(lines));
    if (kind !== 'think') this.t = setTimeout(() => this.rest(), kind === 'alarm' || kind === 'boss' ? 3200 : 2200);
  }

  /**
   * Upgrades op basis van je streak in dagen: 0 slaapstand, 1 wakker, 3 antenne, 7 eerste vlam,
   * 14 pantser, 21 super-aura (goud), 30 legendarisch.
   * @param {number} days
   */
  stage(days) {
    const c = this.svg.classList;
    ['s0', 's3', 's7', 's14', 's21', 's30'].forEach(k => c.remove(k));
    const d = Math.max(0, Math.floor(days) || 0);
    if (d === 0) c.add('s0');
    [3, 7, 14, 21, 30].forEach(s => { if (d >= s) c.add('s' + s); });
    const gold = d >= 21;
    this.days = d;
    const st = this.svg.style;
    st.setProperty('--shell', gold ? `url(#${this.id}-gold)` : '#F3F5FB');
    st.setProperty('--accent-r', gold ? '#9A6410' : '#2B47F0');
    st.setProperty('--plate', gold ? '#4A3205' : '#2B47F0');
    st.setProperty('--nts', gold ? '#FFE7A3' : '#FFFFFF');
    // Alleen vanuit rust wisselen tussen slapen en wakker; een lopende reactie maakt hij af.
    if (this.expr === 'neutral' || this.expr === 'sleep') this.set(d === 0 ? 'sleep' : 'neutral');
  }

  /** Haalt deze Stampy weg (bijvoorbeeld als een scherm opnieuw wordt getekend). */
  destroy() {
    clearTimeout(this.t);
    clearTimeout(this.at);
    clearTimeout(this.bt);
    if (this.onPoke) this.svg.removeEventListener('click', this.onPoke);
    const i = BOTS.indexOf(this);
    if (i >= 0) BOTS.splice(i, 1);
  }
}

/* De ogen volgen de muis (niet als Stampy slaapt). Stampy's die niet meer op de pagina staan, vallen af. */
let botRaf = 0, botPx = 0, botPy = 0;
addEventListener('pointermove', e => {
  botPx = e.clientX;
  botPy = e.clientY;
  if (botRaf) return;
  botRaf = requestAnimationFrame(() => {
    botRaf = 0;
    for (let i = BOTS.length - 1; i >= 0; i--) {
      const b = BOTS[i];
      if (!b.svg.isConnected) { BOTS.splice(i, 1); continue; }
      if (b.expr === 'sleep') continue;
      const r = b.svg.getBoundingClientRect();
      if (!r.width) continue;
      const dx = Math.max(-5, Math.min(5, (botPx - r.left - r.width / 2) / r.width * 9));
      const dy = Math.max(-4, Math.min(4, (botPy - r.top - r.height * .35) / r.height * 8));
      b.faceEl.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    }
  });
}, { passive: true });

/**
 * Stampy op een scherm zetten, met upgrades volgens je huidige streak (slaapt bij 0 dagen).
 * @param {HTMLElement} host
 * @param {{ bubble?: boolean, aura?: boolean, interactive?: boolean, label?: string | null }} [opts]
 */
function mountBot(host, opts) {
  const bot = new Bot(host, opts);
  bot.live = true;
  bot.stage(typeof currentStreak === 'function' ? currentStreak() : 0);
  return bot;
}
