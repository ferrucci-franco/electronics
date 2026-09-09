#!/usr/bin/env bash
#
# Copy this app into the public site repository (ferrucci-franco/electronics),
# which serves it at /electronics/complex-exponential-explorer/ through the
# Pages workflow that runs on every push to its main branch.
#
# This repository is the source of truth. The published copy is generated:
# never edit it by hand, run this instead.
#
#   ./scripts/publish-to-electronics.sh [path-to-electronics-repo]
#
# The destination defaults to ../electronics, or $ELECTRONICS_REPO if set.
# The script only copies — it leaves committing and pushing to you, unless
# you pass --commit, and it never pushes.

set -euo pipefail

APP=complex-exponential-explorer

# The files that make up the published copy. Anything else here (the git
# history, the LICENSE, this script) stays behind.
FILES=(index.html style.css script.js README.md THIRD_PARTY_LICENSES.md vendor tools)

# The one line that legitimately differs between the two copies: served from a
# subdirectory of the site, the app has a different address.
URL_HERE="https://ferrucci-franco.github.io/${APP}/"
URL_THERE="https://ferrucci-franco.github.io/electronics/${APP}/"

commit=0
dest=""
for arg in "$@"; do
    case "$arg" in
        --commit) commit=1 ;;
        -h|--help) sed -n "2,14p" "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        -*) echo "unknown option: $arg" >&2; exit 2 ;;
        *)  dest="$arg" ;;
    esac
done

src=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
[ -n "$dest" ] || dest="${ELECTRONICS_REPO:-$src/../electronics}"

# --- checks, so a typo cannot scatter files into the wrong tree ------------
[ -d "$dest" ] || { echo "no such directory: $dest" >&2; exit 1; }
dest=$(cd "$dest" && pwd)
[ -d "$dest/.git" ] || { echo "not a git repository: $dest" >&2; exit 1; }
[ -f "$dest/.github/workflows/deploy-pages.yml" ] || {
    echo "$dest does not look like the electronics site (no deploy-pages.yml)" >&2
    exit 1
}
for f in "${FILES[@]}"; do
    [ -e "$src/$f" ] || { echo "missing in this repo: $f" >&2; exit 1; }
done

echo "source      $src"
echo "destination $dest/$APP"

# --- copy ------------------------------------------------------------------
# Wiped first so a file deleted here also disappears there; git compares
# content, so this does not inflate the diff.
rm -rf "${dest:?}/$APP"
mkdir -p "$dest/$APP"
cp -R "${FILES[@]/#/$src/}" "$dest/$APP/"

# --- the published copy points at its own address --------------------------
readme="$dest/$APP/README.md"
grep -qF "$URL_HERE" "$readme" || {
    echo "the live-version line in README.md is not what this script expects;" >&2
    echo "update URL_HERE in $0" >&2
    exit 1
}
# `|` as the delimiter: the URLs contain slashes.
sed -i.bak "s|$URL_HERE|$URL_THERE|" "$readme" && rm -f "$readme.bak"

# The Publishing section explains how to run this script, from a repository the
# published copy is not in. Drop it there; it only confuses a visitor.
python3 - "$readme" <<'PYEOF'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); s = p.read_text()
out = re.sub(r"\n## Publishing\n.*?(?=\n## )", "", s, flags=re.S)
p.write_text(out)
PYEOF

# --- report ----------------------------------------------------------------
echo
if git -C "$dest" diff --quiet -- "$APP" && \
   [ -z "$(git -C "$dest" ls-files --others --exclude-standard -- "$APP")" ]; then
    echo "already up to date — nothing changed."
    exit 0
fi

git -C "$dest" add -A -- "$APP"
echo "changed files:"
git -C "$dest" diff --cached --stat -- "$APP" | sed 's/^/  /'

if [ "$commit" -eq 1 ]; then
    git -C "$dest" commit -q -m "Update ${APP} from the source repository"
    echo
    echo "committed. Push when ready:  git -C $dest push origin main"
else
    echo
    echo "staged but not committed. To publish:"
    echo "  git -C $dest commit -m 'Update ${APP} from the source repository'"
    echo "  git -C $dest push origin main"
fi
