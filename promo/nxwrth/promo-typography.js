const CHALK = '#fdf6e6';
const GOLD = '#f4d43e';

export function createPromoTypography(canvas) {
  const context = canvas.getContext('2d');
  const logo = new Image();
  logo.src = '../../assets/konk-logo.svg';
  let previous = '', current = {};
  logo.onload = () => { if (current.text === 'KONK!') { previous = ''; draw(current); } };

  function draw(message = {}) {
    current = { ...message };
    const { text = '', sub = '', reveal = false, blackout = false } = current;
    const key = `${text}|${sub}|${reveal}|${blackout}|${canvas.width}x${canvas.height}`;
    if (key === previous) return;
    previous = key;
    const width = canvas.width, height = canvas.height;
    context.clearRect(0, 0, width, height);
    if (blackout) { context.fillStyle = '#000'; context.fillRect(0, 0, width, height); }
    if (!text) return;
    const isReveal = text === 'NXWRTH' || text.startsWith('NXWRTH ');
    const endCard = text === 'KONK!' && sub.includes('GHANA TO THE WORLD');
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(isReveal ? -0.012 : -0.006);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'bevel';
    if (endCard && logo.complete && logo.naturalWidth) {
      const ratio = logo.naturalWidth / logo.naturalHeight;
      const logoWidth = Math.min(width * 0.74, height * 0.38 * ratio);
      context.drawImage(logo, -logoWidth / 2, -height * 0.31, logoWidth, logoWidth / ratio);
    } else {
      const size = isReveal ? Math.min(height * 0.34, width * 0.30)
        : text.length > 21 ? Math.min(height * 0.19, width * 0.12)
          : text.length > 14 ? Math.min(height * 0.23, width * 0.16)
            : Math.min(height * 0.30, width * 0.18);
      context.font = `900 ${Math.round(size)}px Anton, Impact, sans-serif`;
      const maxWidth = width * 0.88;
      context.fillStyle = 'rgba(8, 10, 9, .72)';
      context.fillText(text, 10, 12, maxWidth);
      context.strokeStyle = '#171815';
      context.lineWidth = Math.max(7, size * 0.055);
      context.strokeText(text, 0, 0, maxWidth);
      context.fillStyle = isReveal ? GOLD : CHALK;
      context.fillText(text, 0, 0, maxWidth);
      context.globalAlpha = 0.16;
      context.fillStyle = '#302820';
      for (let i = 0; i < 180; i++) {
        const x = ((i * 127.1) % (width * 0.9)) - width * 0.45;
        const y = ((i * 311.7) % (size * 0.72)) - size * 0.36;
        context.fillRect(x, y, 2 + i % 5, 2 + i % 3);
      }
    }
    if (sub) {
      context.globalAlpha = 1;
      context.fillStyle = CHALK;
      context.strokeStyle = '#171815';
      context.lineWidth = 6;
      const lines = sub.length > 38 ? sub.split(' · ') : [sub];
      const subSize = Math.min(height * (lines.length > 1 ? 0.045 : 0.068), width * 0.066);
      context.font = `700 ${Math.round(subSize)}px Anton, Impact, sans-serif`;
      const firstY = endCard ? height * 0.26 : height * 0.15;
      lines.forEach((line, index) => {
        const y = firstY + (lines.length > 1 ? index * subSize * 1.28 : 0);
        context.strokeText(line, 0, y, width * 0.88);
        context.fillText(line, 0, y, width * 0.88);
      });
    }
    context.restore();
  }

  function resize(aspect, width) {
    const nextWidth = Math.round(width || (aspect < 0.8 ? 1080 : 2048));
    const nextHeight = Math.round(nextWidth / aspect);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth; canvas.height = nextHeight; previous = '';
    }
    draw(current);
  }

  return { draw, resize, dispose() { canvas.width = 0; canvas.height = 0; } };
}
