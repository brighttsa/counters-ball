import { createSeededRandom } from '../core/seeded-random-number-generator.js';

/** Original two-ink cap print. No third-party artwork or raster assets. */
export function paintInkCapPoster(canvas) {
  canvas.width = 800; canvas.height = 600;
  const ctx = canvas.getContext('2d'), rng = createSeededRandom(42022);
  ctx.strokeStyle = '#f5f1df'; ctx.lineCap = 'square';
  for (const [x, y, length, width] of [[85, 475, 240, 18], [160, 515, 175, 7], [30, 405, 220, 6]]) {
    ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y - length * .55); ctx.stroke();
  }
  ctx.save(); ctx.translate(390, 300); ctx.rotate(-.3); ctx.scale(1, .76);
  ctx.fillStyle = '#101514'; ctx.strokeStyle = '#f5f1df'; ctx.lineWidth = 12;
  ctx.beginPath();
  for (let i = 0; i < 84; i++) {
    const a = i * Math.PI / 42, r = i % 4 < 2 ? 208 : 198;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 26);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#cb4936'; ctx.beginPath(); ctx.ellipse(0, 0, 187, 183, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#101514'; ctx.lineWidth = 12; ctx.stroke();
  ctx.strokeStyle = '#efca46'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 178, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#101514';
  for (let y = -180; y < 180; y += 12) for (let x = -180; x < 180; x += 12) {
    if (x + y < 50) continue;
    ctx.beginPath(); ctx.arc(x, y, 1.6 + Math.max(0, y) / 100, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f5f1df';
  for (let i = 0; i < 65; i++) ctx.fillRect((rng() - .5) * 360, (rng() - .5) * 360, 2 + rng() * 13, 1.4);
  ctx.restore();
  ctx.fillStyle = '#efca46'; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 40 : 96;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#f5f1df'; ctx.strokeStyle = '#101514'; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; ctx.lineTo(670 + Math.cos(a) * 38, 126 + Math.sin(a) * 35); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(645, 112); ctx.lineTo(677, 134); ctx.lineTo(664, 155); ctx.stroke();
}
