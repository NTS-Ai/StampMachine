/* ---------- flashcards ----------
   Kaarten die je nog niet kent komen eerst. 'Nog niet' legt de kaart drie plekken terug;
   de ronde is klaar als je elke kaart één keer als 'zit erin' hebt gemarkeerd. */

/**
 * @typedef {Object} CardSession
 * @property {number} week     0 = alle weken
 * @property {Flashcard[]} list  De stapel; de bovenste kaart is list[0].
 * @property {number} total
 * @property {number} done
 * @property {number} rated    Hoe vaak je in deze ronde een kaart beoordeelde.
 * @property {boolean} flipped
 */

/** @type {CardSession | null} */
let F = null;
/** Minimale veegafstand in pixels om een kaart te beoordelen. */
const SWIPE_MIN = 80;

/** @param {number} week */
function startCards(week) {
  const deck = week ? weekOf(week).flashcards : ALLF;
  const unknown = deck.filter(c => !S.fc[c.id]);
  const known = deck.filter(c => S.fc[c.id]);
  F = { week, list: shuffle(unknown).concat(shuffle(known)), total: deck.length, done: 0, rated: 0, flipped: false };
  $('#fcTag').textContent = 'Flashcards · ' + (week ? 'Week ' + week : 'alle weken');
  showScreen('cards');
  renderCard();
}

function renderCard() {
  if (!F.list.length) { finishCards(); return; }
  const c = F.list[0];
  F.flipped = false;
  $('#fc').classList.remove('flipped');
  $('#fcFoot').hidden = true;
  $('#fcWrap').style.setProperty('--hue', hue(c.week));
  $('#fcChip').textContent = 'Week ' + c.week + (S.fc[c.id] ? ' · kende je al' : '');
  $('#fcFront').innerHTML = fmt(c.front);
  $('#fcBack').innerHTML = fmt(c.back);
  $('#fcJip').hidden = !c.simple;
  $('#fcJip').innerHTML = c.simple ? '<span class="lbl">Simpel gezegd</span><br>' + fmt(c.simple) : '';
  $('#fcCount').textContent = F.done + ' / ' + F.total;
  $('#fcProg').style.width = (F.done / F.total * 100) + '%';
}

function flip() {
  if (!F) return;
  F.flipped = !F.flipped;
  $('#fc').classList.toggle('flipped', F.flipped);
  if (F.flipped) {
    $('#fcFoot').hidden = false;
    sfx('flip');
  }
}

/** @param {0 | 1} known 1 = zit erin, 0 = nog niet */
function rate(known) {
  if (!F || !F.flipped) return;
  const c = F.list.shift();
  F.rated++;
  if (known) {
    S.fc[c.id] = 1;
    F.done++;
    sfx('ok');
  } else {
    delete S.fc[c.id];
    F.list.splice(Math.min(3, F.list.length), 0, c);
    sfx('bad');
  }
  markPlayed();
  save();
  renderCard();
}

function finishCards() {
  const f = F;
  F = null;
  const xp = f.total * 5;
  S.xp += xp;
  save();
  renderHud();

  showResult({
    title: `Alle ${f.total} kaarten gestampt.`,
    sub: "Elke kaart heb je minstens één keer als 'zit erin' gemarkeerd.",
    stats: [
      { value: f.total, label: 'kaarten', tone: 'good' },
      { value: xp, label: 'XP verdiend', prefix: '+', tone: 'gold' },
    ],
    buttons: [
      { label: f.week ? 'Nu de quiz van week ' + f.week : 'Nu de eindbaas', primary: true, week: f.week, onClick: () => startGame(f.week ? 'quiz' : 'boss', f.week) },
      { label: 'Kaarten opnieuw', onClick: () => startCards(f.week) },
      { label: 'Naar overzicht', onClick: goHome },
    ],
  });
  sfx('win');
  confetti();
}

async function requestQuitCards() {
  if (!F) return;
  if (F.rated > 0) {
    const ok = await confirmDialog({
      title: 'Flashcards stoppen?',
      text: "Wat je al als 'zit erin' hebt gemarkeerd, blijft bewaard.",
      ok: 'Stoppen',
      cancel: 'Doorgaan',
    });
    if (!ok || !F) return;
  }
  F = null;
  goHome();
}

/** @param {KeyboardEvent} e */
function onCardsKey(e) {
  const onButton = /** @type {HTMLElement} */ (e.target).tagName === 'BUTTON';
  if ((e.key === ' ' || e.key === 'Enter') && !onButton) { e.preventDefault(); flip(); }
  else if (e.key === '1' || e.key === 'ArrowLeft') rate(0);
  else if (e.key === '2' || e.key === 'ArrowRight') rate(1);
  else if (e.key === 'Escape') { e.preventDefault(); requestQuitCards(); }
}

/* ---------- vegen op touchscreens: links = nog niet, rechts = zit erin ---------- */

/** @type {{ x: number, y: number, dx: number, active: boolean } | null} */
let drag = null;
/** Na een veeg komt er soms nog een klik; die mag de kaart niet omdraaien. */
let ignoreNextClick = false;

(function setupSwipe() {
  const card = $('#fc');
  const wrap = $('#fcWrap');

  card.addEventListener('pointerdown', e => {
    ignoreNextClick = false; // nieuwe aanraking: een eventuele oude veeg telt niet meer
    if (!F || !F.flipped || e.pointerType === 'mouse') return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, active: false };
    card.setPointerCapture(e.pointerId);
  });

  card.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      drag.active = true;
      wrap.classList.add('dragging');
    }
    drag.dx = dx;
    wrap.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
    wrap.classList.toggle('swipe-yes', dx >= SWIPE_MIN);
    wrap.classList.toggle('swipe-no', dx <= -SWIPE_MIN);
  });

  /** @param {boolean} commit */
  function endDrag(commit) {
    if (!drag) return;
    const { dx, active } = drag;
    drag = null;
    wrap.classList.remove('dragging', 'swipe-yes', 'swipe-no');
    wrap.style.transform = '';
    if (!active) return;
    ignoreNextClick = true;
    if (commit && Math.abs(dx) >= SWIPE_MIN) rate(dx > 0 ? 1 : 0);
  }

  card.addEventListener('pointerup', () => endDrag(true));
  card.addEventListener('pointercancel', () => endDrag(false));
  card.addEventListener('click', () => {
    if (ignoreNextClick) { ignoreNextClick = false; return; }
    flip();
  });
})();

$('#fcNo').addEventListener('click', () => rate(0));
$('#fcYes').addEventListener('click', () => rate(1));
$('#fcQuit').addEventListener('click', requestQuitCards);
