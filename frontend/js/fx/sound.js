/* ---------- geluid ----------
   Korte piepjes met de Web Audio API; er worden geen geluidsbestanden geladen. */

/** @type {AudioContext | null} */
let audio = null;

/**
 * Speelt één toon.
 * @param {number} freq   Hz
 * @param {number} start  Starttijd in de AudioContext
 * @param {number} dur    Duur in seconden
 * @param {OscillatorType} [type]
 * @param {number} [vol]
 */
function tone(freq, start, dur, type = 'sine', vol = .07) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + dur + .02);
}

/** @param {'ok' | 'bad' | 'combo' | 'win' | 'flip' | 'lose'} kind */
function sfx(kind) {
  if (!S.sound) return;
  try {
    audio = audio || new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
    const t = audio.currentTime;
    switch (kind) {
      case 'ok': tone(660, t, .09); tone(990, t + .07, .13); break;
      case 'bad': tone(170, t, .25, 'sawtooth', .045); break;
      case 'combo': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .055, .12, 'triangle', .06)); break;
      case 'win': [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .1, .18, 'triangle', .07)); break;
      case 'flip': tone(420, t, .05, 'triangle', .04); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * .14, .2, 'sawtooth', .04)); break;
    }
  } catch (e) { /* geen audio beschikbaar: stil doorgaan */ }
}
