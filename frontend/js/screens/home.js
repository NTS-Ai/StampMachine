/* ---------- startscherm: voortgang, weektickets en eindbaas ---------- */

/** Vragen uit quiz en typ-modus die je laatst fout had. */
const weakItems = () => ALLQ.concat(ALLT).filter(isWeak);

/** Aantal typvragen in een week: de typvragen uit de quiz plus de extra typvragen. @param {Week} w */
const typingCount = w => w.questions.filter(q => q.type === 'type').length + w.typing.length;

function renderHome() {
  renderHud();

  const total = mastery(ALLQ);
  const mastered = ALLQ.filter(q => box(q.id) >= 2).length;
  countUp($('#totalPct'), Math.round(total * 100), { format: n => n + '%' });
  $('#totalBar').style.width = (total * 100) + '%';
  $('#totalSub').textContent = `${mastered} van ${ALLQ.length} vragen beheerst`;
  $('#clearedNotice').hidden = !progressWasCleared;

  const weak = weakItems();
  const weakBtn = /** @type {HTMLButtonElement} */ ($('#weakBtn'));
  weakBtn.disabled = !weak.length;
  weakBtn.innerHTML = weak.length
    ? `${ICON_RETRY}<span>Herhaal mijn zwakke plekken <b>${weak.length}</b></span>`
    : `${ICON_CHECK}<span>Nog geen zwakke plekken gevonden</span>`;

  $('#grid').innerHTML = WEEKS.map(weekTicket).join('') + bossTicket(total);
  revealOnScroll($('#grid').querySelectorAll('.ticket'));
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const ICON_RETRY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
const ICON_QUIZ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>';
const ICON_KEYS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
const ICON_CARDS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>';
const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';

/** Kaarten komen pas binnen als ze in beeld scrollen, zodat je het effect ook echt ziet. */
const revealer = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      revealer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -40px 0px' })
  : null;

/** @param {NodeListOf<Element>} els */
function revealOnScroll(els) {
  for (const el of els) {
    if (revealer) { el.setAttribute('data-reveal', ''); revealer.observe(el); }
  }
}

/** @param {Week} w */
function weekTicket(w) {
  const m = mastery(w.questions);
  const cardsKnown = w.flashcards.filter(c => S.fc[c.id]).length;
  const best = S.best['q' + w.week] || 0;
  const speed = S.best['s' + w.week] || 0;
  return `<article class="ticket" style="--hue:${hue(w.week)};--i:${(w.week - 1) % 3}">
    <div class="t-top"><span class="t-num">W${w.week}</span><span class="t-lvl">${esc(w.level)}</span></div>
    <h3>${esc(w.title)}</h3>
    <p class="t-topics">${esc(w.topics)}</p>
    <div class="mast">
      <div class="mast-row"><span>Gestampt</span><span>${Math.round(m * 100)}%</span></div>
      <div class="bar"><i style="width:${m * 100}%"></i></div>
      <div class="t-stats">
        <span title="Quizvragen">${ICON_QUIZ}${w.questions.length} vragen</span>
        <span title="Typvragen">${ICON_KEYS}${typingCount(w)} typ</span>
        <span title="Flashcards die erin zitten">${ICON_CARDS}${cardsKnown}/${w.flashcards.length} kaarten</span>
        ${best || speed ? `<span class="t-rec" title="Je beste scores">${ICON_TROPHY}${best ? 'quiz ' + nl(best) : ''}${best && speed ? ' · ' : ''}${speed ? 'speed ' + nl(speed) : ''}</span>` : ''}
      </div>
    </div>
    <div class="t-btns">
      <button class="btn primary" data-go="quiz" data-week="${w.week}" type="button">Quiz</button>
      <button class="btn" data-go="cards" data-week="${w.week}" type="button">Flashcards</button>
      <button class="btn" data-go="speed" data-week="${w.week}" type="button">Speedrun</button>
      <button class="btn" data-go="type" data-week="${w.week}" type="button">Typen</button>
    </div>
  </article>`;
}

/** @param {number} total Totale beheersing van 0 tot 1. */
function bossTicket(total) {
  const best = S.best.boss || 0;
  const wins = S.best.bossWins || 0;
  return `<article class="ticket boss">
    <div>
      <div class="t-top" style="justify-content:flex-start;gap:14px"><span class="t-lvl">Eindbaas · alle 6 weken</span></div>
      <h3>Pager om 03:00</h3>
      <p>Productie ligt eruit en de vragen komen uit alle zes weken door elkaar. Je hebt drie levens en 20 seconden per vraag. Sla 25 keer raak om het incident te sluiten; vijf goed op rij doet dubbele schade.</p>
      <div class="mast" style="margin-top:12px;max-width:420px">
        <div class="mast-row"><span>Alles samen gestampt</span><span>${Math.round(total * 100)}%${best ? ' · record ' + nl(best) : ''}${wins ? ` · ${wins}× gewonnen` : ''}</span></div>
        <div class="bar" style="--hue:var(--bad)"><i style="width:${total * 100}%"></i></div>
      </div>
      <div class="t-btns" style="margin-top:14px">
        <button class="btn primary lg" data-go="boss" data-week="0" type="button">Neem de pager op</button>
        <button class="btn" data-go="cards" data-week="0" type="button">Alle flashcards</button>
        <button class="btn" data-go="speed" data-week="0" type="button">Speedrun alles</button>
        <button class="btn" data-go="type" data-week="0" type="button">Typen alles</button>
      </div>
    </div>
    <div class="pager" aria-hidden="true">03:00</div>
  </article>`;
}

function goHome() {
  renderHome();
  showScreen('home');
}

$('#grid').addEventListener('click', e => {
  const btn = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-go]'));
  if (!btn) return;
  const week = Number(btn.dataset.week);
  const mode = /** @type {GameMode | 'cards'} */ (btn.dataset.go);
  if (mode === 'cards') startCards(week);
  else startGame(mode, week);
});

$('#weakBtn').addEventListener('click', () => {
  const weak = weakItems();
  if (weak.length) startGame('retry', 0, shuffle(weak).slice(0, 15));
});

$('#resetBtn').addEventListener('click', async () => {
  const ok = await confirmDialog({
    title: 'Voortgang wissen?',
    text: 'Je XP, records, dagen op rij en wat je al beheerst worden uit deze browser verwijderd. Dit kun je niet ongedaan maken.',
    ok: 'Wissen',
    cancel: 'Annuleren',
    danger: true,
  });
  if (!ok) return;
  resetProgress();
  progressWasCleared = false;
  renderHome();
});
