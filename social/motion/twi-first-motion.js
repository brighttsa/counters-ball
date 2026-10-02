const clamp = t => Math.max(0, Math.min(1, t));
const ease = t => 1 - (1 - clamp(t)) ** 3;
export function setTwiMotionFrame(root, seconds) {
  const t = Math.max(0, seconds), art = root.querySelector('.art'), width = art.clientWidth;
  const hero = root.querySelector('.headline');
  hero.style.opacity = String(clamp(t / .12));
  hero.style.transform = `translateY(${(1 - ease(t / .35)) * -110}px) scale(${1 + (1 - ease(t / .35)) * .12})`;
  root.querySelector('.twi-question').style.opacity = String(ease((t - .45) / .3));
  const shot = ease((t - 1) / .8), impact = t >= 1.8;
  const cap = root.querySelector('.cap'), ball = root.querySelector('.ball');
  cap.style.translate = `${width * .215 * shot}px 0`;
  cap.style.rotate = `${shot * 22}deg`;
  ball.style.translate = `${width * .34 * ease((t - 1.8) / .65)}px 0`;
  ball.style.rotate = `${ease((t - 1.8) / .65) * 160}deg`;
  const jolt = impact && t < 2.02 ? Math.sin((t - 1.8) * 90) * (1 - (t - 1.8) / .22) * 5 : 0;
  art.style.translate = `${jolt}px 0`;
  const burst = root.querySelector('.chalk-impact');
  burst.style.opacity = String(impact ? 1 - clamp((t - 1.8) / .24) : 0);
  root.querySelectorAll('.subheadline span').forEach((line, i) => {
    const start = [.7, 1.1, 1.8][i] ?? 1.8, p = i === 2 ? Number(impact) : ease((t - start) / .2);
    line.style.opacity = String(p); line.style.transform = `translateY(${(1 - p) * 14}px)`;
  });
  root.querySelector('.twi-closing').style.opacity = String(ease((t - 2.8) / .3));
  const end = root.querySelector('.twi-end-card'); end.style.display = t >= 4.5 ? 'flex' : 'none';
  end.style.opacity = String(ease((t - 4.5) / .25));
}
