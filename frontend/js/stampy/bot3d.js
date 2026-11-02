/* ---------- Stampy in cartoon-3D ----------
   Uitzondering op "geen modules": three.js bestaat alleen als ES-module, dus dit bestand is een module
   (zie de importmap in index.html). Het hangt zich aan window.Stampy3D en stuurt 'stampy3d:ready'.
   bot.js (gewoon script) blijft de baas: een Bot met { three: true } vervangt zijn SVG door dit 3D-figuurtje
   zodra het klaar is. Lukt WebGL niet, dan blijft gewoon de SVG-Stampy staan.

   Opbouw: toon-materialen met een zwarte omtrek (een iets grotere, binnenstebuiten kopie van elk onderdeel),
   een gezicht op een canvas waarvan ogen en mond met veren naar een nieuwe vorm morphen, en een kop die
   op een korte nek zit zodat hij nooit door zijn lijf heen draait. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- gezicht ---------- */

const LED = [98, 240, 255];
const RED = [255, 92, 122];
const DIM = [63, 127, 146];
/** Kleur a richting b, f van 0 tot 1. */
const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, f)));

/** Doelwaarden per gezicht; maten zijn fracties van de schermhoogte (ogen) of -breedte (mond).
    tilt: positief = binnenhoeken van de oogleden omhoog (verdrietig), negatief = omlaag (boos). */
const MOODS = {
  neutral: { w: .19, h: .42, lidT: 0, tilt: 0, lidB: 0, star: 0, lookX: 0, lookY: 0, mw: .16, curve: .45, open: 0, col: 0, zz: 0 },
  happy: { w: .25, h: .36, lidT: 0, tilt: 0, lidB: .62, star: 0, lookX: 0, lookY: 0, mw: .22, curve: 1, open: .6, col: 0, zz: 0 },
  cheer: { w: .3, h: .34, lidT: 0, tilt: 0, lidB: 0, star: 1, lookX: 0, lookY: 0, mw: .26, curve: 1, open: .9, col: 0, zz: 0 },
  sad: { w: .19, h: .32, lidT: .38, tilt: 24, lidB: 0, star: 0, lookX: 0, lookY: .25, mw: .15, curve: -.8, open: 0, col: 0, zz: 0 },
  think: { w: .18, h: .36, lidT: .22, tilt: -10, lidB: 0, star: 0, lookX: .7, lookY: -.6, mw: .1, curve: -.15, open: 0, col: 0, zz: 0 },
  worried: { w: .2, h: .42, lidT: .16, tilt: 16, lidB: 0, star: 0, lookX: -.2, lookY: 0, mw: .17, curve: -.35, open: .12, col: 0, zz: 0 },
  sleep: { w: .25, h: .05, lidT: 0, tilt: 0, lidB: 0, star: 0, lookX: 0, lookY: .3, mw: .05, curve: 0, open: .35, col: 1, zz: 1 },
  power: { w: .22, h: .3, lidT: .34, tilt: -24, lidB: 0, star: 0, lookX: 0, lookY: .1, mw: .22, curve: -.2, open: .5, col: 0, zz: 0 },
  alarm: { w: .3, h: .34, lidT: 0, tilt: 0, lidB: 0, star: 0, lookX: 0, lookY: 0, mw: .12, curve: 0, open: .9, col: -1, zz: 0 },
};

/** Een veer: snel, met een beetje overshoot zodat het leeft. */
class Spring {
  constructor(v) { this.v = v; this.t = v; this.vel = 0; }
  step(dt, k = 260, d = 22) { this.vel += ((this.t - this.v) * k - this.vel * d) * dt; this.v += this.vel * dt; }
}

