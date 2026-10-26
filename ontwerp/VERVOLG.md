# Vervolg: spel, Stampy en profiel

Stand van zaken op 15 oktober 2026, toen het werk werd gepauzeerd.

## Wat er gebeurd is

- **Stampy gekozen** als mascotte: een eigen robot met "NTS" op de borst. De schetsen staan in `ontwerp/stampy-robot.html`: een oplaadring, een vuur-aura in Super Saiyan-stijl en zeven upgrades binnen 30 dagen.
- **Speelbaar prototype van de spelsectie** gemaakt, gebaseerd op twee inspiratiefoto's: een donkere indigo kinderleer-app (Nacht) en een lichtgroene app in Duolingo-stijl (Dag). Het prototype bevat:
  - een home met Stampy rechtsboven;
  - een eilandkaart in 3D-perspectief met 7 levels en een baas;
  - per level 5 vraagvormen: meerkeuze, typ de uitvoer, vul het gat in, code-puzzel en open vraag;
  - een minigame van 30 seconden per level;
  - sterren en XP;
  - een Stampy-upgrade per gehaald level, in plaats van per dagstreak.

  De laatste gecontroleerde versie is gepubliceerd als artifact: https://claude.ai/artifact/Xxiz4csYJ3mideJ5gsVckP
- **In de repo gezet** (nog niet gecommit, op branch `feature/kennisbank`):
  - `frontend/spel/index.html`: het spel. Let op: dit is een **tussenversie**. Een workflow (profiel + design-upgrade) is halverwege gestopt en kan dit bestand half aangepast hebben. Deze versie is niet gecontroleerd.
  - `frontend/index.html`: een nieuw tabblad **Spelen** dat linkt naar `spel/`.
  - `ontwerp/stampy-robot.html`: de robotschetsen.
  - `.gitignore`: `_live/` en `_preview/` uitgesloten.
- De bestaande tests (`node --test tests/*.test.mjs`) slaagden voordat de workflow stopte: 65 van 65.

## Vaste keuzes

- De bestaande quizonderdelen blijven: Quiz, Flashcards, Speedrun, Typen en de eindbaas.
- Gegevens worden maximaal 30 dagen bewaard.
- De site blijft statisch op GitHub Pages, met `frontend/` als gepubliceerde map.
- De site bestaat uit vier delen: Spelen, Oefenen, Kennisbank en Speeltuin.
- Bij elke wijziging een kort testschema en een veiligheidscheck.

## Wat er nog moet gebeuren

1. **`frontend/spel/index.html` nakijken.** Werkt de tussenversie van de afgebroken workflow? Zo niet, zet dan de gecontroleerde artifact-versie terug.
2. **Profielpagina bouwen:**
   - grafieken: activiteit per dag over 30 dagen (goed en fout), een cirkeldiagram met goed tegenover fout, en het percentage per vraagtype;
   - beheersing per workbook-hoofdstuk, met het advies "Neem dit hoofdstuk nog eens door";
   - recente fouten met uitleg en een knop "Herhaal mijn fouten";
   - herhaaltips: hoeveel vragen vandaag klaarstaan, met intervallen van 1, 3 en 7 dagen;
   - records bij de minigames;
   - een lege staat met voorbeelddata, en "Wis mijn gegevens" met een bevestiging.
3. **Design-upgrade over alle schermen.** Daarbij hoort de tekstballon van Stampy, die nu over "Hoi, stagiair" valt.
4. **Knoppen in het spel koppelen aan de echte app.** Oefenen en Snel oefenen gaan naar `../#/`, Kennisbank naar `../#/kennis`.
5. **Tests draaien en alles in de browser nalopen,** in Dag en Nacht en op 375 px breed.
6. **Vragen waar het spel gecommit moet worden:** op `feature/kennisbank` of op een eigen branch `feature/spel`. Daarna een PR openen.
7. **De definitieve prompt voor het hele platform** bijwerken met al deze keuzes.
