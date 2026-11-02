/* ---------- de draken als eindbaas (cartoon-3D) ----------
   Elke wereld heeft een eigen draak met een eigen bouw: de Code-slang (zwevende slangendraak met een beeldscherm-gezicht)
   en Stoer (een draak op vier poten), elk in varianten. Kleuren uit DRAGONS (js/stampy/dragon.js), plus per wereld een
   kenmerk: accolade-hoorns, kever-antennes, database-schijfjes, een zandloper, een glitchend derde oog of een pager.
   Wereld 6 is de laatste eindbaas: drie koppen.
   Een draak kijkt naar +z en geeft: root, parts, flashMats, height, mouth(), lunge(t), update(dt, t),
   breathe(scene, target, ms) (bek open + vlammenstroom) en hurt() (terugdeinzen als hij geraakt wordt). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Face, toon, calm } from '../stampy/bot3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** LED-kleur van het scherm-gezicht (Code-slang) per wereld. */
const LEDS = { 1: [255, 154, 61], 2: [127, 224, 90], 3: [255, 201, 61], 4: [255, 176, 32], 5: [98, 240, 255], 6: [255, 201, 61] };

/** Kleuren van de draak van een wereld, uit DRAGONS. @param {number} world */
function colorsOf(world) {
  const d = typeof DRAGONS !== 'undefined' && DRAGONS[world - 1];
  const c = d && d.colors ? d.colors : { body: '#5B76F2', dark: '#3A50C8', belly: '#FFE6A8', wing: '#A9B8FF', horn: '#FFC93D', accent: '#FFC93D' };
  return { ...c, led: LEDS[world] || LEDS[1] };
}

function mats(w) {
  return {
    body: toon(w.body), dark: toon(w.dark), belly: toon(w.belly), horn: toon(w.horn), accent: toon(w.accent),
    wing: toon(w.wing, { side: THREE.DoubleSide }), white: toon('#FFFFFF'), black: toon('#131A2F'),
    throat: toon('#6B1530'), tongue: toon('#FF7A9C'),
    glow: toon(w.accent, { emissive: w.accent, emissiveIntensity: .7 }),
  };
}

function builder() {
  const parts = [];
  const P = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); parts.push(mesh); return mesh;
  };
  return { parts, P };
}

/** Buis langs een curve die van r0 naar r1 smaller wordt. */
function taperTube(curve, seg, r0, r1, radial = 12) {
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) { const idx = i * (radial + 1) + j; v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c); pos.setXYZ(idx, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  return g;
}

/** Een veer (voor kaak, uitval en terugdeinzen). */
class S1 { constructor(v = 0) { this.v = v; this.t = v; this.vel = 0; } step(dt, k = 160, d = 14) { this.vel += ((this.t - this.v) * k - this.vel * d) * dt; this.v += this.vel * dt; } }

/* ---------- vuur ---------- */

let flameTex = null;
function flameTexture() {
  if (flameTex) return flameTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#FF7A2E'; g.strokeStyle = '#131A2F'; g.lineWidth = 4;
  g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#FFD84A'; g.beginPath(); g.arc(28, 28, 15, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFF6CF'; g.beginPath(); g.arc(25, 25, 6, 0, Math.PI * 2); g.fill();
  flameTex = new THREE.CanvasTexture(c); flameTex.colorSpace = THREE.SRGBColorSpace;
  return flameTex;
}

