/* ---------- gevechts-arena in cartoon-3D ----------
   Een stukje eiland in de kleuren van de wereld (ISLANDS uit map.js), met Stampy links en de tegenstander rechts:
   een wezentje in een level (creatures3d.js) of de draak als eindbaas (dragons3d.js).
   Module (three.js); hangt zich aan window.Arena3D en stuurt 'arena3d:ready'. level.js en boss.js blijven de baas
   over de vragen en de score; de arena laat alleen zien wat er gebeurt. Lukt WebGL niet, dan geeft create() null
   en blijven die schermen zoals ze waren. */
import * as THREE from 'three';
import { build, rig, outline, toon, shadowBlob, loop, calm } from '../stampy/bot3d.js';
import { makeCreature } from './creatures3d.js';
import { makeDragon } from './dragons3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- tijd en effecten ---------- */

const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), lin: t => t };
/** Een tween op requestAnimationFrame; fn krijgt de gebogen voortgang en de rauwe 0..1. */
function tween(ms, fn, e = ease.out) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => { const r = Math.min(1, (now - t0) / ms); fn(e(r), r); if (r < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/** Een projectiel in een boog; het mesh wordt na afloop weggehaald. */
async function shoot(scene, mesh, a, b, ms, arc) {
  scene.add(mesh);
  await tween(ms, (_, r) => { mesh.position.lerpVectors(a, b, r); mesh.position.y += Math.sin(r * Math.PI) * arc; mesh.rotation.z += .25; mesh.rotation.x += .15; }, ease.lin);
  scene.remove(mesh); mesh.geometry.dispose();
}

/** Een wolkje bolletjes (sterren bij een treffer). */
function burst(scene, at, color, n = 12, size = .05, spread = .8) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true }), geo = new THREE.SphereGeometry(size, 10, 8), bits = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat); m.position.copy(at);
    const a = Math.random() * Math.PI * 2, r = (.4 + Math.random() * .6) * spread;
    m.userData.v = V(Math.cos(a) * r, .3 + Math.random() * .4, Math.sin(a) * r * .6);
    scene.add(m); bits.push(m);
  }
  return tween(520, (_, r) => {
    for (const m of bits) { m.position.addScaledVector(m.userData.v, .03); m.userData.v.y -= .05; m.scale.setScalar(1 - r * .8); }
    mat.opacity = 1 - r;
  }, ease.lin).then(() => { bits.forEach(m => scene.remove(m)); geo.dispose(); mat.dispose(); });
}

/** Even wit oplichten. */
function flash(mats, ms = 180) {
  for (const m of mats) { m.userData.e0 ??= m.emissiveIntensity; m.userData.c0 ??= m.emissive.getHex(); m.emissive.set('#ffffff'); m.emissiveIntensity = .9; }
  setTimeout(() => { for (const m of mats) { m.emissive.setHex(m.userData.c0); m.emissiveIntensity = m.userData.e0; } }, ms);
}

/* ---------- het eiland ---------- */

/** Een stukje eiland van 5 bij 3 blokjes, met bomen en een pad; kleuren van de wereld. @param {number} world */
function island(world) {
  const look = typeof ISLANDS !== 'undefined' && ISLANDS[world - 1];
  const tops = (look ? look.tops : ['#7BD88F', '#6BCB80', '#5CC28A']).slice(0, 3).map(c => toon(c));
  const left = toon(look ? look.left[0] : '#7A5A8E'), right = toon(look ? look.right[0] : '#5F4473'), under = toon(look ? look.right[1] : '#553A66');
  const g = new THREE.Group(), blocks = [];
  const H = [[.5, .5, .4, .4, .5], [.6, .4, .4, .4, .6], [.5, .5, .4, .5, .7]];
  H.forEach((row, z) => row.forEach((h, x) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, h + .6, 1), [right, left, tops[(x + z) % 3], under, left, right]);
    b.position.set(x - 2, (h - .6) / 2 - .2, z - 1); g.add(b); blocks.push(b);
  }));
  outline(blocks, .02);
  const dash = toon('#FFFFFF');
  for (let i = -1.2; i <= 1.21; i += .3) { const d = new THREE.Mesh(new THREE.BoxGeometry(.12, .02, .06), dash); d.position.set(i, .21, .05); g.add(d); }
  const trees = [];
  for (const [x, z, s] of [[-2.1, -1.1, 1], [2.2, -1.2, .8], [2.1, 1.1, .7], [-2.15, 1.05, .6]]) {
    const t = new THREE.Group(); t.position.set(x, .2, z); t.scale.setScalar(s);
    const parts = [new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .4, 10), toon('#7A4E2E'))]; parts[0].position.y = .2;
    for (const [dx, dy, r, c] of [[0, .62, .3, '#1F8F6A'], [-.15, .5, .2, '#26A97A'], [.12, .8, .16, '#3CC48F']]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), toon(c)); b.position.set(dx, dy, 0); parts.push(b); }
    parts.forEach(p => t.add(p)); outline(parts, .02);
    g.add(t); trees.push(t);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), toon(look ? look.water[0] : '#3FA7E8'));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.3;
  return { g, water, trees };
}

