import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('native package contains the complete local boot runtime', () => {
  const output = mkdtempSync(join(tmpdir(), 'konk-native-package-'));
  try {
    execFileSync(join(root, 'ios/KONKNative/package-game-runtime.sh'), [output]);
    const html = readFileSync(join(output, 'index.html'), 'utf8');
    assert.match(html, /id="game-canvas"/);
    assert.doesNotMatch(html, /legacy-game-entry/);

    assert.match(html, /vendor\/fonts\/fonts\.css/);
    assert.match(html, /vendor\/three-r160\/three\.module\.js/);
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/three/);

    for (const path of [
      'src/main.js',
      'styles/game-ui-base-and-hud.css',
      'assets/audio/afro-rave35-155bpm-konk-world.mp3',
      'assets/audio/foley/flick-hard-01.mp3',
      'assets/audio/foley/post-hard-01.mp3',
      'vendor/fonts/anton-regular.ttf',
      'vendor/three-r160/addons/controls/OrbitControls.js',
    ]) assert.ok(readFileSync(join(output, path)).length > 0, `${path} should be bundled`);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