/** Een stroom cartoonvlammen uit de bek naar het doel; from() geeft steeds de actuele bekpositie, rate = vlammen per frame. */
function flameStream(scene, from, target, ms, rate = 3) {
  return new Promise(res => {
    const live = [], tex = flameTexture(), smoke = new THREE.Color('#8E8AA0');
    const t0 = performance.now(); let last = t0;
    const step = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
      if (now - t0 < ms) for (let i = 0; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        const p = from(); sp.position.copy(p);
        const dir = target.clone().sub(p).normalize();
        sp.userData = { vel: dir.multiplyScalar(3.4 + Math.random() * 1.2).add(V((Math.random() - .5) * .9, (Math.random() - .3) * .7, (Math.random() - .5) * .9)), age: 0, life: .5 + Math.random() * .2, spin: (Math.random() - .5) * 6 };
        sp.material.rotation = Math.random() * 6;
        sp.scale.setScalar(.12);
        scene.add(sp); live.push(sp);
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const sp = live[i], u = sp.userData;
        u.age += dt; const f = u.age / u.life;
        sp.position.addScaledVector(u.vel, dt); u.vel.multiplyScalar(.95); u.vel.y += dt * 1.2;
        sp.scale.setScalar(.14 + f * .5);
        sp.material.rotation += u.spin * dt;
        if (f > .6) sp.material.color.lerp(smoke, .15);
        sp.material.opacity = Math.min(1, 1.6 - f * 1.6);
        if (f >= 1) { scene.remove(sp); sp.material.dispose(); live.splice(i, 1); }
      }
      if (now - t0 >= ms && !live.length) res(); else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- kenmerk per wereld ---------- */

/**
 * Hangt het kenmerk van de wereld aan de draak. A: ankerpunten van de bouwvorm.
 * @returns {(t: number) => void} animatie per frame
 */
function addTrait(world, A, P, m) {
  if (world === 1) {
    // Krulhoorns: een S-bocht zoals een accolade.
    for (const s of [-1, 1]) {
      const b = A.hornBase(s);
      const c = new THREE.CatmullRomCurve3([b, b.clone().add(V(.06 * s, .14, -.02)), b.clone().add(V(-.02 * s, .26, -.08)), b.clone().add(V(.07 * s, .4, -.16))]);
      P(A.head, taperTube(c, 20, .05, .018, 10), m.horn);
    }
    return () => {};
  }
  if (world === 2) {
    // Kever-antennes met bolletjes, en stippen op de rug.
    const ants = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.copy(A.hornBase(s)); A.head.add(g);
      const c = new THREE.CatmullRomCurve3([V(0, 0, 0), V(.05 * s, .2, .05), V(.16 * s, .34, .12)]);
      P(g, taperTube(c, 14, .022, .014, 8), m.black);
      P(g, new THREE.SphereGeometry(.055, 14, 10), m.accent, .16 * s, .34, .12);
      ants.push(g);
    }
    for (const b of A.back) for (const s of [-1, 1]) { const sp = P(b.parent, new THREE.SphereGeometry(b.r * .22, 12, 8), m.accent, b.pos.x + b.r * .45 * s, b.pos.y + b.r * .72, b.pos.z, 1, .45, 1); sp.userData.noOutline = true; }
    return t => ants.forEach((a, i) => { a.rotation.z = Math.sin(t * 5 + i * 2) * .15; a.rotation.x = Math.sin(t * 4 + i) * .1; });
  }
  if (world === 3) {
    // Database-schijfjes: kleine stapels cilinders op de rug.
    for (const b of A.back) for (let j = 0; j < 3; j++) P(b.parent, new THREE.CylinderGeometry(b.r * .3, b.r * .3, b.r * .14, 16), j === 2 ? m.accent : m.horn, b.pos.x, b.pos.y + b.r * (.88 + j * .17), b.pos.z);
    return () => {};
  }
  if (world === 4) {
    // Zandloper aan de staartpunt; draait af en toe om.
    const g = new THREE.Group(); A.tail.add(g); g.position.copy(A.tailTip);
    P(g, new THREE.CylinderGeometry(.11, .11, .03, 16), m.dark, 0, .15, 0);
    P(g, new THREE.CylinderGeometry(.11, .11, .03, 16), m.dark, 0, -.15, 0);
    P(g, new THREE.ConeGeometry(.09, .14, 16), m.horn, 0, .07, 0).rotation.x = Math.PI;
    P(g, new THREE.ConeGeometry(.09, .14, 16), m.horn, 0, -.07, 0);
    P(g, new THREE.ConeGeometry(.06, .07, 16), m.accent, 0, -.11, 0).userData.noOutline = true;
    return t => { g.rotation.z = Math.floor(t / 3) % 2 ? Math.PI : 0; g.rotation.y = t * .6; };
  }
  if (world === 5) {
    // Derde oog op het voorhoofd dat glitcht (springt af en toe opzij en flikkert).
    const g = new THREE.Group(); g.position.copy(A.forehead); A.head.add(g);
    P(g, new THREE.SphereGeometry(.07, 18, 12), m.white, 0, 0, 0, 1, 1.25, .6);
    const iris = P(g, new THREE.SphereGeometry(.045, 14, 10), m.glow, 0, 0, .03, 1, 1.25, .6); iris.userData.noOutline = true;
    return t => { const glitch = Math.sin(t * 13) > .93; g.position.x = A.forehead.x + (glitch ? .03 : 0); m.glow.emissiveIntensity = glitch ? 1.6 : .6 + Math.sin(t * 3) * .2; };
  }
  // world 6: pager om de nek, met een knipperend lampje dat trilt als hij piept.
  const g = new THREE.Group(); g.position.copy(A.neckPos); A.neck.add(g);
  P(g, new THREE.TorusGeometry(A.neckR + .02, .025, 8, 24), m.black).rotation.x = Math.PI / 2 - .3;
  const pager = P(g, new RoundedBoxGeometry(.2, .14, .06, 3, .03), m.horn, 0, -.06, A.neckR + .05); pager.rotation.x = -.3;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.13, .06), new THREE.MeshBasicMaterial({ color: '#9EE6B0' })); screen.position.set(0, .01, .031); pager.add(screen);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), new THREE.MeshBasicMaterial({ color: '#FF4B4B' })); led.position.set(.075, .045, .03); pager.add(led);
  return t => { const on = (t * 2.5) % 1 < .5; led.material.color.set(on ? '#FF4B4B' : '#5A1020'); pager.rotation.z = on ? Math.sin(t * 60) * .05 : 0; };
}

