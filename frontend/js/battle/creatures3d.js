/* ---------- wezentjes voor de gevechten in een level (cartoon-3D) ----------
   Elk level van een wereld heeft een eigen wezentje; de kleuren komen deels uit de wereld (DRAGONS[w].colors).
   Een wezen kijkt naar +z, staat op y = 0 en geeft: root, parts (omtrek), flashMats (oplichten bij een treffer),
   height, shot (kleur van zijn aanval), mouth() (waar die vandaan komt), lunge(t) (aanvalshouding 0..1) en update(dt, t). */
import * as THREE from 'three';
import { toon } from '../stampy/bot3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Het wezentje per level (index 0..4). */
export const LEVEL_FOES = [
  { kind: 'bug', name: 'Syntax-bugje' },
  { kind: 'ghost', name: 'Typo-spook' },
  { kind: 'bug', name: 'Indent-kever', horn: true },
  { kind: 'ghost', name: 'None-spook', big: true },
  { kind: 'bug', name: 'Bug-baas', horn: true, crown: true, big: true },
];

/** Kleuren van een wereld (uit dragon.js); valt terug op blauw. @param {number} world */
function worldColors(world) {
  const d = typeof DRAGONS !== 'undefined' && DRAGONS[world - 1];
  return d && d.colors ? d.colors : { body: '#5B76F2', dark: '#3A50C8', belly: '#FFE6A8', wing: '#A9B8FF', horn: '#FFC93D', accent: '#FFC93D' };
}

function builder() {
  const parts = [];
  const P = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); parts.push(m); return m;
  };
  const white = toon('#FFFFFF'), black = toon('#131A2F');
  /** Oog met pupil en glimlichtje. */
  const eye = (parent, x, y, z, r, look = .7) => {
    const w = P(parent, new THREE.SphereGeometry(r, 24, 18), white, x, y, z);
    const pupil = P(w, new THREE.SphereGeometry(r * .52, 16, 12), black, 0, 0, r * look); pupil.userData.noOutline = true;
    P(pupil, new THREE.SphereGeometry(r * .16, 8, 6), white, r * .14, r * .16, r * .4).userData.noOutline = true;
    return w;
  };
  const crown = (parent, y, r) => {
    const gold = toon('#FFC93D', { side: THREE.DoubleSide });
    P(parent, new THREE.CylinderGeometry(r, r * .9, r * .5, 16, 1, true), gold, 0, y, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; P(parent, new THREE.ConeGeometry(r * .22, r * .5, 8), gold, Math.sin(a) * r * .9, y + r * .45, Math.cos(a) * r * .9); }
  };
  return { parts, P, eye, white, black, crown };
}

/** Kever: rood (level 1) of in de wereldkleur, met stippen, voelsprieten en zes pootjes. */
function bug(world, o) {
  const wc = worldColors(world);
  const shellCol = o.crown ? wc.dark : o.horn ? wc.body : '#FF5C7A';
  const m = { shell: toon(shellCol), dark: toon('#2A2F48'), spot: toon(o.horn ? wc.accent : '#FFC93D') };
  const { parts, P, eye, white, black, crown } = builder();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = P(body, new THREE.SphereGeometry(.5, 36, 26), m.shell, 0, .5, -.08, 1, .78, 1.12);
  P(body, new THREE.BoxGeometry(.035, .02, .95), black, 0, .89, -.08).userData.noOutline = true;
  for (const [x, z, r] of [[-.22, .1, .09], [.24, -.05, .1], [-.18, -.35, .07], [.2, -.4, .08], [-.05, .28, .06]]) {
    const y = .5 + .39 * Math.sqrt(Math.max(0, 1 - (x / .5) ** 2 - ((z + .08) / .56) ** 2));
    P(body, new THREE.SphereGeometry(r, 16, 12), m.spot, x, y - .01, z, 1, .45, 1).userData.noOutline = true;
  }
  const head = new THREE.Group(); head.position.set(0, .48, .5); body.add(head);
  P(head, new THREE.SphereGeometry(.3, 28, 20), m.dark, 0, 0, 0, 1, .86, .92);
  eye(head, -.13, .08, .2, .11); eye(head, .13, .08, .2, .11);
  for (const s of [-1, 1]) { const b = P(head, new THREE.BoxGeometry(.16, .04, .04), black, .13 * s, .22, .27); b.rotation.z = .45 * s; }
  const jaw = new THREE.Group(); jaw.position.set(0, -.12, .2); head.add(jaw);
  for (const s of [-1, 1]) { const f = P(jaw, new THREE.ConeGeometry(.04, .14, 10), white, .07 * s, -.04, .04); f.rotation.x = Math.PI; f.rotation.z = -.4 * s; }
  if (o.horn) { const h = P(head, new THREE.ConeGeometry(.08, .34, 12), m.spot, 0, .2, .2); h.rotation.x = .5; }
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(.1 * s, .2, 0); a.rotation.z = -.45 * s; head.add(a);
    P(a, new THREE.CylinderGeometry(.018, .018, .36, 8), black, 0, .18, 0);
    P(a, new THREE.SphereGeometry(.055, 14, 10), m.spot, 0, .38, 0);
    antennae.push(a);
  }
  if (o.crown) crown(body, .98, .16);
  const legs = [];
  for (const s of [-1, 1]) for (const z of [-.3, 0, .28]) {
    const g = new THREE.Group(); g.position.set(.4 * s, .32, z); g.rotation.z = .95 * s; body.add(g);
    P(g, new THREE.CapsuleGeometry(.045, .2, 6, 10), m.dark, 0, -.14, 0);
    legs.push(g);
  }
  return {
    root, parts, flashMats: [m.shell, m.dark], height: o.crown ? 1.25 : 1.05, shot: '#7CDB4A',
    mouth: () => head.localToWorld(V(0, -.05, .32)),
    lunge(t) { body.position.z = t * .5; body.rotation.x = t * .25; jaw.rotation.x = t * .5; },
    update(dt, t) {
      body.position.y = Math.abs(Math.sin(t * 5)) * .035;
      antennae.forEach((a, i) => { a.rotation.x = Math.sin(t * 6 + i * 2) * .3; });
      legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 11 + i) * .25; });
      shell.scale.y = .78 + Math.sin(t * 2.4) * .015;
    },
  };
}

