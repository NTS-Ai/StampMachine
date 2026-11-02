---
name: localhost-check
description: Werkafspraken voor het lokaal bekijken en testen van de Stampy-app in de echte Chrome van de gebruiker via Claude in Chrome (mcp__claude-in-chrome__*). Gebruik bij elke browsertaak op localhost, of als de gebruiker /localhost-check typt of vraagt om "in mijn Chrome te kijken".
---

# Lokaal testen met Claude in Chrome

Antwoord in het Nederlands. Deze afspraken gelden bij elk gebruik van de Chrome-extensie in dit project.

## 1. Alleen lokaal

- Werk alleen op `localhost` en `127.0.0.1` (de app in `frontend/`, en prototypes).
- Niet naar andere sites. Gebruik geen ingelogde accounts. Vul geen persoonlijke gegevens in. Geen downloads, uploads of betalingen.
- Begin met `tabs_context_mcp` en werk daarna in een eigen nieuw tabblad (`tabs_create_mcp`). Raak de tabbladen van de gebruiker niet aan. Sluit je eigen tabbladen als je klaar bent.

## 2. Mag zonder te vragen: alleen kijken

Tabbladen bekijken, de app openen in je eigen tabblad, de pagina lezen, screenshots maken, console en netwerk lezen (`read_console_messages` met een `pattern`), en navigeren binnen de app.

## 3. Vragen voordat iets verandert

**Eén keer vragen** bij kleine dingen: een tekst, een kleur, een stukje CSS, een lokale server starten.
Leg kort uit wat je doet en waarom, en wacht op "ja".

**Twee keer vragen** bij grote dingen: code wijzigen (logica, JS), een commit, een push, of de voortgang van de gebruiker wissen (`localStorage`, knoppen die opslaan of verwijderen).
1. **Plan:** wat, waarom, welke bestanden, wat het gevolg is. Wacht op "ja".
2. **Vlak voor het uitvoeren:** "Ik ga nu X doen, akkoord?" Wacht op een tweede "ja".

Gebruik een `AskUserQuestion`-vraag of stel de vraag in het antwoord en stop de beurt. Ga nooit verder op een eerdere of veronderstelde goedkeuring.

## 4. Input vragen bij keuzes

Zijn er meerdere redelijke opties, zoals tekst, kleur, plek of gedrag? Leg er 2 of 3 voor en wacht op de keuze van de gebruiker. Kies niet zelf.

## 5. Schets bij visuele veranderingen

- **Vóór het bouwen:** laat een schets zien. Dat kan een ASCII-mockup zijn, of een screenshot van de huidige toestand met een beschrijving van wat waar verandert. Bouw pas na akkoord.
- **Na het bouwen:** laat een voor- en na-screenshot zien (`computer` met `screenshot`).

## 6. Stoppen en melden

Stop en vraag hoe het verder moet bij:
- een `alert`, `confirm` of `prompt` in de browser (veroorzaak die nooit zelf; dialogen blokkeren de extensie);
- een loginpagina of CAPTCHA;
- 2 tot 3 mislukte pogingen;
- iets onverwachts, of geen antwoord van de extensie.

Probeer niet steeds hetzelfde opnieuw.

## 7. Lokale server

Start de app zonder cache, zodat Chrome altijd de nieuwste bestanden laadt (oude JS of CSS uit de cache gaf eerder "niks werkt"):

```
python .claude/skills/localhost-check/serve_nocache.py frontend 8080
```

Dit valt onder "één keer vragen". Controleer daarna met `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/`.

## 8. Rapport na afloop

Kort rapporteren:
- wat je gezien hebt (met screenshot waar dat helpt);
- wat je gedaan hebt;
- wat níet gelukt is of nog open staat;
- welke tabbladen je gesloten hebt.
