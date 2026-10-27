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
 * @property {string} [section]      Workbook-sectie, bijvoorbeeld "3.2"; koppelt de vraag aan een les.
 */

/**
 * @typedef {Object} Flashcard
 * @property {string} id
 * @property {string} front
 * @property {string} back
 * @property {string} [simple]
 * @property {number} [week]
 * @property {string} [section]
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
 * @property {Puzzle[]} puzzles       Puzzels voor de kaart (gaten invullen en code ordenen).
 * @property {{ id: string, title: string, kind?: string }[]} sections  Lessen van de week, uit de kennisbank.
 */

/**
 * Puzzel voor een level op de kaart.
 * - fill:    code met één gat ___ en de goedgekeurde antwoorden
 * - parsons: regels code die je in de goede volgorde zet
 * @typedef {Object} Puzzle
 * @property {string} id
 * @property {'fill' | 'parsons'} type
 * @property {string} question
 * @property {string} section
 * @property {string} simple
 * @property {string} [code]
 * @property {string[]} [answers]
 * @property {string[]} [lines]
 * @property {number} [week]
 */

const WEEKS = CONTENT;

/** Alle quizvragen van alle weken. @type {Question[]} */
const ALLQ = [];
/** Alle flashcards. @type {Flashcard[]} */
const ALLF = [];
/** Alle extra typvragen. @type {Question[]} */
const ALLT = [];
/** Alle puzzels voor de kaart. @type {Puzzle[]} */
const ALLP = [];

for (const w of WEEKS) {
  for (const q of w.questions) { q.week = w.week; ALLQ.push(q); }
  for (const c of w.flashcards) { c.week = w.week; ALLF.push(c); }
  for (const t of w.typing) { t.week = w.week; ALLT.push(t); }
  for (const p of w.puzzles || []) { p.week = w.week; ALLP.push(p); }
}

/** @param {number} week 0 = alle weken */
const weekOf = week => WEEKS[week - 1];
