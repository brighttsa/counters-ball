// Directs the film: for any film time it picks the shot, poses the recorded
// take, frames the camera, sets the lens and draws the graphics. It holds no
// clock of its own; the audio transport (or the exporter) tells it what time it is.
import * as THREE from 'three';
import { createRendererSceneCamera } from '../../src/scene/scene-and-lighting-setup.js';
import { MARK, MUSIC_START, TAG, DROP, FILM_END } from './nxwrth-promo-timeline-config.js';
import { createCinematicPost } from './promo-cinematic-post-processing.js';
import { buildPromoStages, NXWRTH_CAP } from './promo-venue-stages-and-hero-caps.js';
import { recordTake } from './promo-recorded-physics-takes.js';
import { TAKES } from './promo-take-layouts-and-flicks.js';
import { OPENING_SHOTS } from './promo-shots-opening-and-build-up.js';
import { REVEAL_SHOTS } from './promo-shots-reveal-and-final-run.js';
import { takeTime, eventFilmTime, impactShake, applyCamera } from './promo-camera-and-motion-helpers.js';
import { createContactDust } from './promo-contact-dust-from-recorded-impacts.js';
import { createScreenGraphics } from './promo-screen-graphics-cue-renderer.js';
import { TITLE_IMPACTS } from './promo-title-and-graphic-cues.js';
import { loadGraphicFonts } from './promo-ink-and-chalk-graphic-primitives.js';

const SHOTS = [...OPENING_SHOTS, ...REVEAL_SHOTS];
const SOUND_FOR = { flick: 'flick', cap: 'clink', ball: 'thwack', post: 'knock', wall: 'knock', goal: 'thwack' };
const UNDER_MUSIC = 0.5;   // table sounds sit under the beat once it is playing
const BULB = [0.25, 2.3, 0.45];
const FINGER_HEIGHT = 0.13;

export class NxwrthPromoDirector {
  constructor({ canvas, graphicsCanvas }) {
    this.canvas = canvas;
    this.graphicsCanvas = graphicsCanvas;
    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // no flashes or shake
    this.vector = new THREE.Vector3();
  }

  async init() {
    await loadGraphicFonts();
    const logo = new Image();
    logo.src = new URL('../../assets/brand/konk-wordmark.svg', import.meta.url).href;
    await logo.decode().catch(() => {});

    const { renderer, scene, camera } = createRendererSceneCamera(this.canvas);
    camera.near = 0.01; // macro: the lens sits centimetres from a cap
    // The shared setup sizes the canvas to the window with inline styles; here the frame's CSS decides.
    this.canvas.style.width = this.canvas.style.height = '';
    Object.assign(this, { renderer, scene, camera });
    this.post = createCinematicPost(renderer, scene, camera);
    this.set = buildPromoStages({ scene, renderer, camera, post: this.post });
    this.takes = Object.fromEntries(Object.entries(TAKES).map(([name, spec]) => [name, recordTake(this.set.stages[spec.stage], spec)]));
    this.finger = this.buildFingerShadowCaster(this.set.stages.night.group);
    // A bounce card by the lens: under a single overhead bulb, anything facing a low camera would be a silhouette.
    this.lensFill = new THREE.PointLight(0xffd2a0, 0, 2.5, 2);
    scene.add(this.lensFill);
    this.dust = createContactDust(scene);
    this.graphics = createScreenGraphics(this.graphicsCanvas, logo);
    this.set.warmUp();

    // Every recorded contact, placed on the film's clock.
    this.impacts = [];
    for (const shot of SHOTS) {
      if (!shot.take) continue;
      for (const event of this.takes[shot.take].events) {
        const t = eventFilmTime(shot, this.takes[shot.take], event);
        if (t != null) this.impacts.push({ ...event, t, shot: shot.id });
      }
    }
    this.world = {
      sim: 0, stage: null,
      cap: (index) => this.world.stage.caps[index].pivot.position.toArray(),
      ball: () => this.world.stage.ballMesh.position.toArray(),
      finger: (tipX, z, amount, direction) => this.placeFinger(tipX, z, amount, direction),
    };
    return this;
  }

