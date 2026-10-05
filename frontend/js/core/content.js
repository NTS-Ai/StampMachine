/* ---------- inhoud: types en indexen ----------
   De vragen zelf staan in js/data/content.js, gegenereerd uit content/w*.json. */

/**
 * Eén vraag. Welke velden gevuld zijn, hangt af van `type`:
 * - choice:    correct + wrong (+ why_wrong per fout antwoord)
 * - truefalse: answer
 * - type:      answers (alle goedgekeurde schrijfwijzen), optioneel exact
 * - sentence:  model + points (de speler beoordeelt zichzelf)
 * @typedef {Object} Question
 * @property {string} id
 * @property {'choice' | 'truefalse' | 'type' | 'sentence'} type
 * @property {string} question
 * @property {string} [code]
 * @property {string} [correct]
 * @property {string[]} [wrong]
 * @property {string[]} [why_wrong]
 * @property {boolean} [answer]
 * @property {string[]} [answers]
 * @property {boolean} [exact]       Geen typfouten toestaan, ook niet bij lange antwoorden.
 * @property {string} [model]
 * @property {string[]} [points]
 * @property {string} [explanation]  Technische uitleg.
 * @property {string} [simple]       Uitleg in gewone taal ("Simpel gezegd").
 * @property {number} [week]         Wordt hieronder ingevuld.
 */

/**
 * @typedef {Object} Flashcard
 * @property {string} id
 * @property {string} front
 * @property {string} back
 * @property {string} [simple]
 * @property {number} [week]
 */

/**
 * @typedef {Object} Week
 * @property {number} week
 * @property {string} level
 * @property {string} title
 * @property {string} topics
 * @property {Question[]} questions   Quiz, speedrun en eindbaas.
 * @property {Flashcard[]} flashcards
 * @property {Question[]} typing      Alleen voor de typ-modus.
 */

const WEEKS = CONTENT;

/** Alle quizvragen van alle weken. @type {Question[]} */
const ALLQ = [];
/** Alle flashcards. @type {Flashcard[]} */
const ALLF = [];
/** Alle extra typvragen. @type {Question[]} */
const ALLT = [];

for (const w of WEEKS) {
  for (const q of w.questions) { q.week = w.week; ALLQ.push(q); }
  for (const c of w.flashcards) { c.week = w.week; ALLF.push(c); }
  for (const t of w.typing) { t.week = w.week; ALLT.push(t); }
}

/** @param {number} week 0 = alle weken */
const weekOf = week => WEEKS[week - 1];
