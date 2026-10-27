#!/bin/bash
# Houdt de live-preview (_live/) en de repo-kopie (frontend/spel/index.html) gelijk met het prototype in de scratchpad.
SRC="/c/Users/ninos/AppData/Local/Temp/claude/C--Users-ninos-OneDrive-Documents-GitHub-StampMachine/bff39f8b-a93d-49cf-b60d-57deabc74ac9/scratchpad/stampy-game.html"
REPO="/c/Users/ninos/OneDrive/Documents/GitHub/StampMachine"
HEAD='<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}</style>\n'
wrap() { # $1 = source, prints a standalone page: everything up to the first </style> in <head>, rest in <body>
  awk -v head="$HEAD" 'BEGIN{printf "%s", head} {print} /<\/style>/ && !done {print "</head>\n<body>"; done=1}' "$1"
}
last=""
while true; do
  h=$(md5sum "$SRC" 2>/dev/null | cut -c1-12)
  if [ -n "$h" ] && [ "$h" != "$last" ]; then
    { wrap "$SRC"; printf '</body>\n</html>\n'; } > "$REPO/frontend/spel/index.tmp" && mv -f "$REPO/frontend/spel/index.tmp" "$REPO/frontend/spel/index.html"
    { wrap "$SRC"; printf '<script>(function(){var v="%s";setInterval(function(){fetch("version.txt?"+Date.now(),{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){if(t.trim()&&t.trim()!==v)location.reload()}).catch(function(){})},3000)})();</script>\n</body>\n</html>\n' "$h"; } > "$REPO/_live/index.tmp" && mv -f "$REPO/_live/index.tmp" "$REPO/_live/index.html"
    echo "$h" > "$REPO/_live/version.txt"
    last="$h"
  fi
  sleep 3
done