/* ================= Code-slang ================= */
function glyph(text) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 44px JetBrains Mono, Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#131A2F'; g.strokeText(text, 64, 34); g.fillStyle = '#FFD84A'; g.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(.5, .25, 1);
  return s;
}

/**
 * @param {{ N?: number, thick?: number, coil?: number, glitch?: boolean, crown?: boolean }} [o]
 *   N = aantal segmenten (lengte), thick = dikte, coil = hoe wijd hij kronkelt, glitch = haperend lijf met spookbeelden, crown = kroon van schijfjes
 */
export function slang(world = 1, o = {}) {
  const { N = 30, thick = 1, coil = 1, glitch = false, crown = false } = o;
  const w = colorsOf(world), m = mats(w);
  const { parts, P } = builder();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const segs = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), r = (.25 * (1 - u * .72) + .03) * thick;
    const g = new THREE.Group(); body.add(g);
    P(g, new THREE.SphereGeometry(r, 22, 16), m.body);
    P(g, new THREE.SphereGeometry(r * .82, 18, 12), m.belly, 0, -r * .32, r * .32, 1, .8, 1).userData.noOutline = true;
    if (i % 3 === 0 && i > 0 && i < N - 3 && world !== 3) { const fin = P(g, new THREE.ConeGeometry(r * .35, r * 1.1, 8), m.horn, 0, r * 1.05, -r * .1); fin.rotation.x = -.3; }
    g.userData.u = u; g.userData.r = r;
    segs.push(g);
  }
  const tip = P(segs[N - 1], new THREE.ConeGeometry(.1, .3, 4), m.horn, 0, 0, -.18, 1, 1, .4); tip.rotation.x = -Math.PI / 2;
  // Kraag: verbindt kop en lijf, zodat de nek nooit los komt.
  const collar = new THREE.Group(); body.add(collar);
  P(collar, new THREE.SphereGeometry(.3 * Math.max(1, thick * .9), 22, 16), m.dark);

  // Kop: blokje met scherm, bovensnuit en een scharnierende onderkaak.
  const head = new THREE.Group(); body.add(head);
  P(head, new RoundedBoxGeometry(.62, .46, .52, 4, .1), m.body);
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 160;
  const face = new Face(fc, { led: w.led });
  face.set('angry');
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.48, .26), new THREE.MeshBasicMaterial({ map: ftex }));
  screen.position.set(0, .06, .262); head.add(screen);
  const snout = P(head, new RoundedBoxGeometry(.44, .13, .3, 3, .05), m.dark, 0, -.13, .3);
  for (const s of [-1, 1]) {
    P(snout, new THREE.SphereGeometry(.022, 8, 6), m.black, .08 * s, .05, .15).userData.noOutline = true;
    const tooth = P(snout, new THREE.ConeGeometry(.022, .06, 6), m.white, .12 * s, -.08, .1); tooth.rotation.x = Math.PI; tooth.userData.noOutline = true;
    const wc = new THREE.CatmullRomCurve3([V(.2 * s, -.12, .38), V(.45 * s, -.18, .45), V(.7 * s, -.34, .3), V(.82 * s, -.58, .1)]);
    P(head, taperTube(wc, 20, .025, .006, 8), m.horn);
    if (world !== 2) {
      P(head, new THREE.CylinderGeometry(.02, .02, .3, 8), m.black, .18 * s, .38, -.05).rotation.z = -.35 * s;
      P(head, new THREE.SphereGeometry(.06, 14, 10), m.glow, .24 * s, .52, -.05);
    }
    for (let j = 0; j < 3; j++) { const mane = P(head, new THREE.ConeGeometry(.06, .24, 8), m.horn, .2 * s, .1 - j * .12, -.28); mane.rotation.x = -1.3; mane.rotation.z = -.5 * s; }
  }
  const jaw = new THREE.Group(); jaw.position.set(0, -.2, .17); head.add(jaw);
  P(jaw, new RoundedBoxGeometry(.4, .08, .3, 3, .035), m.dark, 0, -.03, .15);
  const inside = P(jaw, new THREE.BoxGeometry(.32, .02, .24), m.throat, 0, .015, .14); inside.userData.noOutline = true;
  const tongue = P(jaw, new THREE.CapsuleGeometry(.04, .12, 4, 8), m.tongue, 0, .03, .14, 1, .5, 1); tongue.rotation.x = Math.PI / 2; tongue.userData.noOutline = true;
  for (const s of [-1, 1]) { const tt = P(jaw, new THREE.ConeGeometry(.02, .05, 6), m.white, .12 * s, .04, .24); tt.userData.noOutline = true; }

  if (crown) for (let j = 0; j < 3; j++) for (let n = 0; n < 2; n++) P(head, new THREE.CylinderGeometry(.06, .06, .035, 14), n ? m.accent : m.horn, (j - 1) * .17, .27 + n * .045, -.02 - Math.abs(j - 1) * .04);
  // Glitch: twee gekleurde spookbeelden van de kop die af en toe naast hem flitsen.
  const ghosts = glitch ? ['#FF4FD8', '#4FF0FF'].map(c => { const g = new THREE.Mesh(new RoundedBoxGeometry(.62, .46, .52, 4, .1), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })); body.add(g); return g; }) : [];
  let glitchT = 0, nextGlitch = 1.5;
  const glyphs = ['{ }', '</>', '( )', '>>>'].map(g => { const sp = glyph(g); body.add(sp); return sp; });

  const jawS = new S1(0), hit = new S1(0), lunge = new S1(0);
  let hitWave = 0, moodT = 0;
  const pathAt = (u, t, out) => {
    const a = u * Math.PI * 2.1;
    out.set(.8 * coil * Math.sin(a) * (1 - u * .35), 1.75 - u * 1.25 * (.6 + coil * .4) + .12 * Math.sin(a * 1.5), -.25 - u * .55 * coil + .45 * coil * Math.cos(a));
    if (glitchT > 0 && Math.sin(u * 40 + t * 90) > .6) out.x += .08;
    out.y += (.09 + hitWave * .12) * Math.sin(t * 3 - u * 8); out.x += .06 * Math.sin(t * 2 - u * 6);
    return out;
  };
  const nxt = new THREE.Vector3(), dir = new THREE.Vector3(), FWD = V(0, 0, 1), push = new THREE.Vector3();
  const front = u => Math.max(0, 1 - u / .4) ** 1.5;
  const place = t => {
    // Uitval (lunge) en terugdeinzen (hit) duwen het voorste deel van het lijf mee, met een zachte overgang,
    // zodat kop, kraag en lijf aan elkaar blijven.
    push.set(0, hit.v * .12, lunge.v * .55 - hit.v * .4);
    segs.forEach(g => { pathAt(g.userData.u, t, g.position).addScaledVector(push, front(g.userData.u)); });
    pathAt(-.035, t, collar.position).add(push);
    pathAt(-.08, t, head.position).add(push); head.position.y += .05;
    pathAt(0, t, nxt).addScaledVector(push, front(0));
    dir.subVectors(head.position, nxt).normalize().lerp(FWD, .7).normalize();
    head.quaternion.setFromUnitVectors(FWD, dir);
    head.rotateX(-hit.v * .45 - jawS.v * .12);
  };
  const A = {
    head, forehead: V(0, .3, .2), hornBase: s => V(.2 * s, .22, -.02),
    back: segs.filter((_, i) => i % 4 === 2 && i < N - 4).map(g => ({ parent: g, pos: V(0, 0, 0), r: g.userData.r })),
    tail: segs[N - 1], tailTip: V(0, 0, -.32), neck: collar, neckPos: V(0, 0, 0), neckR: .3,
  };
  const trait = addTrait(world, A, P, m);
  place(0);
  return {
    root, parts, flashMats: [m.body, m.belly, m.dark], height: 2.35,
    mouth: () => jaw.localToWorld(V(0, .05, .36)),
    lunge(x) { lunge.t = x; jawS.t = x * .5; face.set(x > .3 ? 'alarm' : 'angry'); },
    async breathe(scene, target, ms = 900) {
      jawS.t = 1; face.set('alarm');
      if (!calm()) await flameStream(scene, () => jaw.localToWorld(V(0, .05, .36)), target, ms);
      jawS.t = 0; face.set('angry');
    },
    hurt() { hit.vel += 9; hitWave = 1; face.set('sad'); moodT = .9; },
    update(dt, t) {
      jawS.step(dt, 220, 16); hit.step(dt, 90, 9); lunge.step(dt, 140, 16);
      hitWave = Math.max(0, hitWave - dt * 1.2);
      if (moodT > 0) { moodT -= dt; if (moodT <= 0) face.set('angry'); }
      jaw.rotation.x = Math.max(0, jawS.v) * .75;
      if (glitch) {
        nextGlitch -= dt; if (nextGlitch < 0) { glitchT = .25; nextGlitch = 1 + Math.random() * 2; }
        glitchT = Math.max(0, glitchT - dt);
      }
      place(t);
      ghosts.forEach((g, i) => { g.position.copy(head.position).add(V((i ? -1 : 1) * (.06 + Math.random() * .05), 0, 0)); g.quaternion.copy(head.quaternion); g.material.opacity = glitchT > 0 ? .45 : 0; });
      glyphs.forEach((g, i) => { const a = t * .8 + i * Math.PI / 2; g.position.set(Math.cos(a) * 1.15, 1.1 + Math.sin(t * 1.3 + i) * .25, Math.sin(a) * .8 - .4); });
      face.update(dt); ftex.needsUpdate = true;
      m.glow.emissiveIntensity = .6 + Math.sin(t * 4) * .25;
      trait(t);
    },
  };
}

