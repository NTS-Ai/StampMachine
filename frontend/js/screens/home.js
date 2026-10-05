/* ---------- startscherm: voortgang, weektickets en eindbaas ---------- */

/** Vragen uit quiz en typ-modus die je laatst fout had. */
const weakItems = () => ALLQ.concat(ALLT).filter(isWeak);

/** Aantal typvragen in een week: de typvragen uit de quiz plus de extra typvragen. @param {Week} w */
const typingCount = w => w.questions.filter(q => q.type === 'type').length + w.typing.length;

function renderHome() {
  renderHud();

  const total = mastery(ALLQ);
  const mastered = ALLQ.filter(q => box(q.id) >= 2).length;
  $('#totalPct').textContent = Math.round(total * 100) + '%';
  $('#totalBar').style.width = (total * 100) + '%';
  $('#totalSub').textContent = `${mastered} van ${ALLQ.length} vragen beheerst`;
  $('#clearedNotice').hidden = !progressWasCleared;

  const weak = weakItems();
  const weakBtn = /** @type {HTMLButtonElement} */ ($('#weakBtn'));
  weakBtn.disabled = !weak.length;
  weakBtn.textContent = weak.length ? `Herhaal mijn zwakke plekken (${weak.length})` : 'Nog geen zwakke plekken gevonden';

  $('#grid').innerHTML = WEEKS.map(weekTicket).join('') + bossTicket(total);
}

/** @param {Week} w */
function weekTicket(w) {
  const m = mastery(w.questions);
  const cardsKnown = w.flashcards.filter(c => S.fc[c.id]).length;
  const best = S.best['q' + w.week] || 0;
  const speed = S.best['s' + w.week] || 0;
  return `<article class="ticket" style="--hue:${hue(w.week)}">
    <div class="t-top"><span class="t-num">W${w.week}</span><span class="t-lvl">${esc(w.level)}</span></div>
    <h3>${esc(w.title)}</h3>
    <p class="t-topics">${esc(w.topics)}</p>
    <div class="mast">
      <div class="mast-row"><span>Gestampt</span><span>${Math.round(m * 100)}%</span></div>
      <div class="bar"><i style="width:${m * 100}%"></i></div>
      <div class="mast-row">
        <span>${w.questions.length} vragen · ${typingCount(w)} typ · ${cardsKnown}/${w.flashcards.length} kaarten</span>
        <span>record ${nl(best)} · speed ${nl(speed)}</span>
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
        <div class="mast-row"><span>Alles samen gestampt</span><span>${Math.round(total * 100)}% · record ${nl(best)} · ${wins}× gewonnen</span></div>
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