/* ---------- arena ---------- */

/**
 * Zet een gevechts-arena in host. Geeft null als WebGL niet lukt.
 * @param {HTMLElement} host
 * @param {{ world: number, level?: number, boss?: boolean, hp?: number, hud?: boolean }} o
 *   level = index van het level (wezentje), boss = de draak van de wereld, hud = naam en HP-blokjes tonen
 */
function create(host, { world, level = 0, boss = false, hp = 8, hud = true }) {
  let renderer;
  const canvas = document.createElement('canvas');
  canvas.className = 'arena3d';
  canvas.setAttribute('aria-hidden', 'true');
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  host.appendChild(canvas);
  const fx = document.createElement('div'); fx.className = 'arena-fx'; host.appendChild(fx);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#7C8CC8', 1.7));
  const key = new THREE.DirectionalLight('#ffffff', 2.3); key.position.set(3, 6, 4); scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, 2, .1, 80);
  const isle = island(world);
  scene.add(isle.g); scene.add(isle.water);

  // Stampy
  const s = build(), r = rig(s);
  const me = s.root; me.scale.setScalar(.62); me.position.set(-1.35, .2, .1); me.rotation.y = .9; isle.g.add(me);
  const meBase = me.position.clone();
  // Tegenstander
  const foe = boss ? makeDragon(world) : makeCreature(world, level);
  outline(foe.parts);
  const fr = foe.root;
  const scale = boss ? 1.45 / (foe.height || 2.4) : .72;
  fr.scale.multiplyScalar(scale); fr.position.set(1.35, .2, -.05); fr.rotation.y = -.9; isle.g.add(fr);
  fr.add(shadowBlob(boss ? 1.6 : 1.1, boss ? 1 : .7));
  const frBase = fr.position.clone(), frScale = fr.scale.x;
  const foeTop = (foe.height || 1.3) * scale;
  const dragonInfo = boss && typeof DRAGONS !== 'undefined' ? DRAGONS[world - 1] : null;
  const name = dragonInfo ? dragonInfo.name : foe.name || '';

  // Naam en HP-blokjes boven de tegenstander
  let hpMax = hp, hpNow = hp;
  const tag = hud ? document.createElement('div') : null;
  if (tag) {
    tag.className = 'arena-tag';
    tag.innerHTML = '<b></b><span class="arena-pips"></span>';
    /** @type {HTMLElement} */ (tag.firstElementChild).textContent = name;
    host.appendChild(tag);
  }
  const paintHp = () => { if (tag) tag.querySelector('.arena-pips').innerHTML = Array.from({ length: hpMax }, (_, i) => `<i class="${i < hpNow ? '' : 'off'}"></i>`).join(''); };
  paintHp();

  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // Breed genoeg om beide vechters te zien, ook op een smal scherm.
    camera.fov = Math.min(60, Math.max(28, 2 * Math.atan(Math.tan((46 * Math.PI) / 360) / camera.aspect) * 180 / Math.PI));
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit); ro.observe(host); fit();

  const v = new THREE.Vector3();
  const toScreen = p => { const q = p.clone().project(camera); return { x: (q.x + 1) / 2 * host.clientWidth, y: (1 - q.y) / 2 * host.clientHeight }; };
  let t = 0, orbit = 0;
  const stop = loop(canvas, dt => {
    t += dt;
    if (!calm()) orbit = Math.sin(t * .25) * .12;
    // Bij de draak staat het eiland lager in beeld: bovenin is plek voor de tekstballonnen.
    camera.position.set(Math.sin(orbit) * 6.4, boss ? 3.2 : 3.6, Math.cos(orbit) * 6.4);
    camera.lookAt(0, boss ? 1.05 : .55, 0);
    r.update(dt, .45, -.25);
    foe.update(dt, t);
    isle.trees.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.5 + i) * .03; });
    renderer.render(scene, camera);
    if (tag) { const p = toScreen(fr.getWorldPosition(v).add(V(0, foeTop + .12, 0))); tag.style.left = p.x + 'px'; tag.style.top = p.y + 'px'; }
  });

  const pop = (obj, y, text, cls = '') => {
    const p = toScreen(obj.getWorldPosition(new THREE.Vector3()).add(V(0, y, 0)));
    const d = document.createElement('b'); d.className = 'arena-pop ' + cls; d.textContent = text;
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; fx.appendChild(d);
    setTimeout(() => d.remove(), 950);
  };
  let dead = false;

  return {
    /** Een handvat dat zich gedraagt als het 3D-deel van een Bot (zie Bot.v3 in bot.js). */
    stampy: { canvas, set: r.set, anim: r.anim, stage: r.stage, destroy() {} },
    name,
    /** HP van de tegenstander (blokjes boven zijn kop). @param {number} now @param {number} [max] */
    setHp(now, max = hpMax) { hpNow = Math.max(0, now); hpMax = max; paintHp(); },
    /** Stampy valt aan: hij gooit zijn stempel, de tegenstander licht op en deinst terug. @param {number} dmg @param {boolean} combo */
    async attack(dmg, combo) {
      if (dead) return;
      r.set(combo ? 'cheer' : 'happy'); r.anim('hop');
      const to = fr.getWorldPosition(new THREE.Vector3()).add(V(0, foeTop * .5, 0));
      if (!calm()) {
        const stamp = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .05, 24), new THREE.MeshBasicMaterial({ color: '#FFC93D' }));
        await shoot(scene, stamp, s.head.getWorldPosition(new THREE.Vector3()).add(V(.2, .2, 0)), to, 380, .9);
      }
      flash(foe.flashMats);
      if (foe.hurt) foe.hurt();
      pop(fr, foeTop * .75, `-${dmg}`, combo ? 'gold' : '');
      if (!calm()) {
        burst(scene, to, '#FFD84A', 14);
        await tween(300, (_, k) => { fr.position.x = frBase.x + Math.sin(k * 28) * .07 * (1 - k); }, ease.lin);
      }
    },
    /** De tegenstander valt aan (draak: vuur), Stampy wordt geraakt. */
    async foeAttack() {
      if (dead) return;
      const to = me.getWorldPosition(new THREE.Vector3()).add(V(0, .55, 0));
      if (foe.breathe) {
        foe.lunge(.6); if (!calm()) await wait(220);
        await foe.breathe(scene, to, 800);
      } else if (!calm()) {
        await tween(220, e => foe.lunge(e));
        const ball = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 10), new THREE.MeshBasicMaterial({ color: foe.shot || '#B58CFF' }));
        await shoot(scene, ball, foe.mouth(), to, 380, .7);
      }
      flash([s.mats.shell, s.mats.accent]);
      r.set('sad'); r.anim('droop');
      pop(me, 1.5, '-1', 'bad');
      if (!calm()) {
        burst(scene, to, foe.shot || '#FF7A2E', 12);
        await tween(300, (_, k) => { me.position.x = meBase.x - Math.sin(k * Math.PI) * .2; }, ease.out);
      }
      foe.lunge(0);
      me.position.copy(meBase);
    },
    /** De laatste klap: de tegenstander gaat neer en zakt weg. */
    async faint() {
      if (dead) return;
      dead = true;
      hpNow = 0; paintHp();
      r.set('cheer');
      if (!calm()) {
        burst(scene, fr.getWorldPosition(new THREE.Vector3()).add(V(0, foeTop * .4, 0)), '#FFFFFF', 20, .05, 1);
        await tween(650, e => { fr.position.y = frBase.y - e * .8; fr.rotation.z = -e * .5; fr.scale.setScalar(frScale * (1 - e * .6)); }, ease.inOut);
      }
      fr.visible = false;
      if (tag) tag.hidden = true;
    },
    /** De tegenstander wint (jij bent je levens kwijt): hij springt van blijdschap. */
    gloat() { if (!dead && !calm()) tween(600, (_, k) => { fr.position.y = frBase.y + Math.abs(Math.sin(k * Math.PI * 2)) * .25; }, ease.lin); },
    destroy() {
      stop(); ro.disconnect();
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose(); host.innerHTML = '';
    },
  };
}

window.Arena3D = { create };
dispatchEvent(new Event('arena3d:ready'));