/* ================= Stoer: op vier poten, met de verhoudingen van een echte draak ================= */

/** Wijzerplaat met razende wijzers (Timeoutdraak), getekend op een canvas. */
function clockFace() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = t => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#FFF6E0'; g.strokeStyle = '#131A2F'; g.lineWidth = 8;
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill(); g.stroke();
    g.lineWidth = 4;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.sin(a) * 44, 64 - Math.cos(a) * 44); g.lineTo(64 + Math.sin(a) * 52, 64 - Math.cos(a) * 52); g.stroke(); }
    const hand = (a, len, wdt, col) => { g.strokeStyle = col; g.lineWidth = wdt; g.lineCap = 'round'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(a) * len, 64 - Math.cos(a) * len); g.stroke(); };
    hand(t * .8, 28, 7, '#131A2F'); hand(t * 9, 42, 4, '#FF4B4B');
    g.fillStyle = '#131A2F'; g.beginPath(); g.arc(64, 64, 6, 0, Math.PI * 2); g.fill();
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

/**
 * @param {{ heads?: 1 | 3, wings?: 'bat' | 'beetle', neck?: number, bulk?: number, legs6?: boolean, clock?: boolean, size?: number }} [o]
 *   heads = aantal koppen, wings = vleermuisvleugels of kever-dekschilden, neck = neklengte, bulk = breedte van de romp,
 *   legs6 = zes poten (kever), clock = klok op de borst, size = totale grootte
 */
