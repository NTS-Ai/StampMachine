# Fayora Stampmachine

Leergame voor het Fayora AI-workbook "Python for Software & AI Engineering" (6 weken).

Speel online via GitHub Pages: **https://nts-ai.github.io/StampMachine/**

Of open `index.html` lokaal in een browser. Er is geen build-stap en er zijn geen dependencies; alles staat in dat ene bestand.

## GitHub Pages

De site wordt direct vanaf de branch `main` geserveerd, zonder build:

1. Ga op GitHub naar **Settings → Pages**.
2. Kies bij **Source** voor **Deploy from a branch**.
3. Kies branch `main` en map `/ (root)`, en klik **Save**.

Na een minuut staat de site op het adres hierboven. Het lege bestand `.nojekyll` zorgt dat GitHub de bestanden ongewijzigd serveert, zonder Jekyll.

## Wat erin zit

- 228 quizvragen en 112 flashcards, verdeeld over de zes weken.
- Per week drie modi: **Quiz** (12 vragen, foute antwoorden komen terug), **Flashcards** en **Speedrun** (60 seconden).
- **Pager om 03:00**: een eindbaas met vragen uit alle weken, drie levens en 20 seconden per vraag.
- Bij elke vraag een **Simpel gezegd**-uitleg (Jip-en-Janneke), per fout antwoord waarom het niet klopt, en de technische uitleg uit het workbook.
- XP, levels, combo's, records en een dagen-op-rij-teller. Voortgang staat in `localStorage` van je eigen browser.

## Bestanden

- `index.html`: het spel, inclusief alle vragen en uitleg.
- `.nojekyll`: zet Jekyll uit op GitHub Pages.
- `src/w1.json` … `src/w6.json`: de vragen per week, uitgepakt uit het spel. Dit zijn de invoerbestanden waaruit de uitleg is geschreven.
- `jip/w1.json` … `jip/w6.json`: de eenvoudige uitleg per vraag (`jip`) en per fout antwoord (`nee`). Deze staan ook in `index.html`, in de constante `JIP`.