  /** Invisible to the lens, solid to the bulb: only its shadow is ever seen. */
  buildFingerShadowCaster(group) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.7, 6, 14),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    finger.rotation.z = Math.PI / 2 - 0.2;
    finger.castShadow = true;
    finger.visible = false;
    group.add(finger);
    return finger;
  }

  /** @param direction 1 when the hand reaches in from -x, -1 from +x */
  placeFinger(tipX, z, amount, direction = 1) {
    this.finger.visible = amount > 0.001;
    this.finger.rotation.z = direction * (Math.PI / 2 - 0.2); // the tip is the low end
    const k = FINGER_HEIGHT / BULB[1], x = tipX - direction * 0.38; // held on the bulb's ray, so the shadow falls just behind the cap
    this.finger.position.set(x + (BULB[0] - x) * k, FINGER_HEIGHT, z + (BULB[2] - z) * k);
  }

  /** Table sounds for the transport: the opening ritual, every seen contact, and three KONKs. */
  soundCues() {
    const release = this.impacts.find((impact) => impact.shot === 'pull-and-release' && impact.kind === 'flick')?.t ?? MARK.release;
    const lastRelease = this.impacts.find((impact) => impact.shot === 'one-flick' && impact.kind === 'flick')?.t;
    const cues = [
      { t: 0, kind: 'air', opts: { duration: MUSIC_START + 0.2, gain: 0.03 } },
      { t: MARK.macroLight + 0.03, kind: 'settle' },
      { t: release - 1.2, kind: 'touch' },
      { t: release - 0.95, kind: 'scrape', opts: { duration: 0.62, gain: 0.08 } },
      { t: MARK.konk, kind: 'konk', opts: { gain: 1 } },
      { t: MARK.capCollision, kind: 'konk', opts: { gain: 0.6 } },
      { t: MARK.endCard, kind: 'konk', opts: { gain: 1 } },
    ];
    if (lastRelease) cues.push({ t: lastRelease - 0.95, kind: 'scrape', opts: { duration: 0.62, gain: 0.035 } });
    for (const impact of this.impacts) {
      const underMusic = impact.t >= MUSIC_START;
      if (underMusic && impact.strength < 0.3) continue;
      if (Math.abs(impact.t - MARK.konk) < 0.06 || Math.abs(impact.t - MARK.capCollision) < 0.06) continue; // the KONK speaks for these
      cues.push({ t: impact.t, kind: SOUND_FOR[impact.kind], opts: { s: impact.strength * (underMusic ? UNDER_MUSIC : 1) } });
    }
    return cues;
  }

  resize(width, height, pixelRatio) {
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.post.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.graphics.resize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
  }

  shotAt(filmTime) {
    return SHOTS.find((shot) => filmTime >= shot.start && filmTime < shot.end) ?? SHOTS[SHOTS.length - 1];
  }

  project = (point) => {
    const stage = this.world.stage;
    if (!stage) return null;
    if (point === 'ball') this.vector.copy(stage.ballMesh.position); else this.vector.set(...point);
    this.vector.project(this.camera);
    if (this.vector.z > 1) return null;
    return [(this.vector.x * 0.5 + 0.5) * this.graphicsCanvas.width, (-this.vector.y * 0.5 + 0.5) * this.graphicsCanvas.height];
  };

  /** Draws the film as it is at `filmTime`. `dt` only feeds ambient street life (leaves, fowl, dust motes). */
  renderFrame(filmTime, dt = 1 / 60) {
    const f = Math.max(0, Math.min(FILM_END, filmTime));
    const shot = this.shotAt(f);
    if (shot.take) this.renderShot(shot, f, dt);
    this.graphics.render(f, { project: this.project, calm: this.calm });
    return shot;
  }

  renderShot(shot, f, dt) {
    const take = this.takes[shot.take], stage = this.set.activate(TAKES[shot.take].stage);
    const local = Math.min(f, shot.freeze ?? Infinity) - shot.start;
    const w = this.world;
    w.stage = stage;
    w.sim = THREE.MathUtils.clamp(takeTime(shot, take, local), 0, take.duration);
    take.apply(w.sim);
    this.finger.visible = false;
    for (const sign of [-1, 1]) stage.goals[sign].rotation.z = 0;
    // NXWRTH's cap exists only after the voice has named him.
    if (f < TAG) this.set.stages.night.caps[NXWRTH_CAP].pivot.visible = false;
    shot.pose?.(local, w);

    const seen = this.impacts.filter((impact) => impact.shot === shot.id);
    for (const impact of seen) { // the woodwork shivers when the ball finds it
      const age = f - impact.t;
      if ((impact.kind === 'post' || impact.kind === 'goal') && age >= 0 && age < 1.2) {
        const sign = Math.sign(impact.x) || 1;
        stage.goals[sign].rotation.z = -sign * 0.16 * impact.strength * Math.exp(-age * 4.5) * Math.cos(age * 13);
      }
    }

    const frame = shot.cam(local, w);
    const shake = this.calm ? null : impactShake(f, [...seen.filter((impact) => impact.strength > 0.3), ...TITLE_IMPACTS], frame.fov / 30);
    const distance = applyCamera(this.camera, frame, shake);
    this.lensFill.position.copy(this.camera.position).y += 0.45;
    this.lensFill.intensity = frame.fill ?? 0;
    const focus = frame.focusAt ? this.camera.position.distanceTo(this.vector.set(...frame.focusAt)) : distance;
    this.post.setLens({ focus, aperture: frame.aperture, sharpZone: frame.sharpZone, maxBlur: frame.maxBlur });

    let pulse = f >= DROP ? 0.5 * Math.exp(-(f - DROP) * 5) : 0;
    for (const impact of seen) {
      const age = f - impact.t;
      if (age >= 0 && impact.strength > 0.5 && impact.kind !== 'flick') pulse += impact.strength * 0.3 * Math.exp(-age * 7);
    }
    stage.backdrop.update(f, dt);
    this.dust.render(f, seen, this.camera.position, (stage.preset.bulb ? 0.45 : 1) * Math.min(1, (frame.fov / 34) ** 3));
    this.post.setFrame(f, this.calm ? 0 : pulse);
    this.post.render();
  }
}

export { SHOTS };