export function stoer(world = 1, o = {}) {
  const { heads: nHeads = 1, wings: wingType = 'bat', neck = 1, bulk = 1, legs6 = false, clock = false, size = 1 } = o;
  const w = colorsOf(world), m = mats(w);
  m.memb = toon(w.dark, { side: THREE.DoubleSide });
  const eyeMat = toon(w.accent, { emissive: w.accent, emissiveIntensity: .7 });
  const { parts, P } = builder();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.scale.setScalar(size);

  // Romp: lang en iets oplopend naar de borst; bulk maakt hem breder en zwaarder.
  const trunk = new THREE.Group(); trunk.scale.set(bulk, .9 + bulk * .1, 1); body.add(trunk);
  const torso = P(trunk, new THREE.SphereGeometry(.5, 40, 30), m.body, 0, 1.0, -.15, .78, .74, 1.5);
  torso.rotation.x = -.12;
  P(trunk, new THREE.SphereGeometry(.42, 32, 24), m.body, 0, 1.12, .4, .9, .95, .9);
  for (let i = 0; i < 7; i++) {
    const z = .55 - i * .2, dz = (z + .15) / .75, y = 1.0 - .37 * Math.sqrt(Math.max(0, 1 - dz * dz)) - (z > .3 ? .05 : 0);
    const p = P(trunk, new THREE.CapsuleGeometry(.045, .2 - Math.abs(i - 2) * .02, 6, 10), m.belly, 0, y + .02, z, 1, .55, 1);
    p.rotation.z = Math.PI / 2;
  }
  // Poten
  const foot = (g, x, z, y0 = 0) => {
    P(g, new THREE.SphereGeometry(.13, 16, 12), m.dark, x, y0 + .06, z + .05, 1, .5, 1.4);
    for (const c of [-1, 0, 1]) { const cl = P(g, new THREE.ConeGeometry(.03, .11, 8), m.white, x + c * .06, y0 + .05, z + .23); cl.rotation.x = Math.PI / 2 + .3; cl.userData.noOutline = true; }
  };
  const insectLegs = [];
  for (const s of [-1, 1]) {
    P(body, new THREE.SphereGeometry(.2, 18, 14), m.body, .3 * s * bulk, 1.0, .42, .8, 1.1, 1);
    const fl = new THREE.Group(); fl.position.set(.33 * s * bulk, .95, .45); body.add(fl);
    const upper = P(fl, new THREE.CapsuleGeometry(.1, .26, 6, 12), m.body, 0, -.2, -.05); upper.rotation.x = .35;
    P(fl, new THREE.SphereGeometry(.085, 12, 10), m.body, 0, -.42, -.11);
    const lower = P(fl, new THREE.CapsuleGeometry(.075, .3, 6, 12), m.dark, 0, -.64, -.04); lower.rotation.x = -.25;
    foot(fl, 0, .02, -.95);
    P(body, new THREE.SphereGeometry(.3, 22, 16), m.body, .3 * s * bulk, .85, -.62, .75, 1.05, 1.1);
    const shin = P(body, new THREE.CapsuleGeometry(.085, .36, 6, 12), m.dark, .34 * s * bulk, .38, -.6); shin.rotation.x = -.45;
    foot(body, .34 * s * bulk, -.5);
    if (legs6) {
      // Kevertje: een extra paar dunne, geknikte pootjes in het midden.
      const g = new THREE.Group(); g.position.set(.4 * s * bulk, .82, -.08); body.add(g);
      const a = P(g, new THREE.CapsuleGeometry(.045, .3, 6, 10), m.dark, .15 * s, .05, 0); a.rotation.z = -1.1 * s;
      const b = P(g, new THREE.CapsuleGeometry(.04, .42, 6, 10), m.dark, .34 * s, -.32, 0); b.rotation.z = .25 * s;
      insectLegs.push(g);
    }
  }
  // Koppen: elk op het eind van zijn eigen nek. Bij drie koppen buigen de zijnekken naar buiten.
  const base = V(0, 1.12, .42);
  const neckPts = (dx, len) => [V(0, 0, 0), V(dx * .35, .3, .24), V(dx * .75, .56, .32), V(dx, .72, .48)].map(p => base.clone().add(V(p.x, p.y * len, p.z * len)));
  const headDefs = nHeads === 3 ? [{ dx: 0, len: neck, s: 1 }, { dx: -.48, len: neck * .85, s: .9 }, { dx: .48, len: neck * .85, s: .9 }] : [{ dx: 0, len: neck, s: 1 }];
  const headsArr = headDefs.map(({ dx, len, s: hs }, hi) => {
    const curve = new THREE.CatmullRomCurve3(neckPts(dx, len));
    P(body, taperTube(curve, 24, .2 * (hi ? .85 : 1), .12 * (hi ? .85 : 1)), m.body);
    const end = curve.getPointAt(1), tan = curve.getTangentAt(1);
    const head = new THREE.Group(); head.position.copy(end).addScaledVector(tan, .06); head.scale.setScalar(1.18 * hs); body.add(head);
    head.userData.yaw = dx * .7;
    P(head, new THREE.SphereGeometry(.2, 26, 18), m.body, 0, 0, 0, 1, .85, 1.15);
    const snout = P(head, new THREE.CapsuleGeometry(.1, .24, 8, 14), m.body, 0, -.04, .26, 1.1, .75, 1); snout.rotation.x = Math.PI / 2 - .12;
    for (const s of [-1, 1]) {
      const e = P(head, new THREE.SphereGeometry(.05, 16, 12), eyeMat, .11 * s, .05, .16, 1, .8, 1);
      const slit = P(e, new THREE.BoxGeometry(.012, .07, .02), m.black, 0, 0, .045); slit.userData.noOutline = true;
      const brow = P(head, new THREE.BoxGeometry(.12, .035, .08), m.dark, .11 * s, .11, .17); brow.rotation.z = .4 * s;
      P(head, new THREE.SphereGeometry(.018, 8, 6), m.black, .045 * s, .0, .52).userData.noOutline = true;
      if (world !== 1 && world !== 2) {
        const hc = new THREE.CatmullRomCurve3([V(.09 * s, .12, -.05), V(.18 * s, .22, -.25), V(.2 * s, .18, -.48)]);
        P(head, taperTube(hc, 16, .045, .01, 10), m.horn);
      }
      const cs = P(head, new THREE.ConeGeometry(.03, .12, 8), m.horn, .18 * s, -.08, -.04); cs.rotation.z = -1.9 * s;
      for (let i = 0; i < 3; i++) { const tt = P(head, new THREE.ConeGeometry(.014, .045, 6), m.white, .065 * s, -.12, .26 + i * .07); tt.rotation.x = Math.PI; tt.userData.noOutline = true; }
    }
    const jaw = new THREE.Group(); jaw.position.set(0, -.11, .1); head.add(jaw);
    const lj = P(jaw, new THREE.CapsuleGeometry(.075, .24, 6, 12), m.dark, 0, -.02, .18, 1.1, .55, 1); lj.rotation.x = Math.PI / 2;
    const inside = P(jaw, new THREE.BoxGeometry(.11, .015, .24), m.throat, 0, .02, .18); inside.userData.noOutline = true;
    const tongue = P(jaw, new THREE.CapsuleGeometry(.025, .1, 4, 8), m.tongue, 0, .03, .2, 1, .5, 1); tongue.rotation.x = Math.PI / 2; tongue.userData.noOutline = true;
    return { head, jaw, curve, phase: hi * 2.1 };
  });
  const main = headsArr[0];
  // Rugstekels van (middelste) nek tot staart
  const top = main.curve.getPointAt(1);
  const spine = new THREE.CatmullRomCurve3([top.clone().add(V(0, 0, -.12)), main.curve.getPointAt(.6).add(V(0, .12, -.1)), V(0, 1.42, .44), V(0, 1.32, .0), V(0, 1.28, -.5), V(0, 1.1, -.95)]);
  const backPts = [];
  for (let i = 0; i < 10; i++) {
    const u = i / 9, p = spine.getPointAt(u);
    const big = 1 - Math.abs(u - .55) * 1.4;
    if (i % 3 === 1) backPts.push({ parent: body, pos: p.clone().add(V(0, -.12, 0)), r: .28 });
    if ((world === 3 && i % 3 === 1) || (wingType === 'beetle' && u > .3 && u < .85)) continue;
    const sp = P(body, new THREE.ConeGeometry(.045 + big * .03, .14 + big * .1, 8), m.horn, p.x, p.y + .03, p.z);
    sp.rotation.x = u < .35 ? .2 : -.35;
  }
  // Staart
  const tailCurve = new THREE.CatmullRomCurve3([V(0, 1.0, -.9), V(0, .62, -1.35), V(.35, .26, -1.8), V(.95, .14, -2.0), V(1.45, .24, -1.8)]);
  const tail = new THREE.Group(); body.add(tail);
  P(tail, taperTube(tailCurve, 50, .26, .045), m.body);
  const blade = P(tail, new THREE.ConeGeometry(.14, .34, 3), m.horn, 1.58, .28, -1.7, 1, 1, .35); blade.rotation.z = -1.3;
  // Vleugels: vleermuisvleugels, of bij de kever twee dekschilden met zoemende vleugeltjes eronder.
  const wings = [];
  let buzz = [];
  if (wingType === 'beetle') {
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(.16 * s * bulk, 1.32, -.15); body.add(g);
      const shell = P(g, new THREE.SphereGeometry(.5, 28, 18, 0, Math.PI, 0, Math.PI), m.dark, 0, 0, 0, .55 * bulk, .45, 1.25);
      shell.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; shell.rotation.y = 0;
      wings.push(g);
      const bz = P(body, new THREE.SphereGeometry(.3, 16, 10), m.wing, .3 * s, 1.45, -.35, .1, .9, 1.4); bz.userData.noOutline = true;
      bz.material = toon(w.wing, { transparent: true, opacity: .55 });
      buzz.push(bz);
    }
  } else {
    const ws = new THREE.Shape();
    ws.moveTo(0, 0); ws.lineTo(.28, 1.15); ws.quadraticCurveTo(.85, 1.32, 1.6, 1.02);
    ws.quadraticCurveTo(1.32, .8, 1.42, .55); ws.quadraticCurveTo(1.1, .46, 1.12, .25); ws.quadraticCurveTo(.85, .2, .78, 0);
    ws.quadraticCurveTo(.5, .06, .42, -.12); ws.lineTo(0, 0);
    const bones = [[[0, 0], [.28, 1.15], .04], [[.28, 1.15], [1.6, 1.02], .032], [[.28, 1.15], [1.42, .55], .028], [[.28, 1.15], [1.12, .25], .028], [[.28, 1.15], [.78, 0], .024]];
    const ws2 = nHeads === 3 ? 1.1 : .85;
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(.22 * s * bulk, 1.32, .15); body.add(g);
      // Gespiegeld werkt de omtrek-kopie binnenstebuiten; daarom botten in plaats van een omtrek.
      const mesh = P(g, new THREE.ExtrudeGeometry(ws, { depth: .03, bevelEnabled: false }), m.memb); mesh.scale.set(s * ws2, ws2, ws2); mesh.userData.noOutline = true;
      for (const [a, b, r] of bones) {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const bone = P(mesh, new THREE.CylinderGeometry(r * .7, r, len, 8), m.body, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, .04);
        bone.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2; bone.userData.noOutline = true;
      }
      wings.push(g);
    }
  }
  // Klok op de borst (Timeoutdraak)
  const clk = clock ? clockFace() : null;
  if (clk) {
    const disc = P(body, new THREE.CylinderGeometry(.2, .2, .04, 32), m.horn, 0, 1.12, .78); disc.rotation.x = Math.PI / 2;
    const faceMesh = new THREE.Mesh(new THREE.CircleGeometry(.18, 32), new THREE.MeshBasicMaterial({ map: clk.tex, transparent: true }));
    faceMesh.position.set(0, 1.12, .805); body.add(faceMesh);
  }
  const A = {
    head: main.head, forehead: V(0, .14, .16), hornBase: s => V(.1 * s, .13, -.04),
    back: backPts, tail, tailTip: V(1.62, .3, -1.68), neck: body, neckPos: main.curve.getPointAt(.45), neckR: .19,
  };
  const trait = addTrait(world, A, P, m);
  const jawS = new S1(0), hit = new S1(0), lunge = new S1(0);
  const mouthOf = h => h.jaw.localToWorld(V(0, .03, .34));
  let clockT = 0;
  return {
    root, parts, flashMats: [m.body, m.dark, m.belly], height: 2.3 * size,
    mouth: () => mouthOf(main),
    lunge(x) { lunge.t = x; jawS.t = x * .5; },
    async breathe(scene, target, ms = 900) {
      jawS.t = 1;
      // Elke kop spuwt; bij drie koppen waaieren de stromen een beetje uit.
      if (!calm()) await Promise.all(headsArr.map((h, i) => flameStream(scene, () => mouthOf(h), target.clone().add(V((i === 1 ? -1 : i === 2 ? 1 : 0) * .25, 0, 0)), ms, 3 / headsArr.length)));
      jawS.t = 0;
    },
    hurt() { hit.vel += 9; },
    update(dt, t) {
      jawS.step(dt, 220, 16); hit.step(dt, 90, 9); lunge.step(dt, 140, 16);
      torso.scale.y = .74 + Math.sin(t * 1.4) * .02;
      body.rotation.x = -hit.v * .12 + lunge.v * .08;
      body.position.z = -hit.v * .12 + lunge.v * .15;
      headsArr.forEach(h => {
        h.jaw.rotation.x = Math.max(0, jawS.v) * .8;
        h.head.rotation.set(-hit.v * .35 + lunge.v * .15 - jawS.v * .15, h.head.userData.yaw + Math.sin(t * .6 + h.phase) * .15, Math.sin(t * .8 + h.phase) * .05);
      });
      if (wingType === 'beetle') {
        wings.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.z = -s * (.12 + Math.sin(t * 2) * .05 + hit.v * .2); });
        buzz.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * (.6 + Math.sin(t * 40) * .25); });
      } else {
        wings.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.y = s * (.65 + Math.sin(t * 1.5) * .18 - hit.v * .3); g.rotation.z = -s * (.25 + Math.sin(t * 1.5) * .1 + hit.v * .2); });
      }
      insectLegs.forEach((g, i) => { g.rotation.x = Math.sin(t * 6 + i * 2) * .15; });
      tail.rotation.y = Math.sin(t * .8) * .08;
      eyeMat.emissiveIntensity = .55 + Math.sin(t * 2.5) * .25;
      if (clk) { clockT += dt; if (clockT > .05) { clk.draw(t); clockT = 0; } }
      trait(t);
    },
  };
}

/** Welke bouw elke wereld krijgt: elke draak een eigen silhouet. */
const LOOKS = {
  1: () => slang(1),
  2: () => stoer(2, { wings: 'beetle', neck: .7, bulk: 1.2, legs6: true }),
  3: () => slang(3, { N: 22, thick: 1.45, coil: .72, crown: true }),
  4: () => stoer(4, { neck: 1.3, bulk: .82, clock: true }),
  5: () => slang(5, { N: 34, thick: .9, coil: 1.15, glitch: true }),
  6: () => stoer(6, { heads: 3, bulk: 1.25, size: 1.08 }),
};

/** De draak van een wereld, met de omtrek nog niet toegepast (dat doet de arena). @param {number} world */
export function makeDragon(world) {
  return (LOOKS[world] || LOOKS[1])();
}
