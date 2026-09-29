import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceURL = new URL('../ios/KONKNative/KONKNative/App/KONKWebGameView.swift', import.meta.url);

test('native loading background fills the screen while only content is padded', async () => {
  const source = await readFile(sourceURL, 'utf8');
  const status = source.slice(source.indexOf('private var status'), source.indexOf('private enum LoadState'));

  assert.match(status, /ZStack \{\s*Color\([^]*?\.ignoresSafeArea\(\)/);
  assert.match(status, /VStack\(spacing: 18\)[^]*?\.padding\(28\)/);
  assert.doesNotMatch(status, /\.background\([^\n]+\)\s*\.padding\(28\)/);
  assert.match(status, /\.frame\(maxWidth: \.infinity, maxHeight: \.infinity\)\s*\.ignoresSafeArea\(\)/);
});
