const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => 1 - (1 - clamp(value)) ** 3;
export function setFeatureMotionFrame(root, seconds) {
  const unit = parseFloat(root.style.getPropertyValue('--unit'));
  root.querySelectorAll('.headline .line').forEach((line, i) => {
    const progress = ease((seconds - i * .18) / .45);
    line.style.opacity = String(progress);
    line.style.translate = `${(1 - progress) * -50 * unit}px 0`;
  });
  const caps = root.querySelectorAll('.cap:not(.champion)');
  caps.forEach((cap, i) => {
    const progress = ease((seconds - .55 - i * .1) / .65);
    cap.style.translate = `${(1 - progress) * (i % 2 ? 180 : -180) * unit}px 0`;
    cap.style.rotate = `${(1 - progress) * (i % 2 ? -25 : 25)}deg`;
    cap.style.opacity = String(progress);
  });
  const champion = root.querySelector('.champion');
  if (champion) {
    const progress = ease((seconds - 1.65) / .5);
    champion.style.scale = String(.8 + .2 * progress); champion.style.opacity = String(progress);
  }
  root.querySelectorAll('.voice-quote,.voice-response').forEach((line, i) => {
    const progress = ease((seconds - 1.2 - i * .7) / .3);
    line.style.opacity = String(progress); line.style.translate = `0 ${(1 - progress) * 12 * unit}px`;
  });
  root.querySelector('.subheadline').style.opacity = String(ease((seconds - 1.8) / .45));
  root.querySelector('.poster-footer').style.opacity = String(ease((seconds - 2.3) / .4));
}
