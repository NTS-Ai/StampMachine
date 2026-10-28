/* ---------- Home ----------
   Je stand, Stampy, verder spelen, snel oefenen en alle werelden. Alles komt uit de echte
   voortgang (state.js en progress.js). Elke wereld kun je bekijken, ook als hij nog op slot zit;
   spelen kan pas als de draak van de wereld ervoor verslagen is (dat regelt de kaart). */

/** Stampy's op de home; ze worden opgeruimd als de home opnieuw getekend wordt. @type {Bot[]} */
let homeBots = [];
/** True zodra je de melding over gewiste voortgang hebt weggeklikt. */
let homeClearedSeen = false;

/** Iconen van de home (inline SVG, geen emoji). */
const HOME_ICONS = {
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#FFB020"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFC93D"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#7B5CFF"/><path d="M8 12l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#FFC93D" stroke="#C98512" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#FF9A2E"/><path d="M12 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.4" fill="#fff"/></svg>',
  // Snel oefenen
  quiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9V14" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="12" cy="18" r="1.5" fill="#fff"/></svg>',
  cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M4 20v-4.5h4.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 13.5V9.5M10 2.5h4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>',
  boss: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9.5v4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.3" fill="#fff"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="12" r="3.5" fill="#fff"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8l4 4-4 4M12 17h6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/** Een wolkje dat langzaam door de wereldkaart drijft. */
const HOME_CLOUD = '<svg viewBox="0 0 64 28"><path d="M10 26a9 9 0 0 1 1-18 13 13 0 0 1 24-3 10 10 0 0 1 17 6 8 8 0 0 1 2 15z" fill="#fff"/></svg>';

/** Code die rond Stampy zweeft, per wereld. De eerste drie staan er meteen; tikken haalt de rest tevoorschijn. */
const HOME_FLOATS = {
  1: ['int', 'print()', '"str"', 'input()', 'True', 'len()', 'git'],
  2: ['def', 'class', 'try:', 'import', 'return', 'with open()'],
  3: ['SELECT', 'JOIN', 'WHERE', 'docker', 'COUNT(*)', 'Session'],
  4: ['@app.get', '200', 'json', 'POST', 'redis', '404'],
  5: ['prompt', 'tokens', 'role', 'system', 'temp', 'embed'],
  6: ['pytest', 'async', 'await', 'assert', 'logging', 'agent'],
};

/** Naam van de draak van een wereld, als de draken al bestaan. @param {number} week */
function homeDragonName(week) {
  const list = typeof DRAGONS !== 'undefined' ? DRAGONS : null;
  return (list && list[week - 1] && list[week - 1].name) || 'de draak';
}

/** Speel verder: het volgende level, anders de draak, anders de kaart. */
function continuePlaying() {
  const step = nextStep();
  if (step.type === 'level' && typeof startLevel === 'function') startLevel(step.level.id);
  else if (step.type === 'dragon' && typeof startBoss === 'function') startBoss(step.week);
  else navigate('#/kaart/' + currentWorld());
}

/** Wat Stampy zegt als je op de home komt, afhankelijk van je streak. @returns {{ mood: string, text: string }} */
function homeGreeting() {
  const streak = currentStreak();
  const today = S.streak.day === dayKey();
  const up = stampyStage(streak);
  if (!streak) {
    return S.streak.count
      ? { mood: 'sleep', text: 'Zzz… Je streak is gestopt. Eén level en ik ben weer wakker.' }
      : { mood: 'sleep', text: 'Zzz… Speel een level om me wakker te maken.' };
  }
  if (!today) return { mood: 'worried', text: `Je streak van ${streak} ${streak === 1 ? 'dag' : 'dagen'} staat op het spel. Eén rondje?` };
  if (up.next && up.left <= 2) return { mood: 'happy', text: `Nog ${up.left} ${up.left === 1 ? 'dag' : 'dagen'} tot ${up.next.name}!` };
  return { mood: 'happy', text: streak === 1 ? 'Dag 1 van je streak. Kom je morgen weer?' : `Al ${streak} dagen op rij. Lekker bezig!` };
}

/** Toont de home. */
function openHome() {
  homeBots.forEach(b => b.destroy());
  const el = $('#home');
  const cleared = progressWasCleared && !homeClearedSeen;
  el.innerHTML = `
    <header class="hello">
      <div class="grow">
        <h1>Hoi, stagiair</h1>
        <p id="hmLevel"></p>
        <div class="xpbar" id="hmXpBar" role="progressbar" aria-label="XP tot het volgende speler-level" aria-valuemin="0" aria-valuemax="100"><i id="hmXp"></i></div>
      </div>
      <div class="mascot right" id="hmBot"></div>
    </header>
    ${cleared ? `<div class="hm-notice glass" id="hmNotice" role="status">${HOME_ICONS.info}
      <p><b>Je voortgang is gewist.</b> Je had meer dan 30 dagen niet gespeeld, dus je begint opnieuw. Stampy helpt je weer op weg.</p>
      <button class="hm-x" type="button" id="hmNoticeClose" aria-label="Melding sluiten">${HOME_ICONS.close}</button></div>` : ''}
    <div class="tiles3" id="hmTiles"></div>
    <section class="course hm-course" id="hmCourse" aria-labelledby="hmCourseTitle">
      <div class="hm-course-text">
        <h2 id="hmCourseTitle"></h2>
        <div class="pctpill"><span id="hmPct"></span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/><circle id="hmRing" cx="10" cy="10" r="7.5" fill="none" stroke="#3AD0FF" stroke-width="3" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 10 10)"/></svg></div>
        <p class="hm-next" id="hmNext"></p>
        <button class="hm-play" type="button" id="hmPlay"><span id="hmPlayLabel">Verder spelen</span>${HOME_ICONS.arrow}</button>
      </div>
      <div class="hm-sky" aria-hidden="true">${HOME_CLOUD}${HOME_CLOUD}</div>
      <div class="hm-floats" id="hmFloats"></div>
      <div class="bot" id="hmCourseBot"></div>
    </section>
    <label class="hm-search">
      ${HOME_ICONS.search}
      <span class="sr-only">Zoeken</span>
      <input type="search" data-search-field autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="Zoek begrip of commando">
      <span class="keycap kbd" aria-hidden="true">/</span>
    </label>
    <section class="hm-sec" aria-labelledby="hmQuickTitle">
      <div class="sechead"><h2 class="sec-t" id="hmQuickTitle">Snel oefenen</h2><span id="hmQuickWeek"></span></div>
      <div class="quick" id="hmQuick"></div>
    </section>
    <section class="hm-sec" aria-labelledby="hmWorldsTitle">
      <div class="sechead"><h2 class="sec-t" id="hmWorldsTitle">Werelden</h2><span id="hmWorldsSum"></span></div>
      <div class="wlist" id="hmWorlds"></div>
    </section>`;

  const bot = mountBot($('#hmBot'));
  const courseBot = mountBot($('#hmCourseBot'), { bubble: false, label: null });
  homeBots = [bot, courseBot];

  const close = document.getElementById('hmNoticeClose');
  if (close) close.addEventListener('click', () => {
    homeClearedSeen = true;
    const notice = document.getElementById('hmNotice');
    if (notice) notice.remove();
    /** @type {HTMLElement} */ ($('#hmPlay')).focus();
  });
  $('#hmPlay').addEventListener('click', continuePlaying);
  $('#hmQuick').addEventListener('click', e => {
    const card = /** @type {HTMLElement} */ (e.target).closest('[data-quick]');
    if (card) startQuick(/** @type {HTMLElement} */ (card).dataset.quick || '');
  });

  paintHome();
  showScreen('home');

  const hello = homeGreeting();
  if (hello.mood !== 'sleep') bot.set(hello.mood);
  setTimeout(() => { if (!$('#home').hidden && homeBots[0] === bot) bot.say(hello.text, 4200); }, 600);
}

/** Start een snelle oefening voor je huidige week. @param {string} kind */
function startQuick(kind) {
  const week = currentWorld();
  if (kind === 'play') navigate('#/speeltuin');
  else if (kind === 'quiz') startGame('quiz', week);
  else if (kind === 'speed') startGame('speed', week);
  else if (kind === 'cards') startCards(week);
  else if (kind === 'boss') startGame('boss', 0);
  else if (kind === 'retry') startGame('retry', 0, shuffle(weakItems()).slice(0, 20));
}

/** Vult alles op de home dat van je voortgang afhangt (ook na een spel, via HUD_HOOKS). */
function paintHome() {
  if (!document.getElementById('hmTiles')) return;

  const lvl = levelInfo();
  const totals = mapTotals();
  const pctXp = Math.round(lvl.progress * 100);
  $('#hmLevel').textContent = `Speler-level ${lvl.number} · ${lvl.title} · ${nl(S.xp)} XP`;
  setBar($('#hmXp'), lvl.progress);
  const bar = $('#hmXpBar');
  bar.setAttribute('aria-valuenow', String(pctXp));
  bar.setAttribute('aria-valuetext', `${pctXp}% van speler-level ${lvl.number} naar ${lvl.number + 1}`);

  $('#hmTiles').innerHTML = `
    <div class="st">${HOME_ICONS.bolt}<small>Speler-level</small><b>${lvl.number}</b></div>
    <div class="st">${HOME_ICONS.star}<small>Sterren</small><b>${nl(totals.stars)}</b></div>
    <div class="st">${HOME_ICONS.check}<small>Levels</small><b>${totals.done}/${totals.levels}</b></div>`;

  // Je huidige wereld
  const week = currentWorld();
  const w = weekOf(week);
  const p = worldProgress(week);
  const step = nextStep();
  const pct = Math.round((p.done + (p.dragon ? 1 : 0)) / (p.levels + 1) * 100);
  const course = $('#hmCourse');
  course.style.setProperty('--wc', hue(week));
  const floats = $('#hmFloats');
  if (floats.dataset.week !== String(week)) {
    floats.dataset.week = String(week);
    mountFloats(floats, HOME_FLOATS[week] || HOME_FLOATS[1]);
  }
  $('#hmCourseTitle').textContent = `Wereld ${week} · ${w ? w.title : ''}`;
  $('#hmPct').textContent = pct + '%';
  $('#hmRing').setAttribute('stroke-dashoffset', String(100 - pct));
  let next = '';
  if (step.type === 'level') next = `Volgende: level ${step.level.index + 1}, ${step.level.title}`;
  else if (step.type === 'dragon') next = `Alle levels gehaald. ${homeCap(homeDragonName(step.week))} wacht op je.`;
  else next = 'Alle werelden gehaald en alle draken verslagen. Knap werk!';
  $('#hmNext').textContent = next;
  $('#hmPlayLabel').textContent = step.type === 'done' ? 'Bekijk de kaart' : step.type === 'dragon' ? 'Versla de draak' : 'Verder spelen';

  // Snel oefenen voor je huidige week
  const weak = weakItems().length;
  const flash = w ? w.flashcards.length : 0;
  const quick = [
    { kind: 'quiz', title: 'Quiz', sub: `12 vragen uit week ${week}`, icon: HOME_ICONS.quiz },
    { kind: 'cards', title: 'Flashcards', sub: `${flash} kaarten om te stampen`, icon: HOME_ICONS.cards },
    { kind: 'speed', title: 'Speedrun', sub: 'Zoveel mogelijk in 60 s', icon: HOME_ICONS.speed },
    { kind: 'boss', title: 'Eindbaas', sub: 'Pager om 03:00, alle weken', icon: HOME_ICONS.boss },
    { kind: 'play', title: 'Speeltuin', sub: 'Zelf Python uitproberen', icon: HOME_ICONS.play },
  ];
  if (weak) quick.splice(1, 0, { kind: 'retry', title: 'Zwakke plekken', sub: `${weak} ${weak === 1 ? 'vraag' : 'vragen'} die je fout had`, icon: HOME_ICONS.retry });
  $('#hmQuickWeek').textContent = `Week ${week} · telt niet voor de kaart`;
  $('#hmQuick').innerHTML = quick.map(q => `<button class="qcard" type="button" data-quick="${q.kind}">
      <span class="qi">${q.icon}</span><b>${q.title}</b><small>${esc(q.sub)}</small></button>`).join('');

  // Alle werelden: bekijken mag altijd, spelen pas als de vorige draak verslagen is.
  $('#hmWorldsSum').textContent = `${totals.dragons} van ${WEEKS.length} draken verslagen`;
  const playing = step.type !== 'done';
  $('#hmWorlds').innerHTML = WEEKS.map(wk => homeWorldRow(wk, playing && wk.week === week)).join('');
}

/** Eén wereld in de lijst. @param {Week} wk @param {boolean} here  Is dit de wereld waar je nu speelt? */
function homeWorldRow(wk, here) {
  const p = worldProgress(wk.week);
  const open = worldOpen(wk.week);
  let status;
  let badge;
  if (!open) {
    status = `Na de draak van wereld ${wk.week - 1}`;
    badge = `<span class="hm-wbadge locked">${HOME_ICONS.lock}<span class="sr-only">Op slot</span></span>`;
  } else if (p.dragon) {
    status = `${p.done} van ${p.levels} levels · ${p.stars} van ${p.maxStars} sterren · ${homeCap(homeDragonName(wk.week))} verslagen`;
    badge = `<span class="hm-wbadge done">${HOME_ICONS.crown}<span class="sr-only">Uitgespeeld</span></span>`;
  } else {
    status = `${p.done} van ${p.levels} levels · ${p.stars} van ${p.maxStars} sterren`
      + (p.done === p.levels ? ` · ${homeCap(homeDragonName(wk.week))} wacht` : '');
    badge = `<span class="hm-wbar" aria-hidden="true"><i style="width:${Math.round(p.done / p.levels * 100)}%"></i></span>`;
  }
  return `<a class="world" href="#/kaart/${wk.week}" style="--wc:${hue(wk.week)}" data-locked="${!open}"${here ? ' aria-current="location"' : ''}>
      <span class="num" aria-hidden="true">${wk.week}</span>
      <div class="grow"><h3>Wereld ${wk.week} · ${esc(wk.title)}</h3><p>${here ? '<b class="hm-here">Hier ben je</b> · ' : ''}${esc(status)}</p></div>
      ${badge}</a>`;
}

/** Eerste letter als hoofdletter ('de draak' → 'De draak'). @param {string} s */
const homeCap = s => s.charAt(0).toUpperCase() + s.slice(1);

HUD_HOOKS.push(() => {
  const home = document.getElementById('home');
  if (home && !home.hidden) paintHome();
});
