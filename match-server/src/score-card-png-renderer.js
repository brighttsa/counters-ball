// Rasterises the score card SVG to PNG inside the Worker (chat apps do not show SVG previews).
// resvg and the two fonts load once per isolate; rendered cards are cached per match move.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import anton from '../fonts/Anton-Regular.ttf';
import cabinSketch from '../fonts/CabinSketch-Bold.ttf';

let ready = null;

export async function renderScoreCardPng(svg) {
  ready ??= initWasm(resvgWasm);
  await ready;
  const resvg = new Resvg(svg, {
    font: { fontBuffers: [new Uint8Array(anton), new Uint8Array(cabinSketch)], loadSystemFonts: false, defaultFontFamily: 'Anton' },
  });
  return resvg.render().asPng();
}
