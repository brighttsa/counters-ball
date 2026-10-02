import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { exportRequest } from './render-exports.mjs';
import { posters, formats, palettes, venues } from '../../social/data/campaign.js';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const port = Number(process.env.SOCIAL_PORT || 4186); let exporting = false;
let progress = { active: false };
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.json': 'application/json', '.zip': 'application/zip', '.md': 'text/plain' };
function validate(body) {
  if (body.pack != null && typeof body.pack !== 'boolean') throw Error('Invalid collection option');
  if (!formats[body.format] || !['png', 'mp4'].includes(body.kind) || !Array.isArray(body.configs) || !body.configs.length || body.configs.length > posters.length) throw Error('Invalid export selection');
  for (const c of body.configs) {
    const source = posters.find(p => p.id === c.id);
    if (!source || c.layout !== source.layout || !palettes[c.palette] || !venues[c.venue]) throw Error('Invalid composition');
    for (const key of ['headline', 'subheadline', 'question', 'closing', 'eyebrow', 'signature', 'cta', 'homeName', 'awayName', 'homeScore', 'awayScore']) if (c[key] != null && String(c[key]).length > 500) throw Error('Copy is too long');
    if (c.motionDuration && c.motionDuration !== source.motionDuration) throw Error('Invalid motion duration');
    if (c.gameplayImage && !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(c.gameplayImage)) throw Error('Use a local uploaded image');
    for (const key of ['background', 'foreground', 'accent']) if (c[key] && !/^#[0-9a-f]{6}$/i.test(c[key])) throw Error('Invalid color');
    if (!['top-right', 'top-left', 'bottom-right'].includes(c.logoPosition)) throw Error('Invalid logo position');
    if (body.kind === 'mp4' && !source.motion) throw Error('This composition has no motion edition');
  }
}
createServer(async (req, res) => {
  const json = (status, error) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error })); };
  try {
    if (req.url === '/api/social-capabilities' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ customExport: true })); return;
    }
    if (req.url === '/api/social-export-progress' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(progress)); return;
    }
    if (req.url === '/api/social-export' && req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return json(403, 'Origin not allowed');
      if (exporting) return json(429, 'Another export is in progress');
      const chunks = []; let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 8e6) return json(413, 'Export request too large'); chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks)); validate(body); exporting = true;
      progress = { active: true, phase: 'Preparing export', index: 1, total: body.configs.length, frame: 0, frames: 0 };
      try { const result = await exportRequest(body, `http://127.0.0.1:${port}`, detail => { progress = { active: true, ...detail }; });
        res.writeHead(200, { 'Content-Type': body.pack || body.configs.length > 1 ? 'application/zip' : body.kind === 'mp4' ? 'video/mp4' : 'image/png', 'Cache-Control': 'no-store' }); res.end(result);
      } finally { exporting = false; progress = { ...progress, active: false }; } return;
    }
    if (req.method !== 'GET') return json(405, 'Method not allowed');
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/') { res.writeHead(302, { Location: '/social/' }); return res.end(); }
    if (!/^\/(social\/|vendor\/fonts\/|assets\/konk-)/.test(path)) return json(404, 'Not found');
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, `.${path}`); if (!file.startsWith(root + '/')) return json(403, 'Not allowed');
    await stat(file); let content = await readFile(file);
    if (path === '/social/index.html') content = content.toString().replace('</head>', '<meta name="konk-local-renderer" content="true"></head>');
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(content);
  } catch (error) { json(error.code === 'ENOENT' ? 404 : 400, error.message); }
}).listen(port, '127.0.0.1', () => console.log(`KONK campaign studio: http://localhost:${port}/social/`));
