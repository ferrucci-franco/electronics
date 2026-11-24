#!/usr/bin/env bash
# Offline copy of pendulum: site/pendulum/pendulum_<commit>.zip, a folder pendulum/ that works without Internet
# (Chart.js and KaTeX are already in lib/). Only the images the page uses go in the zip.
# Run from the repository root after the site is assembled:
#   .github/scripts/offline-pendulum.sh site
set -euo pipefail
SITE="$(cd "${1:-site}" && pwd)"
APP=pendulum
SHA=$(git log -1 --format=%h --abbrev=7 -- "$APP")
# the published page shows the link to its zip
sed -i "s/const BUILD_COMMIT = '';/const BUILD_COMMIT = '$SHA';/" "$SITE/$APP/index.html"
grep -q "const BUILD_COMMIT = '$SHA';" "$SITE/$APP/index.html"

WORK=$(mktemp -d)
OFF="$WORK/$APP"
mkdir -p "$OFF/img"
cp "$SITE/$APP"/index.html "$SITE/$APP"/*.js "$SITE/$APP"/*.css "$OFF/"
cp -r "$SITE/$APP/lib" "$OFF/lib"
for f in "$SITE/$APP"/img/*; do
  if grep -q "img/$(basename "$f")" "$OFF/index.html" "$OFF"/*.js; then cp "$f" "$OFF/img/"; fi
done
test -f "$OFF/lib/chart.min.js"
test -f "$OFF/lib/katex/katex.min.js"
cat > "$OFF/LISEZMOI-README-LEAME.txt" <<TXT
Analyseur de pendule — version hors ligne ($SHA)
Ouvrir index.html dans Chrome ou Edge : fonctionne sans Internet (l'acquisition par USB demande Chrome ou Edge).

Pendulum analyzer — offline version ($SHA)
Open index.html in Chrome or Edge: works without Internet (USB acquisition needs Chrome or Edge).

Analizador de péndulo — versión sin conexión ($SHA)
Abrir index.html en Chrome o Edge: funciona sin Internet (la adquisición por USB requiere Chrome o Edge).

https://ferrucci-lab.com/pendulum/
TXT
(cd "$WORK" && zip -qr "$SITE/$APP/${APP}_$SHA.zip" "$APP")
rm -rf "$WORK"
ls -l "$SITE/$APP/${APP}_$SHA.zip"
