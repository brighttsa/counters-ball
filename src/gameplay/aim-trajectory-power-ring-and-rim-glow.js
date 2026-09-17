// Aim feedback shared by the human drag input and the AI performer: a curved
// dashed trajectory, a power ring that sweeps around the cap and warms from
// chalk-white to red, and an additive rim glow (hover + selected states).
import * as THREE from 'three';
import { MAX_PULL } from '../core/pitch-dimensions-and-constants.js';

const CHALK = new THREE.Color(1.0, 0.95, 0.82);
const WARM = new THREE.Color(1.0, 0.62, 0.25);
const HOT = new THREE.Color(0.95, 0.3, 0.2);

const powerRingMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uProgress: { value: 0 }, uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec2 vPos;
    void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uProgress; uniform vec3 uColor; uniform float uOpacity;
    varying vec2 vPos;
    void main() {
      float a = fract(atan(vPos.x, vPos.y) / 6.28318 + 1.0); // 0 at 12 o'clock, clockwise
      if (a > uProgress) discard;
      float head = smoothstep(uProgress - 0.08, uProgress, a); // brighter leading edge
      gl_FragColor = vec4(uColor * (1.0 + head * 0.8), uOpacity);
    }`,
});

export class AimVisuals {
  constructor(parent) {
    this.lineGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 25 }, () => new THREE.Vector3()));
    this.line = new THREE.Line(this.lineGeo, new THREE.LineDashedMaterial({
      color: 0xfff1cf, dashSize: 0.045, gapSize: 0.03, transparent: true, opacity: 0, depthWrite: false,
    }));
    this.line.frustumCulled = false;

    this.glow = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.42, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd07a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.86, 64), powerRingMaterial());
    for (const m of [this.glow, this.ring]) m.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    parent.add(this.line, this.glow, this.ring);

    this.activeBody = null;
    this.hoverBody = null;
    this.power = 0;
    this.color = new THREE.Color();
  }

  /** @param pull THREE.Vector2 — flick direction scaled by pull length */
  show(body, pull) {
    this.activeBody = body;
    this.power = Math.min(1, pull.length() / MAX_PULL);
    const p = this.power;
    this.color.copy(CHALK).lerp(WARM, Math.min(1, p * 1.6));
    if (p > 0.62) this.color.lerp(HOT, (p - 0.62) / 0.38);

    this.ring.visible = true;
    this.ring.position.set(body.pos.x, 0.005, body.pos.y);
    this.ring.scale.setScalar(body.radius);
    this.ring.material.uniforms.uProgress.value = p;
    this.ring.material.uniforms.uColor.value.copy(this.color);
    this.ring.material.uniforms.uOpacity.value = 0.55;

    if (p < 0.02) { this.line.material.opacity = 0; return; }
    const dir = pull.clone().normalize();
    const len = 0.22 + p * 1.05;
    const bow = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(len * 0.07);
    const y = 0.035;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(body.pos.x, y, body.pos.y),
      new THREE.Vector3(body.pos.x + dir.x * len * 0.5 + bow.x, y, body.pos.y + dir.y * len * 0.5 + bow.y),
      new THREE.Vector3(body.pos.x + dir.x * len, y, body.pos.y + dir.y * len));
    this.lineGeo.setFromPoints(curve.getPoints(24));
    this.line.computeLineDistances();
    this.line.material.color.copy(this.color);
    this.line.material.opacity = 0.3 + p * 0.65;
  }

  hide() {
    this.activeBody = null;
    this.line.material.opacity = 0;
    this.ring.visible = false;
  }

  hover(body) {
    this.hoverBody = body;
  }

  update(t) {
    const body = this.activeBody ?? this.hoverBody;
    const mat = this.glow.material;
    if (body) {
      this.glow.position.set(body.pos.x, 0.004, body.pos.y);
      this.glow.scale.setScalar(body.radius);
      const target = this.activeBody
        ? 0.35 + Math.sin(t * 6) * 0.12 + this.power * 0.3
        : 0.16 + Math.sin(t * 4) * 0.06;
      mat.opacity += (target - mat.opacity) * 0.35;
    } else {
      mat.opacity *= 0.85;
    }
  }
}
