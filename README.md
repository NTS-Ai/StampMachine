# NTS Stampmachine

Leergame voor het Fayora AI-workbook "Python for Software & AI Engineering" (6 weken).

Speel online via GitHub Pages: **https://nts-ai.github.io/StampMachine/**

Of open `frontend/index.html` lokaal in een browser. Er is geen build-stap en er zijn geen dependencies: de scripts zijn gewone `<script>`-bestanden, dus het werkt ook zonder webserver.

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
  js/
    theme.js        Thema, geladen in <head> zodat er geen flits is
    data/content.js Gegenereerd uit content/: niet met de hand aanpassen
    core/           utils.js · content.js (types en indexen) · state.js (voortgang)
    fx/             sound.js · confetti.js
    ui/             dialog.js (bevestiging) · hud.js (level, thema, geluid)
    screens/        results.js · home.js · game.js · cards.js
    main.js         Sneltoetsen en opstarten
.github/workflows/  pages.yml publiceert frontend/ op GitHub Pages
```

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

Velden per soort vraag:

| `type`      | Verplicht                                  | Optioneel                    |
|-------------|--------------------------------------------|------------------------------|
| `choice`    | `question`, `correct`, `wrong`, `explanation` | `code`, `simple`, `why_wrong` |
| `truefalse` | `question`, `answer`, `explanation`        | `code`, `simple`             |
| `type`      | `question`, `answers`, `explanation`       | `code`, `simple`, `exact`    |
| `sentence`  | `question`, `model`, `points`              | `code`                       |

`why_wrong` geeft per fout antwoord uit `wrong`, in dezelfde volgorde, uitleg waarom het niet klopt.

## Typecontrole

De JavaScript heeft JSDoc-commentaren. Met `frontend/jsconfig.json` controleert VS Code daarmee automatisch de typen. Er is geen TypeScript-build nodig. Wil je het zelf draaien:

```
npx -p typescript tsc -p frontend/jsconfig.json
```

## GitHub Pages

De workflow `.github/workflows/pages.yml` publiceert de map `frontend/` bij elke push naar `main`. Eerst controleert hij met `build_content.py --check` of `content.js` klopt met `content/`.

Dit moet je één keer instellen: ga op GitHub naar **Settings → Pages** en kies bij **Source** voor **GitHub Actions**.