/** Spook: zwevend, met een golvende zoom; paars (level 2) of in de vleugelkleur van de wereld. */
function ghost(world, o) {
  const wc = worldColors(world);
  const m = { body: toon(o.big ? wc.wing : '#B58CFF'), deep: toon(o.big ? wc.body : '#7B5CFF'), pink: toon('#FF8AD8') };
  const { parts, P, eye, black } = builder();
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = .35; root.add(body);
  const prof = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * .5, .55 + Math.cos(a) * .5)); }
  prof.push(new THREE.Vector2(.54, .2), new THREE.Vector2(.56, 0));
  const torso = P(body, new THREE.LatheGeometry(prof.reverse(), 40), m.body);
  const tails = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = P(body, new THREE.ConeGeometry(.11, .26, 12), m.body, Math.sin(a) * .47, -.1, Math.cos(a) * .47);
    c.rotation.x = Math.PI; tails.push(c);
  }
  const face = new THREE.Group(); face.position.set(0, .62, .38); body.add(face);
  eye(face, -.16, .06, .04, .13).scale.set(.9, 1.15, .7);
  eye(face, .16, .06, .04, .13).scale.set(.9, 1.15, .7);
  const mouth = P(face, new THREE.SphereGeometry(.09, 18, 12), black, 0, -.17, .08, 1.2, .8, .5);
  for (const s of [-1, 1]) P(face, new THREE.SphereGeometry(.06, 12, 8), m.pink, .29 * s, -.08, -.02, 1, .6, .4).userData.noOutline = true;
  const arms = [-1, 1].map(s => P(body, new THREE.SphereGeometry(.12, 16, 12), m.deep, .58 * s, .4, .05, .8, 1.2, .8));
  return {
    root, parts, flashMats: [m.body, m.deep], height: 1.45, shot: '#B58CFF',
    mouth: () => face.localToWorld(V(0, -.17, .15)),
    lunge(t) { body.position.z = t * .6; body.scale.setScalar(1 + t * .12); mouth.scale.set(1.2 + t * .6, .8 + t * 1.2, .5); },
    update(dt, t) {
      body.position.y = .35 + Math.sin(t * 2.2) * .09;
      body.rotation.z = Math.sin(t * 1.6) * .06;
      tails.forEach((c, i) => { c.position.y = -.1 + Math.sin(t * 4 + i) * .04; });
      arms.forEach((a, i) => { a.position.y = .4 + Math.sin(t * 3 + i * Math.PI) * .06; });
      torso.scale.set(1 + Math.sin(t * 2.2) * .02, 1 - Math.sin(t * 2.2) * .02, 1);
    },
  };
}

/**
 * Het wezentje van een level, met de omtrek nog niet toegepast (dat doet de arena).
 * @param {number} world @param {number} index level 0..4
 */
export function makeCreature(world, index) {
  const o = LEVEL_FOES[Math.max(0, Math.min(LEVEL_FOES.length - 1, index))];
  const c = o.kind === 'ghost' ? ghost(world, o) : bug(world, o);
  if (o.big) { c.root.scale.setScalar(1.15); c.height *= 1.15; }
  return { ...c, name: o.name };
}
