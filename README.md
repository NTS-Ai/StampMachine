# NTS Stampmachine

Leergame voor het Fayora AI-workbook "Python for Software & AI Engineering" (6 weken).

Speel online via GitHub Pages: **https://nts-ai.github.io/StampMachine/**

Lokaal draaien: start een webserver in de map `frontend/` en open http://localhost:8000:

```
cd frontend
python -m http.server
```

Er is geen build-stap en er zijn geen dependencies. Een webserver is wel nodig: de kennisbank laadt zijn inhoud als JSON, en dat werkt niet als je `index.html` als los bestand opent.

## Wat erin zit

- 228 quizvragen, 60 extra typvragen en 112 flashcards, verdeeld over de zes weken.
- Per week vier modi:
  - **Quiz**: 12 vragen; foute antwoorden komen aan het eind terug.
  - **Flashcards**: op een touchscreen kun je vegen, links voor "nog niet" en rechts voor "zit erin".
  - **Speedrun**: 60 seconden.
  - **Typen**: 10 vragen waarop je het antwoord zelf typt (zie hieronder).
- **Pager om 03:00**: een eindbaas met vragen uit alle weken, drie levens en 20 seconden per vraag.
- Bij elke vraag een uitleg **Simpel gezegd**, per fout antwoord waarom het niet klopt, en de technische uitleg uit het workbook.
- XP, levels, combo's, records en een teller voor dagen op rij.
- Een themaknop met drie standen: Systeem, Licht en Donker.
- Een bevestiging als je midden in een ronde stopt. De klok staat stil zolang die vraag open staat.

### Kennisbank

Een tweede tabblad naast **Oefenen**, opgezet zoals W3Schools: links een zijbalk met alle onderwerpen, in het midden de les, rechts "Op deze pagina".

- **35 lessen**: 1.1 t/m 6.5 en de eindopdracht van elke week. Per les:
  - uitleg in gewone taal en een blok **Simpel gezegd**;
  - codevoorbeelden met kleuring en een kopieerknop;
  - tabellen en de kernpunten;
  - links naar W3Schools en de documentatie;
  - knoppen om precies die les te oefenen, met vragen of flashcards.
- **Probeer het zelf**: 86 Python-voorbeelden draaien echt in je browser (Pyodide, in een Web Worker). Je kunt de code aanpassen en opnieuw uitvoeren. Na 8 seconden stopt een run, zodat een oneindige lus de pagina niet bevriest. Python (ongeveer 10 MB) wordt pas geladen als je op de knop drukt.
- **Naslag**: 88 opzoektabellen, zoals string-methodes, Git- en Docker-commando's, de uitvoervolgorde van SQL, HTTP-statuscodes en de RAG-pijplijn.
- **Begrippen A–Z**: 261 begrippen. Elk begrip krijgt één zin uitleg en een uitleg in gewone taal, met een link naar de les.
- **Inleverlijsten** bij de eindopdrachten, om af te vinken. Ze worden alleen in je browser bewaard, onder `nts-kb-checks`.
- **Zoeken** (`/` of Ctrl+K) vindt ook lessen, naslag en begrippen.
- Elke vraag en flashcard is gekoppeld aan een les. In de feedback staat daarom een link **Lees de les hierover**.
- Directe links werken ook: `#/kennis/3.2`, `#/kennis/naslag/sql` en `#/kennis/begrippen`.
- Op de telefoon staan Oefenen, Zoeken en Kennisbank in een tabbalk onderaan, en de zijbalk wordt een lade.

De inhoud is in eigen woorden geschreven op basis van het workbook; er zijn geen passages letterlijk overgenomen.

### Typvragen

Er zijn twee soorten:

- **Kort antwoord** (`"type": "type"`): een commando, functienaam of begrip. De app kijkt zelf na.
  - Hoofdletters, spaties, aanhalingstekens en een `$` vooraan tellen niet mee.
  - Bij antwoorden van 6 tekens of meer mag er één typfout in zitten. Met `"exact": true` zet je dat uit, bijvoorbeeld bij `json.loads` tegenover `json.load`.
