#!/usr/bin/env bash
# Offline copy of bode-measure: site/bode-measure/bode-measure_<commit>.zip, a folder bode-measure/ whose index.html
# loads Plotly and KaTeX from lib/ instead of the CDNs. Run from the repository root after the site is assembled:
#   .github/scripts/offline-bode-measure.sh site
set -euo pipefail
SITE="$(cd "${1:-site}" && pwd)"
APP=bode-measure
SHA=$(git log -1 --format=%h --abbrev=7 -- "$APP")
# the published page shows the link to its zip
sed -i "s/const BUILD_COMMIT = '';/const BUILD_COMMIT = '$SHA';/" "$SITE/$APP/index.html"
grep -q "const BUILD_COMMIT = '$SHA';" "$SITE/$APP/index.html"

WORK=$(mktemp -d)
OFF="$WORK/$APP"
mkdir -p "$OFF/lib/katex/fonts"
cp "$SITE/$APP/index.html" "$OFF/"
cp dsp-with-arduino-and-esp32/lib/plotly-2.32.0.min.js "$OFF/lib/"
(cd "$WORK" && npm pack katex@0.16.11 --silent >/dev/null && tar xzf katex-0.16.11.tgz)
cp "$WORK/package/dist/katex.min.js" "$WORK/package/dist/katex.min.css" "$OFF/lib/katex/"
cp "$WORK/package/dist/fonts/"*.woff2 "$OFF/lib/katex/fonts/"
sed -i -e 's#https://cdn.plot.ly/plotly-2.32.0.min.js#lib/plotly-2.32.0.min.js#' \
       -e 's#https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/#lib/katex/#g' "$OFF/index.html"
grep -q 'src="lib/plotly-2.32.0.min.js"' "$OFF/index.html"
grep -q 'href="lib/katex/katex.min.css"' "$OFF/index.html"
grep -q 'src="lib/katex/katex.min.js"' "$OFF/index.html"
cat > "$OFF/LISEZMOI-README-LEAME.txt" <<TXT
Relevé de diagramme de Bode — version hors ligne ($SHA)
Ouvrir index.html dans un navigateur (Chrome, Edge, Firefox) : fonctionne sans Internet.
Les mesures sont gardées dans ce navigateur, pour ce dossier.

Bode Plot Measurement Sheet — offline version ($SHA)
Open index.html in a browser (Chrome, Edge, Firefox): works without Internet.
Measurements are kept in that browser, for this folder.

Hoja de medición de diagrama de Bode — versión sin conexión ($SHA)
Abrir index.html en un navegador (Chrome, Edge, Firefox): funciona sin Internet.
Las mediciones se guardan en ese navegador, para esta carpeta.

https://ferrucci-lab.com/bode-measure/
TXT
(cd "$WORK" && zip -qr "$SITE/$APP/${APP}_$SHA.zip" "$APP")
rm -rf "$WORK"
ls -l "$SITE/$APP/${APP}_$SHA.zip"