class Face {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.c = canvas;
    this.layer = document.createElement('canvas');
    /** @type {Record<string, Spring>} */
    this.s = {};
    for (const [k, v] of Object.entries(MOODS.neutral)) this.s[k] = new Spring(v);
    this.mood = 'neutral';
    this.px = 0; this.py = 0;
    this.blinkT = 0; this.nextBlink = 1.5 + Math.random() * 2; this.time = 0;
  }

  /** @param {string} mood */
  set(mood) {
    const m = MOODS[mood] || MOODS.neutral;
    this.mood = mood;
    for (const [k, v] of Object.entries(m)) this.s[k].t = v;
    if (calm()) for (const k in this.s) { this.s[k].v = this.s[k].t; this.s[k].vel = 0; }
  }

  blink() { if (this.mood !== 'sleep') this.blinkT = .16; }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    for (const k in this.s) this.s[k].step(dt);
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink(); this.nextBlink = 2.2 + Math.random() * 3.5; }
    this.blinkT = Math.max(0, this.blinkT - dt);
    this.draw();
  }

  draw() {
    const { c, layer } = this, W = c.width, H = c.height;
    if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; }
    const v = k => this.s[k].v;
    const L = /** @type {CanvasRenderingContext2D} */ (layer.getContext('2d'));
    L.clearRect(0, 0, W, H);
    const bl = this.blinkT > 0 ? Math.abs(Math.sin((this.blinkT / .16) * Math.PI)) : 0;
    const eh = Math.max(.035, v('h') * (1 - bl * .9)) * H, ew = v('w') * H;
    const lx = (v('lookX') + this.px * .55) * .06 * W, ly = (v('lookY') + this.py * .55) * .07 * H;
    for (const side of [-1, 1]) {
      const cx = W * (side < 0 ? .3 : .7) + lx, cy = H * .44 + ly;
      L.save(); L.translate(cx, cy);
      // Pil en ster mengen: bij juichen worden de ogen sterretjes.
      L.globalAlpha = 1 - v('star');
      L.beginPath(); L.roundRect(-ew / 2, -eh / 2, ew, eh, Math.max(0, Math.min(ew, eh) / 2)); L.fill();
      if (v('star') > .01) {
        L.globalAlpha = Math.min(1, v('star'));
        L.rotate(Math.sin(this.time * 3) * .15);
        L.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ew * .27 : ew * .62; L.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        L.closePath(); L.fill();
      }
      L.restore();
      // Oogleden: wat het ooglid bedekt, gummen we uit.
      L.save(); L.globalCompositeOperation = 'destination-out'; L.translate(cx, cy);
      if (v('lidT') > .005) { L.save(); L.rotate((v('tilt') * side * Math.PI) / 180); L.fillRect(-ew, -eh * 1.5, ew * 2, eh + v('lidT') * eh); L.restore(); }
      if (v('lidB') > .005) { L.beginPath(); L.ellipse(0, eh * .62, ew * .78, v('lidB') * eh * 1.05, 0, 0, Math.PI * 2); L.fill(); }
      L.restore();
    }
    // Mond: een lijn die lacht of hangt en open kan als een gevulde lens.
    const mw = v('mw') * W, mx = W * .5 + lx * .4, my = H * .77 + ly * .3, k = H * .12, cv = v('curve'), op = Math.max(0, v('open'));
    L.lineCap = 'round'; L.lineWidth = H * .045;
    L.beginPath(); L.moveTo(mx - mw / 2, my);
    L.quadraticCurveTo(mx, my + cv * k * (op > .05 ? .25 : 1), mx + mw / 2, my);
    if (op > .05) { L.quadraticCurveTo(mx, my + cv * k + op * k * 1.3, mx - mw / 2, my); L.fill(); }
    L.stroke();
    if (v('zz') > .02) {
      L.font = `700 ${Math.round(H * .13)}px Fredoka, Nunito, sans-serif`;
      for (let i = 0; i < 3; i++) {
        const t = (this.time * .5 + i / 3) % 1;
        L.globalAlpha = Math.min(1, v('zz')) * Math.sin(t * Math.PI);
        L.fillText('z', W * (.8 + t * .1), H * (.42 - t * .3));
      }
      L.globalAlpha = 1;
    }
    // Inkleuren: rood bij alarm, gedimd bij slapen; daarna met gloed op het scherm.
    const col = v('col');
    const base = col < 0 ? mix(LED, RED, -col) : mix(LED, DIM, col);
    L.globalCompositeOperation = 'source-in'; L.fillStyle = `rgb(${base.join(',')})`; L.fillRect(0, 0, W, H);
    L.globalCompositeOperation = 'source-over';
    const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    g.fillStyle = '#0F1633'; g.fillRect(0, 0, W, H);
    g.save(); g.shadowColor = `rgba(${base.join(',')},.85)`;
    g.shadowBlur = H * .1; g.drawImage(layer, 0, 0);
    g.shadowBlur = H * .035; g.drawImage(layer, 0, 0);
    g.restore();
  }
}