- **Korte zin** (`"type": "sentence"`): je schrijft een uitleg in een paar zinnen. Daarna toont de app het modelantwoord en de punten die erin horen, en beoordeel je jezelf met *Fout*, *Bijna* of *Goed*.
  - *Bijna* geeft 50 punten en laat het bakje van de vraag staan.

## Voortgang en privacy

- De voortgang staat alleen in de `localStorage` van je eigen browser, onder de sleutel `fayora-stamp-v1`. Er is geen server en geen database.
- Speel je 30 dagen niet, dan wordt de voortgang bij het volgende bezoek automatisch gewist. Op het startscherm staat ook een knop **Wis mijn voortgang**.
- Van de dagen op rij bewaart de app alleen het aantal en de laatste speeldag, geen lijst met datums.
- Je themakeuze staat apart onder `nts-stamp-theme` en wordt niet gewist met je voortgang.

## Hoe het werkt

Elke vraag zit in een bakje van 0 tot 3:

- Goed beantwoord gaat hij één bakje omhoog. Fout gaat hij terug naar 0. *Bijna* laat het bakje staan.
- De app kiest vooral vragen uit lage bakjes, met wat toeval erbij.
- Een vraag telt als "beheerst" vanaf bakje 2.
- Vragen in bakje 0 verschijnen onder **Herhaal mijn zwakke plekken**.

Punten en levels:

- Per goed antwoord krijg je 100 punten.
- In de quiz en bij de eindbaas komt daar een snelheidsbonus van maximaal 50 punten bij.
- Een combo vermenigvuldigt de punten: ×2 vanaf 3 goed op rij, ×3 vanaf 6 en ×4 vanaf 10.
- Je XP is je score gedeeld door 10. Elke 400 XP is een level.

## Mappen

```
content/            Bron van alle inhoud: één JSON-bestand per week
tools/              build_content.py maakt de data voor de frontend
frontend/           Alles wat de browser laadt (dit wordt gepubliceerd)
  index.html
  favicon.svg
  jsconfig.json     Typecontrole in VS Code via JSDoc
  css/
    base.css        Kleuren, lettertypes, reset en hulpklassen
    layout.css      HUD, startscherm, speelscherm
    components.css  Knoppen, tickets, vraagkaart, feedback, flashcards, dialoog
    kb.css          Kennisbank: tabbladen, zijbalk, lessen, codeblokken, tabellen
  data/kb/          Kennisbank-inhoud (wordt pas geladen als je hem opent)
    lessons/w1-6.json  Lessen per week
    reference.json  Naslag-tabellen
    glossary.json   Begrippen A–Z
  js/
    theme.js        Thema, geladen in <head> zodat er geen flits is
    data/content.js Gegenereerd uit content/: niet met de hand aanpassen
    core/           utils.js · content.js (types en indexen) · state.js (voortgang)
    fx/             sound.js · confetti.js
    ui/             dialog.js (bevestiging) · hud.js (level, thema, geluid)
    screens/        results.js · home.js · game.js · cards.js · search.js
    kb/             kb.js (routing en pagina's) · highlight.js (codekleuring) · py-worker.js (Python)
    main.js         Sneltoetsen en opstarten
tests/              Unit tests (Node, geen dependencies)
.github/workflows/  pages.yml publiceert frontend/ op GitHub Pages
```

## Testen

```
node --test tests/*.test.mjs          # unit tests: inhoud, nakijken, bakjes, reeksen, zoeken, kennisbank
python tools/build_content.py --check  # inhoud geldig en content.js up-to-date
```

De unit tests laden de echte frontend-scripts in Node met een nagebootste DOM. Ze controleren onder meer:

- dat elke id uniek is;
- dat elk goedgekeurd typ-antwoord ook echt goed wordt gerekend;
- dat oude opslag (met een lijst speeldagen) netjes wordt omgezet;
- dat elke vraag naar een bestaande les verwijst;
- dat de kennisbank-data compleet en geldig is;
- dat de codekleuring nooit HTML doorlaat en elk codeblok letter voor letter intact laat.

De scripts in `frontend/index.html` worden in een vaste volgorde geladen en delen hun globale variabelen. Houd die volgorde aan als je een bestand toevoegt.

