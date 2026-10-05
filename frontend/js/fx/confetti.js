/* ---------- confetti ---------- */

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = /** @type {HTMLCanvasElement} */ ($('#confetti'));
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  const styles = getComputedStyle(document.documentElement);
  const colors = ['--w1', '--w2', '--w3', '--w4', '--w5', '--w6', '--gold'].map(v => styles.getPropertyValue(v).trim());

  const pieces = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 200,
    y: innerHeight * .35,
    vx: (Math.random() - .5) * 14,
    vy: -Math.random() * 13 - 4,
    size: Math.random() * 7 + 4,
    angle: Math.random() * 6,
    spin: (Math.random() - .5) * .4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let frame = 0;
  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.vy += .35;
      p.vx *= .99;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (++frame < 150) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}
