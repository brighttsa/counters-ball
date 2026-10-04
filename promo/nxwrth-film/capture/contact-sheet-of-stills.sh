#!/bin/sh
# Tiles the given film seconds into one image for review: ./contact-sheet-of-stills.sh sheet-name 1.3 2.9 ...
# FORMAT=9:16 switches the frame format.
cd "$(dirname "$0")" || exit 1
name="$1"; shift
node export-nxwrth-promo-film.mjs stills "$@" > /dev/null || exit 1
prefix="out/still-$(echo "${FORMAT:-16:9}" | tr ':' 'x')-"
inputs=""; for t in "$@"; do inputs="$inputs -i ${prefix}$(printf '%.2f' "$t").png"; done
rows=$(( ($# + 1) / 2 ))
ffmpeg -y -v error $inputs -filter_complex "concat=n=$#:v=1:a=0,scale=${SHEET_WIDTH:-960}:-1,tile=2x${rows}" -frames:v 1 "out/${name}.jpg"
echo "out/${name}.jpg"