/* ---------- materialen en bouw ---------- */

const steps = new Uint8Array([95, 180, 255]);
const gradientMap = new THREE.DataTexture(steps, 3, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
const outlineMat = new THREE.MeshBasicMaterial({ color: '#131A2F', side: THREE.BackSide });

/** Afgerond rechthoekig vlak met UV's van 0 tot 1. */
function roundedShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundedPlane(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}
function roundedSlab(w, h, r, depth) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), { depth, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  return g;
}
function ntsTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 140;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  g.fillStyle = '#2B47F0'; g.fillRect(0, 0, 256, 140);
  g.fillStyle = '#fff'; g.font = '700 78px Fredoka, Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('NTS', 128, 76);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function shadowBlob() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(10,20,50,.35)'); gr.addColorStop(1, 'rgba(10,20,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = .002;
  return m;
}

const HEAD_Y = .84;

/** Bouwt Stampy; maten uit de SVG van de app (100 SVG-pixels = 1 eenheid, voeten op y = 0). */
function build() {
  const mats = { shell: toon('#F3F5FB'), accent: toon('#2B47F0'), dark: toon('#131A2F'), bulb: toon('#FFC93D', { emissive: '#FFB020', emissiveIntensity: .5 }) };
  const meshes = [];
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, outline = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
    if (outline) meshes.push(m);
    return m;
  };
  const root = new THREE.Group(), bot = new THREE.Group(); root.add(bot); root.add(shadowBlob());
  const body = new THREE.Group(); body.position.y = .41; bot.add(body);
  add(body, new RoundedBoxGeometry(.88, .74, .62, 6, .27), mats.shell);
  add(body, roundedSlab(.58, .32, .1, .04), mats.accent, 0, .03, .31);
  add(body, roundedPlane(.5, .26, .08), new THREE.MeshBasicMaterial({ map: ntsTexture() }), 0, .03, .355, false);
  add(body, new THREE.CapsuleGeometry(.08, .14, 8, 16).rotateZ(Math.PI / 2), mats.accent, -.42, .31, 0);
  add(body, new THREE.CapsuleGeometry(.08, .14, 8, 16).rotateZ(Math.PI / 2), mats.accent, .42, .31, 0);
  const arm = side => {
    const g = new THREE.Group(); g.position.set(.54 * side, .66, 0); bot.add(g);
    add(g, new THREE.CapsuleGeometry(.08, .26, 8, 16), mats.shell, 0, -.2, 0);
    add(g, new THREE.SphereGeometry(.085, 24, 16), mats.accent, 0, -.43, 0);
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  add(bot, new RoundedBoxGeometry(.22, .14, .26, 4, .06), mats.accent, -.19, .07, .02);
  add(bot, new RoundedBoxGeometry(.22, .14, .26, 4, .06), mats.accent, .19, .07, .02);
  // Korte nek: de kop zit net boven de schouders, zodat hij kan draaien zonder door zijn lijf te gaan.
  add(bot, new THREE.CylinderGeometry(.17, .2, .12, 24), mats.dark, 0, .82, 0);
  const head = new THREE.Group(); head.position.y = HEAD_Y; bot.add(head);
  const hy = .4;
  add(head, new RoundedBoxGeometry(1.24, .88, .8, 8, .3), mats.shell, 0, hy, 0);
  add(head, new RoundedBoxGeometry(.12, .32, .3, 4, .06), mats.accent, -.66, hy, 0);
  add(head, new RoundedBoxGeometry(.12, .32, .3, 4, .06), mats.accent, .66, hy, 0);
  add(head, roundedSlab(1.02, .66, .26, .06), mats.dark, 0, hy, .37);
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = 384; faceCanvas.height = 243;
  const face = new Face(faceCanvas);
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  add(head, roundedPlane(.96, .6, .24), new THREE.MeshBasicMaterial({ map: faceTex }), 0, hy, .422, false);
  add(head, new THREE.CylinderGeometry(.018, .018, .3, 12), mats.dark, 0, hy + .57, 0);
  const bulb = add(head, new THREE.SphereGeometry(.085, 32, 24), mats.bulb, 0, hy + .76, 0);
  // Omtrek
  for (const m of meshes) {
    m.geometry.computeBoundingBox();
    const size = new THREE.Vector3(); m.geometry.boundingBox.getSize(size);
    const t = .026, hull = new THREE.Mesh(m.geometry, outlineMat);
    hull.scale.set(1 + 2 * t / Math.max(size.x, .04), 1 + 2 * t / Math.max(size.y, .04), 1 + 2 * t / Math.max(size.z, .04));
    m.add(hull);
  }
  return { root, bot, head, body, armL, armR, bulb, face, faceTex, mats };
}

