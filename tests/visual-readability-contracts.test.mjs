import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIGHTING_PRESETS } from '../src/scene/lighting-presets-by-time-of-day.js';

const css = readFileSync(new URL('../styles/game-ui-base-and-hud.css', import.meta.url), 'utf8');

function tokenRgb(name) {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(match, `missing --${name}`);
  const value = match[1].trim();
  if (value.startsWith('#')) return hexToRgb(value);
  return value.split(/\s+/).map(Number);
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function relativeLuminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('venue lighting presets stay expressive without washing out play readability', () => {
  for (const [name, preset] of Object.entries(LIGHTING_PRESETS)) {
    assert.ok(preset.exposure <= 1.12, `${name} exposure is too hot`);
    assert.ok(preset.haze.amount <= 0.16, `${name} haze is too heavy`);
    assert.ok(preset.grain <= 0.06, `${name} grain is too noisy`);
    assert.ok(preset.fill.intensity >= 0.12, `${name} fill light is too low`);
  }
});

test('core UI colours meet strong contrast targets over the ink surface', () => {
  const ink = tokenRgb('ink-rgb');
  assert.ok(contrast(tokenRgb('paper-rgb'), ink) >= 14, 'paper text should stay crisp on ink');
  assert.ok(contrast(tokenRgb('paper-muted'), ink) >= 10, 'muted text still needs readable contrast');
  assert.ok(contrast(tokenRgb('yellow'), ink) >= 11, 'yellow actions should be readable on ink');
});
