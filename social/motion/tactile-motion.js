import { setTwiMotionFrame } from './twi-first-motion.js';
import { setFeatureMotionFrame } from './feature-motion.js';
const ease = t => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
export function setMotionFrame(root, seconds) {
  if (root.classList.contains('feature')) return setFeatureMotionFrame(root, seconds);
  if (root.classList.contains('twi-first')) return setTwiMotionFrame(root, seconds);
  const unit = parseFloat(root.style.getPropertyValue('--unit'));
  root.querySelectorAll('.headline .line').forEach((line, index) => {
    const t = Math.max(0, seconds - .15 - index * .18);
    const progress = ease(t / .65);
    line.style.opacity = String(progress);
    line.style.transform = `translateX(${(1 - progress) * -80 * unit}px)`;
  });
  const cap = root.querySelector('.cap');
  if (cap) {
    const t = Math.max(0, seconds - .5); const progress = ease(t / .8);
    const kick = t > .8 && t < 1.1 ? Math.sin((t - .8) / .3 * Math.PI) * 8 : 0;
    cap.style.translate = `${(1 - progress) * 550 * unit}px ${-kick * unit}px`;
    cap.style.rotate = `${(1 - progress) * 90}deg`;
  }
  const ball = root.querySelector('.ball');
  if (ball) ball.style.translate = `${(1 - ease((seconds - .65) / .8)) * -350 * unit}px 0`;
  const signature = root.querySelector('.signature');
  signature.style.opacity = String(ease((seconds - 1.1) / .45));
}