/* ---------- een Stampy op een plek ---------- */

/**
 * Zet een 3D-Stampy in host (het .host-element van een Bot). Geeft null als WebGL niet lukt.
 * @param {HTMLElement} host
 * @param {{ label?: string | null }} [opts]
 */
function create(host, { label = null } = {}) {
  let renderer;
  const canvas = document.createElement('canvas');
  canvas.className = 'bot3d';
  if (label) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label); } else canvas.setAttribute('aria-hidden', 'true');
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#7C8CC8', 1.7));
  const key = new THREE.DirectionalLight('#ffffff', 2.3); key.position.set(2.5, 4, 3.5); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 200 / 230, .1, 30);
  camera.position.set(0, 1.12, 4.7); camera.lookAt(0, 1.0, 0);
  const s = build();
  scene.add(s.root);

  const sp = { hry: new Spring(0), hrx: new Spring(0), hrz: new Spring(0), by: new Spring(0), y: new Spring(0), sq: new Spring(1), al: new Spring(0), ar: new Spring(0) };
  let pose = 'neutral', move = '', moveT = 0, px = 0, py = 0, t = 0, days = 1, visible = true, raf = 0, last = performance.now();

  const fit = () => {
    const w = canvas.clientWidth || host.clientWidth, h = canvas.clientHeight || w * 230 / 200;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit); ro.observe(canvas); fit();
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }); io.observe(canvas);
  const onMove = e => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    px = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * .9), -1, 1);
    py = clamp((e.clientY - (r.top + r.height * .35)) / (r.height * .9), -1, 1);
  };
  addEventListener('pointermove', onMove, { passive: true });

  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!visible || document.hidden) return;
    t += dt; moveT = Math.max(0, moveT - dt);
    const still = calm(), act = moveT > 0 ? move : '';
    const looking = pose !== 'sleep';
    s.face.px = looking ? px : 0; s.face.py = looking ? py : 0;
    let hry = looking ? px * .5 : 0, hrx = looking ? py * .25 : 0, hrz = looking ? -px * .07 : 0, by = looking ? px * .15 : 0, al = 0, ar = 0, shake = 0;
    let bob = still ? 0 : Math.sin(t * 2.1) * .025;
    if (pose === 'sad' || act === 'droop') { hrx += .3; hrz += .1; al = -.05; ar = .05; }
    if (pose === 'sleep') { hrx += .28; hrz = .12; bob = still ? 0 : Math.sin(t * 1.1) * .015; }
    if (pose === 'think') { hrz += .14; hry -= .2; hrx -= .12; ar = .55; }
    if (pose === 'happy') { al = -.35; ar = .35; }
    if ((pose === 'cheer' || act === 'dance') && !still) { hrz += Math.sin(t * 9) * .16; al = -2.4 - Math.sin(t * 12) * .4; ar = 2.4 + Math.sin(t * 12) * .4; bob = Math.abs(Math.sin(t * 6)) * .12; }
    if ((pose === 'alarm' || pose === 'power' || act === 'shake') && !still) { shake = Math.sin(t * 46) * .035; al = -.7; ar = .7; }
    sp.hry.t = hry; sp.hrx.t = hrx; sp.hrz.t = hrz; sp.by.t = by; sp.al.t = al; sp.ar.t = ar; sp.y.t = 0; sp.sq.t = 1;
    for (const k in sp) sp[k].step(dt, k === 'sq' ? 300 : k === 'y' ? 160 : 110, 13);
    s.bot.position.set(shake, Math.max(-.02, sp.y.v) + bob, 0);
    s.bot.scale.set(1 / Math.sqrt(sp.sq.v), sp.sq.v, 1 / Math.sqrt(sp.sq.v));
    s.bot.rotation.y = sp.by.v;
    // Geen botsingen: de kop kantelt binnen grenzen en komt omhoog zoveel als zijn onderste hoek zakt;
    // de armen gaan alleen naar buiten (naar binnen zit meteen het lijf).
    const rx = clamp(sp.hrx.v, -.22, .32), ry = clamp(sp.hry.v, -.6, .6), rz = clamp(sp.hrz.v, -.17, .17);
    s.head.rotation.set(rx, ry, rz);
    s.head.position.y = HEAD_Y + .5 * Math.abs(Math.sin(rz)) + .44 * Math.abs(Math.sin(rx));
    s.body.scale.set(1, still ? 1 : 1 + Math.sin(t * 2.1) * .012, 1);
    s.armL.rotation.z = Math.min(sp.al.v, 0); s.armR.rotation.z = Math.max(sp.ar.v, 0);
    s.mats.bulb.emissiveIntensity = pose === 'sleep' ? .1 : (days >= 3 ? .9 : .5) + Math.sin(t * 2.4) * .2;
    s.face.update(dt); s.faceTex.needsUpdate = true;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    canvas,
    /** Gezicht en houding (neutral, happy, cheer, sad, think, worried, sleep, alarm, power). @param {string} expr */
    set(expr) { pose = expr; s.face.set(expr); },
    /** Animatie zoals bij de SVG: hop, dance, droop of shake. @param {string | null} name */
    anim(name) {
      if (!name) { moveT = 0; return; }
      move = name; moveT = name === 'hop' ? 0 : 1.6;
      if (name === 'hop' && !calm()) { sp.sq.v = .8; sp.y.vel = 3.2; s.face.blink(); }
    },
    /** Streak-upgrades: vanaf 3 dagen gloeit de antenne feller, vanaf 21 dagen een gouden pantser. @param {number} d */
    stage(d) {
      days = d;
      s.mats.shell.color.set(d >= 21 ? '#F7C03C' : '#F3F5FB');
      s.mats.accent.color.set(d >= 21 ? '#9A6410' : '#2B47F0');
    },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      removeEventListener('pointermove', onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose(); canvas.remove();
    },
  };
}

window.Stampy3D = { create };
dispatchEvent(new Event('stampy3d:ready'));
