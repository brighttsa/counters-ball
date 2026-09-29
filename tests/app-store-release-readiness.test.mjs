import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const project = readFileSync('ios/KONKNative/KONKNative.xcodeproj/project.pbxproj', 'utf8');

test('release target has stable 1.0 identity and export declaration', () => {
  assert.match(project, /MARKETING_VERSION = 1\.0;/);
  assert.match(project, /CURRENT_PROJECT_VERSION = 1;/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = world\.konk\.native;/);
  assert.match(project, /INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO;/);
});

test('App Store icon and privacy manifest are packaged resources', () => {
  assert.match(project, /ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/);
  assert.match(project, /Assets\.xcassets in Resources/);
  assert.match(project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.ok(statSync('ios/KONKNative/KONKNative/Assets.xcassets/AppIcon.appiconset/konk-app-icon-1024.png').size > 10000);
  const privacy = readFileSync('ios/KONKNative/KONKNative/PrivacyInfo.xcprivacy', 'utf8');
  assert.match(privacy, /NSPrivacyTracking[\s\S]*<false\/>/);
  assert.match(privacy, /NSPrivacyAccessedAPICategoryUserDefaults/);
});

test('public privacy policy names storage, online features and contact', () => {
  const policy = readFileSync('privacy.html', 'utf8');
  for (const phrase of ['Data stored on your device', 'Online features', 'brighttsa@gmail.com']) assert.match(policy, new RegExp(phrase));
  assert.match(policy, /id="contact"/);

  const pagesWorkflow = readFileSync('.github/workflows/deploy-game-to-github-pages.yml', 'utf8');
  assert.match(pagesWorkflow, /cp -R[^\n]*privacy\.html[^\n]*_site\//);
});

test('App Store screenshots use the iPhone 6.9-inch portrait dimensions', () => {
  const names = [
    '01-flick-bank-score.png', '02-street-legends.png', '03-six-pitches.png',
    '04-two-player.png', '05-camera-replay.png',
  ];
  for (const name of names) {
    const image = readFileSync(`docs/app-store/screenshots/${name}`);
    assert.equal(image.toString('ascii', 1, 4), 'PNG');
    assert.equal(image.readUInt32BE(16), 1320, `${name} width`);
    assert.equal(image.readUInt32BE(20), 2868, `${name} height`);
  }
});