## Vragen aanpassen of toevoegen

1. Pas het weekbestand aan in `content/`, bijvoorbeeld `content/w3.json`:
   - `questions` is voor de quiz, de speedrun en de eindbaas.
   - `typing` bevat de extra typvragen.
   - `flashcards` bevat de kaarten.
2. Geef elke nieuwe vraag een eigen, nieuwe `id`. Verander nooit een bestaande id: de voortgang van spelers hangt eraan.
3. Draai:

   ```
   python tools/build_content.py
   ```

   Het script controleert alle vragen en schrijft `frontend/js/data/content.js` opnieuw. Bij een fout noemt het het bestand en de id.

Elke vraag en flashcard heeft ook een `section`: de workbook-sectie waar hij bij hoort, zoals `"3.2"` of `"3.A"` voor de eindopdracht. Daarmee werken de knop **Oefen deze les** en de link **Lees de les hierover**. De sectie moet bij dezelfde week horen.

Velden per soort vraag:

| `type`      | Verplicht                                  | Optioneel                    |
|-------------|--------------------------------------------|------------------------------|
| `choice`    | `question`, `correct`, `wrong`, `explanation` | `code`, `simple`, `why_wrong` |
| `truefalse` | `question`, `answer`, `explanation`        | `code`, `simple`             |
| `type`      | `question`, `answers`, `explanation`       | `code`, `simple`, `exact`    |
| `sentence`  | `question`, `model`, `points`              | `code`                       |

`why_wrong` geeft per fout antwoord uit `wrong`, in dezelfde volgorde, uitleg waarom het niet klopt.

## Kennisbank aanpassen

De lessen staan in `frontend/data/kb/lessons/w<N>.json`. Na een wijziging draai je `node --test tests/*.test.mjs`; de tests controleren de data.

Velden per les:

| Veld | Wat |
|------|-----|
| `id`, `title`, `summary`, `simple` | Sectienummer (`"3.2"`), titel, één zin samenvatting en de uitleg "Simpel gezegd" |
| `blocks` | De les zelf, in volgorde. Typen: `h` (kopje), `p` (alinea), `code`, `table`, `list` en `note` |
| `takeaways` | Kernpunten onder "Onthoud" |
| `links` | `{ "label", "url" }`, alleen https |
| `minutes`, `exercise`, `tags` | Optioneel |
| `kind`, `checklist` | Bij een eindopdracht: `"assessment"` en de punten om af te vinken |

Velden per bloktype:

| Bloktype | Velden |
|----------|--------|
| `code` | `lang` (`python`, `bash`, `sql`, `json`, `yaml`, `toml`, `dockerfile`, `ini`, `text` of `http`), `code`, en optioneel `output` en `caption` |
| `table` | `head` en `rows` (elke rij evenveel cellen als `head`) |
| `list` | `items` en optioneel `ordered` |
| `note` | `tone` (`tip`, `info` of `warn`) en `text` |

Zet `"run": true` alleen bij Python-code die zelfstandig draait met de standaardbibliotheek: geen bestanden van buiten, geen netwerk, geen `input()` en geen pip-pakketten.

In alle tekstvelden mag je `` `code` `` en `**vet**` gebruiken. Andere opmaak of HTML wordt niet uitgevoerd: alles wordt ge-escaped.

## Typecontrole

De JavaScript heeft JSDoc-commentaren. Met `frontend/jsconfig.json` controleert VS Code daarmee automatisch de typen. Er is geen TypeScript-build nodig. Wil je het zelf draaien:

```
npx -p typescript tsc -p frontend/jsconfig.json
```

## GitHub Pages

De workflow `.github/workflows/pages.yml` publiceert de map `frontend/` bij elke push naar `main`. Vooraf doet hij twee controles:

- met `build_content.py --check` of `content.js` klopt met `content/`;
- of alle unit tests slagen.

Faalt er een van de twee, dan gaat er niets online.

Dit moet je één keer instellen: ga op GitHub naar **Settings → Pages** en kies bij **Source** voor **GitHub Actions**.
