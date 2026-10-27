/* ---------- Profiel: Stampy laadt op, je stand en instellingen ----------
   Uit het robot-ontwerp (ontwerp/stampy-robot.html), maar met je echte streak: de ring loopt vol
   tot 30 dagen, met een tikje per dag en een stip bij elke upgrade. Vanaf 7 dagen brandt er een
   vuur-aura achter Stampy (canvas); die pauzeert als hij niet in beeld is en staat uit bij
   'minder beweging'. Daaronder je stand en de instellingen (thema, geluid, voortgang wissen). */

/** Stampy's op het profiel. @type {Bot[]} */
let profileBots = [];
/** @type {PowerFire | null} */
let profileFire = null;

/** Lengte van de ring in dagen. */
const PF_RING_DAYS = 30;

/** Toont het profiel. */
function openProfile() {
  profileBots.forEach(b => b.destroy());
  if (profileFire) profileFire.stop();
  profileFire = null;

  const streak = currentStreak();
  const up = stampyStage(streak);
  const el = $('#profiel');
  el.innerHTML = `
    <header class="pf-head">
      <h1>Profiel</h1>
      <p>Je streak, je stand en je instellingen.</p>
    </header>

    <section class="pf-power glass" aria-labelledby="pfPowerTitle">
      <div class="pf-stage" id="pfStage">
        <canvas class="pf-fire" id="pfFire" aria-hidden="true"></canvas>
        <svg class="pf-ring" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="pfRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF6A1A"/><stop offset=".55" stop-color="#FFB020"/><stop offset="1" stop-color="#FFE27A"/></linearGradient>
            <mask id="pfFillMask"><circle id="pfMaskArc" cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-width="9" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 50 50)"/></mask>
          </defs>
          <g>${pfRingTicks(streak)}</g>
          <circle class="track" cx="50" cy="50" r="43"/>
          <circle class="fill" id="pfRingFill" cx="50" cy="50" r="43" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 50 50)"/>
          <circle class="flow" cx="50" cy="50" r="43" pathLength="100" transform="rotate(-90 50 50)" mask="url(#pfFillMask)"/>
          <g>${pfRingMilestones(streak)}</g>
          <circle class="head" id="pfRingHead" cx="50" cy="7" r="2.4"/>
        </svg>
        <div class="pf-bot" id="pfBot"></div>
        <span class="pf-pct">${Math.min(streak, PF_RING_DAYS)} / ${PF_RING_DAYS} dagen</span>
      </div>
      <div class="pf-read">
        <p class="pf-eyebrow" id="pfPowerTitle">Stampy laadt op</p>
        <div class="pf-streak"><b>${streak}</b><span>${streak === 1 ? 'dag' : 'dagen'} op rij</span></div>
        <div class="pf-stage-name">${esc(up.name)}</div>
        <p class="pf-next">${up.next ? `Nog ${up.left} ${up.left === 1 ? 'dag' : 'dagen'} tot ${esc(up.next.name)}` : 'Volle kracht. Houd je streak vast.'}</p>
        <p class="pf-tip">${esc(pfStreakTip(streak))}</p>
        ${S.streak.day === dayKey() ? '' : `<button class="hm-go pf-cta" type="button" id="pfPlay">${streak ? 'Speel vandaag een level' : 'Maak Stampy wakker'}</button>`}
      </div>
    </section>

    <section aria-labelledby="pfLadderTitle">
      <h2 class="sec-t" id="pfLadderTitle">Alle upgrades</h2>
      <ol class="pf-ladder">${STAMPY_STAGES.map((s, i) => pfLadderRung(s, i, streak, up.index)).join('')}</ol>
    </section>

    <section aria-labelledby="pfStandTitle">
      <h2 class="sec-t" id="pfStandTitle">Je stand</h2>
      <div class="pf-stand" id="pfStand"></div>
    </section>

    <section class="pf-settings glass" aria-labelledby="pfSetTitle">
      <h2 class="sec-t" id="pfSetTitle">Instellingen</h2>
      <fieldset class="pf-row pf-theme">
        <legend>Thema</legend>
        <div class="pf-seg">
          ${[['system', 'Systeem'], ['light', 'Dag'], ['dark', 'Nacht']].map(([v, l]) =>
            `<label><input type="radio" name="pfTheme" value="${v}"${getThemePref() === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="pf-row">
        <div><b id="pfSoundLbl">Geluid</b><p>Piepjes bij goede en foute antwoorden.</p></div>
        <button class="pf-switch" type="button" role="switch" id="pfSound" aria-labelledby="pfSoundLbl"><span class="knob" aria-hidden="true"></span><span class="state"></span></button>
      </div>
      <div class="pf-row">
        <div><b>Voortgang wissen</b><p>Begin opnieuw: XP, sterren, levels, draken en je streak gaan weg.</p></div>
        <button class="btn danger" type="button" id="pfReset">Wis mijn voortgang</button>
      </div>
      <p class="pf-privacy">Je voortgang staat alleen in deze browser, niet op een server. Speel je 30 dagen niet, dan wordt hij vanzelf gewist.</p>
    </section>`;

  // Stampy groot in het midden, met zijn upgrade; de vuur-aura doet het canvas.
  const big = mountBot($('#pfBot'), { aura: false });
  profileBots = [big];
  el.querySelectorAll('.pf-rung-bot').forEach(host => {
    const b = new Bot(/** @type {HTMLElement} */ (host), { bubble: false, interactive: false, label: null });
    b.stage(Number(/** @type {HTMLElement} */ (host).dataset.days));
    profileBots.push(b);
  });

  el.querySelectorAll('input[name="pfTheme"]').forEach(input => {
    input.addEventListener('change', () => {
      const value = /** @type {HTMLInputElement} */ (input).value;
      setThemePref(/** @type {ThemePref} */ (value));
      big.react('poke', value === 'dark' ? 'Nachtmodus. Lekker rustig.' : value === 'light' ? 'Goedemorgen! Dagmodus aan.' : 'Ik volg je systeem.');
    });
  });
  $('#pfSound').addEventListener('click', () => {
    const on = toggleSound();
    big.react(on ? 'ok' : 'think', on ? 'Geluid aan.' : 'Geluid uit. Ik ben stil.');
    if (!on) setTimeout(() => big.rest(), 1800);
  });
  $('#pfReset').addEventListener('click', resetFromProfile);
  const play = document.getElementById('pfPlay');
  if (play) play.addEventListener('click', continuePlaying);

  paintProfile();
  showScreen('profiel');

  // De ring loopt vanaf 0 vol (zonder animatie bij 'minder beweging', dat regelt de css).
  const frac = Math.min(streak, PF_RING_DAYS) / PF_RING_DAYS;
  requestAnimationFrame(() => requestAnimationFrame(() => pfSetRing(frac)));

  if (window.HTMLCanvasElement && 'IntersectionObserver' in window) {
    profileFire = new PowerFire(/** @type {HTMLCanvasElement} */ ($('#pfFire')), $('#pfStage'), big.svg);
    profileFire.setDays(streak);
  }
  // Is er vandaag een upgrade bijgekomen, dan viert Stampy dat.
  const newToday = S.streak.day === dayKey() && streak === up.days && streak > 0;
  setTimeout(() => {
    if ($('#profiel').hidden || profileBots[0] !== big) return;
    if (newToday) {
      big.react('win', `${up.name} ontgrendeld!`);
      if (profileFire) profileFire.burst(.8);
    } else if (!streak) big.say(randomOf(BOT_LINES.sleep), 4200);
    else if (S.streak.day !== dayKey()) big.react('risk');
    else big.say(up.next ? `Nog ${up.left} ${up.left === 1 ? 'dag' : 'dagen'} tot ${up.next.name}.` : 'Volle kracht!', 3600);
  }, 700);
}

/** Korte uitleg onder je streak. @param {number} streak */
function pfStreakTip(streak) {
  if (!streak) return 'Speel vandaag een level of een quiz: dan wordt Stampy wakker en begint je streak.';
  if (S.streak.day !== dayKey()) return 'Je hebt vandaag nog niet gespeeld. Eén rondje houdt je streak in leven.';
  return 'Vandaag gespeeld. Kom morgen terug, dan loopt de ring verder vol.';
}

/** Dertig tikjes rond de ring: één per dag, aan als je die dag al gehaald hebt. @param {number} streak */
function pfRingTicks(streak) {
  let h = '';
  for (let d = 1; d <= PF_RING_DAYS; d++) {
    const a = d / PF_RING_DAYS * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    h += `<line class="tick${d <= streak ? ' on' : ''}" x1="${(50 + c * 47.4).toFixed(2)}" y1="${(50 + s * 47.4).toFixed(2)}" x2="${(50 + c * 49.6).toFixed(2)}" y2="${(50 + s * 49.6).toFixed(2)}"/>`;
  }
  return h;
}

/** Een stip op de ring bij elke upgrade (3, 7, 14, 21 en 30 dagen). @param {number} streak */
function pfRingMilestones(streak) {
  return STAMPY_STAGES.filter(s => s.days >= 3).map(s => {
    const a = s.days / PF_RING_DAYS * Math.PI * 2 - Math.PI / 2;
    return `<circle class="mile${streak >= s.days ? ' on' : ''}" cx="${(50 + Math.cos(a) * 43).toFixed(2)}" cy="${(50 + Math.sin(a) * 43).toFixed(2)}" r="1.9"/>`;
  }).join('');
}

/** Zet de ring op een fractie (0-1). @param {number} frac */
function pfSetRing(frac) {
  const fill = document.getElementById('pfRingFill');
  const mask = document.getElementById('pfMaskArc');
  const head = document.getElementById('pfRingHead');
  if (!fill || !mask || !head) return;
  const off = (100 - frac * 100).toFixed(1);
  fill.setAttribute('stroke-dashoffset', off);
  mask.setAttribute('stroke-dashoffset', off);
  const a = frac * Math.PI * 2 - Math.PI / 2;
  head.setAttribute('cx', (50 + Math.cos(a) * 43).toFixed(2));
  head.setAttribute('cy', (50 + Math.sin(a) * 43).toFixed(2));
  head.style.opacity = frac > 0 ? '1' : '0';
}

/**
 * Eén trede van de ladder met upgrades.
 * @param {{ days: number, name: string }} s @param {number} i @param {number} streak @param {number} current
 */
function pfLadderRung(s, i, streak, current) {
  const state = i === current ? 'current' : i < current ? 'done' : 'todo';
  const left = s.days - streak;
  const status = state === 'current' ? 'Nu' : state === 'done' ? 'Behaald' : `Nog ${left} ${left === 1 ? 'dag' : 'dagen'}`;
  return `<li class="pf-rung" data-state="${state}"${state === 'current' ? ' aria-current="step"' : ''}>
      <div class="pf-rung-bot" data-days="${s.days}"></div>
      <b>${s.days} ${s.days === 1 ? 'dag' : 'dagen'}</b><span>${esc(s.name)}</span>
      <small>${status}</small></li>`;
}

/** Vult je stand en de stand van de geluidsknop (ook na een spel, via HUD_HOOKS). */
function paintProfile() {
  const stand = document.getElementById('pfStand');
  if (!stand) return;
  const lvl = levelInfo();
  const t = mapTotals();
  const pctXp = Math.round(lvl.progress * 100);
  stand.innerHTML = `
    <div class="pf-tiles">
      <div class="pf-tile wide"><small>Speler-level</small><b>${lvl.number} <span>${esc(lvl.title)}</span></b>
        <div class="xpbar" role="progressbar" aria-label="XP tot speler-level ${lvl.number + 1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pctXp}"><i style="width:${pctXp}%"></i></div>
        <small>${nl(S.xp)} XP · nog ${nl(XP_PER_LEVEL - (S.xp % XP_PER_LEVEL))} tot level ${lvl.number + 1}</small></div>
      <div class="pf-tile"><small>Sterren</small><b>${nl(t.stars)}<span> / ${t.levels * 3}</span></b></div>
      <div class="pf-tile"><small>Levels</small><b>${t.done}<span> / ${t.levels}</span></b></div>
      <div class="pf-tile"><small>Draken</small><b>${t.dragons}<span> / ${WEEKS.length}</span></b></div>
    </div>
    <h3 class="pf-sub">Beheersing per week</h3>
    <ul class="pf-mastery">${WEEKS.map(w => {
      const pct = Math.round(mastery([...w.questions, ...w.typing]) * 100);
      return `<li style="--wc:${hue(w.week)}"><span class="pf-mlabel"><b>Week ${w.week}</b> ${esc(w.title)}</span>
        <span class="pf-mbar" aria-hidden="true"><i style="width:${pct}%"></i></span><span class="pf-mpct">${pct}%</span></li>`;
    }).join('')}</ul>
    <p class="pf-note">Beheersing groeit als je vragen vaker goed hebt: na drie keer goed zit een vraag erin.</p>`;

  const sound = document.getElementById('pfSound');
  if (sound) {
    sound.setAttribute('aria-checked', String(!!S.sound));
    /** @type {HTMLElement} */ (sound.querySelector('.state')).textContent = S.sound ? 'Aan' : 'Uit';
  }
}

/** Vraagt of je het zeker weet en wist dan alles. */
async function resetFromProfile() {
  const ok = await confirmDialog({
    title: 'Voortgang wissen?',
    text: 'Al je XP, sterren, levels, verslagen draken en je streak verdwijnen uit deze browser. Dit kun je niet ongedaan maken.',
    ok: 'Ja, wis alles',
    cancel: 'Annuleren',
    danger: true,
  });
  if (!ok) return;
  resetProgress();
  renderHud();
  toast('Je voortgang is gewist. Je begint opnieuw.');
  navigate('#/');
}

HUD_HOOKS.push(() => {
  const el = document.getElementById('profiel');
  if (el && !el.hidden) paintProfile();
});

/* ---------- vuur-aura achter Stampy (canvas-deeltjes uit het robot-ontwerp) ---------- */

/** Hoe fel het vuur brandt per upgrade (in dagen). */
const PF_FIRE_BASE = { 0: 0, 1: 0, 3: 0, 7: .35, 14: .6, 21: .92, 30: 1.2 };

class PowerFire {
  /** @param {HTMLCanvasElement} canvas @param {HTMLElement} stageEl @param {SVGSVGElement} botSvg */
  constructor(canvas, stageEl, botSvg) {
    this.cv = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.botSvg = botSvg;
    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stage = 0;
    this.parts = /** @type {any[]} */ ([]);
    this.bolts = /** @type {any[]} */ ([]);
    this.visible = false;
    this.running = false;
    this.raf = 0;
    this.acc = 0; this.boltT = 0; this.last = 0;
    this.W = 0; this.H = 0; this.k = 1;
    this.body = { x: 0, y: 0, rx: 0, ry: 0 };
    this.spr = { orange: PowerFire.sprite(255, 120, 30), gold: PowerFire.sprite(255, 200, 60), blue: PowerFire.sprite(110, 200, 255) };

    this.resize = new ResizeObserver(() => { this.measure(); if (this.calm) this.staticGlow(); });
    this.resize.observe(stageEl);
    // Alleen branden als het profiel in beeld is en het tabblad zichtbaar is.
    this.seen = new IntersectionObserver(es => { this.visible = es[0].isIntersecting && !document.hidden; this.ensure(); });
    this.seen.observe(stageEl);
    this.onVis = () => { this.visible = !document.hidden && !!stageEl.offsetParent; this.ensure(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.measure();
  }

  /** Een zacht rond lichtje als sprite. */
  static sprite(r, g, b) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(.25, `rgba(${r},${g},${b},.9)`);
    gr.addColorStop(.6, `rgba(${r},${g},${b},.35)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return c;
  }

  measure() {
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height;
    this.cv.width = r.width * dpr; this.cv.height = r.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const h = this.botSvg.getBoundingClientRect();
    const k = this.k = h.width / 200;
    this.body = { x: h.left - r.left + 100 * k, y: h.top - r.top + 128 * k, rx: 66 * k, ry: 92 * k };
  }

  intensity() { return PF_FIRE_BASE[this.stage] || 0; }

  /** @param {number} days */
  setDays(days) {
    this.stage = stampyStage(days).days;
    if (this.calm) this.staticGlow(); else this.ensure();
  }

  /** Een uitbarsting van vonken, bijvoorbeeld bij een nieuwe upgrade. @param {number} power */
  burst(power) {
    if (this.calm) return;
    const { body, k } = this;
    for (let i = 0; i < Math.round(140 * power); i++) {
      const a = Math.random() * Math.PI * 2, sp = (160 + Math.random() * 260) * k * power;
      this.parts.push({ x: body.x, y: body.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40 * k, age: 0, life: .5 + Math.random() * .35, size: (8 + Math.random() * 10) * k, spr: Math.random() < .3 ? this.spr.blue : this.spr.gold, burst: true });
    }
    this.ensure();
  }

  /** @param {number} n */
  emit(n) {
    const I = this.intensity(), { body, k } = this, gold = this.stage >= 21;
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ex = Math.cos(th), ey = Math.sin(th);
      const blue = this.stage >= 30 && Math.random() < .18;
      this.parts.push({
        x: body.x + ex * body.rx * (.85 + Math.random() * .2), y: body.y + ey * body.ry * (.8 + Math.random() * .25) + 12 * k,
        vx: ex * 14 * k + (Math.random() - .5) * 16 * k, vy: -(70 + Math.random() * 90) * k * (.8 + I * .45),
        age: 0, life: .45 + Math.random() * .6 * (.7 + I * .4), size: (10 + Math.random() * 14) * k * (.75 + I * .5),
        spr: blue ? this.spr.blue : gold ? this.spr.gold : this.spr.orange,
      });
    }
  }

  /** Bliksempjes rond Stampy op dag 30. */
  bolt() {
    const { body, k } = this;
    const th = -Math.PI * (.15 + Math.random() * .7);
    let x = body.x + Math.cos(th) * body.rx * .9, y = body.y + Math.sin(th) * body.ry * .9;
    const dir = Math.atan2(y - body.y, x - body.x), pts = [[x, y]];
    for (let i = 0; i < 6; i++) {
      x += Math.cos(dir + (Math.random() - .5) * 1.6) * 12 * k;
      y += Math.sin(dir + (Math.random() - .5) * 1.6) * 12 * k - 4 * k;
      pts.push([x, y]);
    }
    this.bolts.push({ pts, t: .12 });
  }

  ensure() {
    if (this.calm || this.running || !this.visible) return;
    if (!this.intensity() && !this.parts.length) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  /** @param {number} t */
  frame(t) {
    const dt = Math.min(.05, (t - (this.last || t)) / 1000);
    this.last = t;
    if (!this.visible) { this.running = false; return; }
    const { ctx, body, k, W, H } = this, I = this.intensity();
    this.acc += dt * 260 * I;
    const n = Math.floor(this.acc);
    this.acc -= n;
    if (n > 0) this.emit(Math.min(n, 14));
    if (this.stage >= 30) { this.boltT -= dt; if (this.boltT <= 0) { this.bolt(); this.boltT = .18 + Math.random() * .35; } }
    ctx.clearRect(0, 0, W, H);
    if (I > 0) {
      const g = ctx.createRadialGradient(body.x, body.y, body.rx * .4, body.x, body.y, body.ry * 1.9);
      const col = this.stage >= 21 ? '255,200,70' : '255,130,40';
      g.addColorStop(0, `rgba(${col},${Math.min(.45, .18 * I)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) { this.parts.splice(i, 1); continue; }
      if (!p.burst) { p.vy -= 55 * k * dt; p.vx += (body.x - p.x) * 1.6 * dt; } else { p.vx *= .96; p.vy *= .96; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const r = p.age / p.life, sz = p.size * (1 - r * .65);
      ctx.globalAlpha = (1 - r) * (p.burst ? 1 : .85);
      ctx.drawImage(p.spr, p.x - sz, p.y - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t -= dt;
      if (b.t <= 0) { this.bolts.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(190,235,255,.95)'; ctx.lineWidth = 2.2 * k; ctx.shadowColor = '#7FD8FF'; ctx.shadowBlur = 12;
      ctx.beginPath();
      b.pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
    if (this.parts.length || this.bolts.length || I > 0) this.raf = requestAnimationFrame(tt => this.frame(tt));
    else { this.running = false; ctx.clearRect(0, 0, W, H); }
  }

  /** Bij 'minder beweging': alleen een stille gloed, geen vlammen. */
  staticGlow() {
    const { ctx, body, W, H } = this, I = this.intensity();
    ctx.clearRect(0, 0, W, H);
    if (I <= 0) return;
    const g = ctx.createRadialGradient(body.x, body.y, body.rx * .3, body.x, body.y, body.ry * 1.9);
    g.addColorStop(0, `rgba(255,180,60,${Math.min(.5, .25 * I)})`);
    g.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /** Stopt het vuur en ruimt de observers op. */
  stop() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.visible = false;
    this.resize.disconnect();
    this.seen.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
  }
}
