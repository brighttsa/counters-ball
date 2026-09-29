#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
DEST=${1:?"usage: package-game-runtime.sh OUTPUT_DIRECTORY"}

rm -rf "$DEST"
mkdir -p "$DEST"

sed \
  -e '/fonts.googleapis.com/d' \
  -e '/fonts.gstatic.com/d' \
  -e 's#<link rel="stylesheet" href="styles/game-ui-base#<link rel="stylesheet" href="vendor/fonts/fonts.css" />\
<link rel="stylesheet" href="styles/game-ui-base#' \
  -e 's#https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js#./vendor/three-r160/three.module.js#' \
  -e 's#https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/#./vendor/three-r160/addons/#' \
  "$ROOT/index.html" > "$DEST/index.html"

cp "$ROOT/manifest.webmanifest" "$DEST/manifest.webmanifest"
for directory in assets src styles vendor; do
  cp -R "$ROOT/$directory" "$DEST/$directory"
done

if grep -Eq 'fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/npm/three' "$DEST/index.html"; then
  echo "KONK native package still contains a boot-time web dependency" >&2
  exit 1
fi
