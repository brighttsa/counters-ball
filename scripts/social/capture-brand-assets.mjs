import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const output = new URL('../../social/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1400 } });
  await page.goto('http://localhost:4181/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__countersBall?.actions, null, { timeout: 60000 });
  await page.locator('#boot-start').dispatchEvent('click');
  for (const [index, name, mode = 'versus'] of [[0, 'schoolyard'], [1, 'kiosk'], [2, 'veranda'], [5, 'jamestown'], [9, 'street-legends', 'legends']]) {
    await page.evaluate(({ index, mode }) => {
      const g = window.__countersBall; g.app.mode = mode; g.progress.practiceSkipped = true;
      g.actions['select-level']({ dataset: { index: String(index) } });
      g.actions['kick-off']();
    }, { index, mode });
    await page.waitForTimeout(3300);
    const data = await page.evaluate(() => {
      const s = window.__countersBall.app.session;
      s.cameraDirector.update = () => {};
      s.camera.position.set(2.4, 3.6, 4); s.camera.up.set(0, 1, 0); s.camera.lookAt(0, 0, 0); s.camera.updateMatrixWorld();
      s.hud.show(false);
      return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() =>
        resolve(document.getElementById('game-canvas').toDataURL('image/png').split(',')[1]))));
    });
    await writeFile(new URL(`${name}.png`, output), Buffer.from(data, 'base64'));
    console.log('Captured', name);
  }
  for (const kind of ['cap-red', 'cap-rival', 'paper-ball']) {
    const data = await page.evaluate(async kind => {
      const THREE = await import('/vendor/three-r160/three.module.js');
      const s = window.__countersBall.app.session;
      const scene = new THREE.Scene();
      const object = kind === 'paper-ball' ? s.stage.ballMesh.clone() : s.entries.find(e => e.side === (kind === 'cap-red' ? 'home' : 'away')).mesh.clone();
      object.position.set(0, 0, 0); object.rotation.set(0, 0, 0); scene.add(object);
      scene.add(new THREE.HemisphereLight(0xfff5dd, 0x3b4b48, 3));
      const light = new THREE.DirectionalLight(0xfff8ea, 4); light.position.set(-1, 3, 2); scene.add(light);
      const box = new THREE.Box3().setFromObject(object); const size = box.getSize(new THREE.Vector3()).length();
      const camera = new THREE.PerspectiveCamera(32, 1, .001, 10);
      camera.position.set(size * .216, size * .972, size * 1.152); camera.lookAt(0, 0, 0);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(1200, 1200); renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.render(scene, camera);
      const result = renderer.domElement.toDataURL('image/png').split(',')[1]; renderer.dispose(); return result;
    }, kind);
    await writeFile(new URL(`${kind}.png`, output), Buffer.from(data, 'base64')); console.log('Rendered', kind);
  }
} finally { await browser.close(); }
