import { posters, formats, palettes, venues } from './data/campaign.js';
import { buildPoster, readyPoster } from './components/poster.js';
import { setMotionFrame } from './motion/tactile-motion.js';
import { filterCampaignPosters } from './data/collection-filter.js';
import { browserExport } from './components/browser-export.js';
import { hasVisualEdits, hasFinishedMotion } from './data/export-identity.js';
const $ = id => document.getElementById(id);
let edits = {}; try { edits = JSON.parse(localStorage.getItem('konk:social-campaign') || '{}'); } catch {}
const initial = new URLSearchParams(location.search).get('poster');
let current = posters.some(p => p.id === initial) ? initial : posters[0].id, format = 'portrait', root, running = false, animation, revision = 0;
const config = () => ({ ...posters.find(p => p.id === current), ...edits[current] });
const collection = () => filterCampaignPosters(posters, $('collection-filter').value, $('campaign-search').value);
const fields = ['headline', 'subheadline', 'question', 'closing', 'eyebrow', 'signature', 'cta', 'venue', 'logoPosition', 'decoration', 'caption', 'homeName', 'awayName', 'homeScore', 'awayScore'];
let localRenderer = ['localhost', '127.0.0.1'].includes(location.hostname) && Boolean(document.querySelector('meta[name="konk-local-renderer"]'));
function updateExportControls() {
  const c = config(), original = posters.find(p => p.id === c.id);
  const available = hasFinishedMotion(c, format) && !hasVisualEdits(c, original, format, 'mp4');
  $('export-video').disabled = !localRenderer && !available;
  $('export-video').title = localRenderer || available ? 'Download MP4' : 'Finished motion is portrait-only unless specified; custom motion needs the local renderer.';
}
$('composition-count').textContent = String(posters.length);
function message(text) { $('status').textContent = text; }
function save() { try { localStorage.setItem('konk:social-campaign', JSON.stringify(edits)); } catch { message('Browser storage is full. Download campaign data to keep your changes.'); } }
function resize() {
  if (!root) return; const f = formats[format], shell = $('preview-shell');
  const scale = Math.min((shell.clientWidth - 4) / f.width, (shell.clientHeight - 4) / f.height);
  $('preview').style.width = `${f.width * scale}px`; $('preview').style.height = `${f.height * scale}px`;
  root.style.transform = `scale(${scale})`;
}
function stop() { running = false; cancelAnimationFrame(animation); $('motion').textContent = '▶'; $('motion').setAttribute('aria-label', 'Play motion preview'); }
async function render(updateFields = false) {
  stop(); const version = ++revision, c = config();
  root = buildPoster(c, format); $('preview').replaceChildren(root); resize();
  $('current-title').textContent = `${c.id.slice(0, 2)} / ${c.title}`;
  $('dimensions').textContent = `${formats[format].width} × ${formats[format].height}`;
  $('motion').disabled = !c.motion; $('export-video').hidden = !c.motion;
  $('motion-label').textContent = c.motion ? `Motion edition · ${c.motionDuration || 3} seconds` : 'Still composition';
  updateExportControls();
  document.querySelectorAll('[data-poster]').forEach(button => button.setAttribute('aria-current', String(button.dataset.poster === current)));
  document.querySelectorAll('[data-format]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.format === format)));
  document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === c.palette)));
  $('mobile-poster').value = current;
  if (updateFields) {
    for (const field of fields) if ($(field)) { if (field === 'decoration') $(field).checked = c[field]; else $(field).value = c[field] ?? ''; }
    for (const field of ['background', 'foreground', 'accent']) $(field).value = c[field] || palettes[c.palette][field === 'foreground' ? 'ink' : field];
  }
  $('score-fields').hidden = c.layout !== 'score';
  $('twi-fields').hidden = c.layout !== 'twi-first';
  await readyPoster(root); if (version === revision) resize();
}
function change(key, value) { edits[current] = { ...edits[current], [key]: value }; save(); render(); }
let group;
for (const c of new URLSearchParams(location.search).has('export') ? [] : posters) {
  if (group !== c.group) { const label = document.createElement('p'); label.className = 'group-label'; label.textContent = c.group; label.dataset.group = c.group; $('gallery').append(label); group = c.group; }
  const button = document.createElement('button'); button.className = 'gallery-item'; button.dataset.poster = c.id;
  const thumb = document.createElement('div'); thumb.className = 'thumbnail'; const miniature = buildPoster(c); thumb.append(miniature);
  const label = document.createElement('span'); label.className = 'label'; label.textContent = c.title;
  const small = document.createElement('small'); small.textContent = `${c.id.slice(0, 2)} / ${c.motion ? 'Still + motion' : c.group}`; label.append(small); button.append(thumb, label);
  button.onclick = () => { current = c.id; render(true); }; $('gallery').append(button); readyPoster(miniature).catch(() => message('Source art could not load.'));
  const option = document.createElement('option'); option.value = c.id; option.textContent = c.title; $('mobile-poster').append(option);
}
for (const group of new Set(posters.map(p => p.group))) {
  const option = document.createElement('option'); option.textContent = group; $('collection-filter').append(option);
}
function filterGallery() {
  const visible = collection(), ids = new Set(visible.map(p => p.id));
  document.querySelectorAll('[data-poster]').forEach(button => button.hidden = !ids.has(button.dataset.poster));
  document.querySelectorAll('[data-group]').forEach(label => label.hidden = !visible.some(p => p.group === label.dataset.group));
  $('mobile-poster').replaceChildren(...visible.map(p => { const option = document.createElement('option'); option.value = p.id; option.textContent = p.title; return option; }));
  $('filter-count').textContent = `${visible.length} of ${posters.length} compositions`;
  $('empty-gallery').hidden = visible.length > 0; $('export-pack').disabled = visible.length === 0;
  if (visible.length && !ids.has(current)) { current = visible[0].id; render(true); }
  else $('mobile-poster').value = current;
}
$('collection-filter').onchange = filterGallery; $('campaign-search').oninput = filterGallery;
filterGallery();
for (const [id, f] of Object.entries(formats)) {
  const button = document.createElement('button'); button.dataset.format = id; button.textContent = { portrait: 'Portrait', square: 'Square', landscape: 'Landscape', story: 'Story' }[id]; button.title = `${f.label} · ${f.width} × ${f.height}`;
  button.onclick = () => { format = id; render(); }; $('formats').append(button);
}
for (const [id, name] of Object.entries(venues)) { const option = document.createElement('option'); option.value = id; option.textContent = name; $('venue').append(option); }
for (const [id, colors] of Object.entries(palettes)) {
  const button = document.createElement('button'); button.dataset.palette = id; button.style.background = colors.background; button.title = id; button.setAttribute('aria-label', `${id} colorway`);
  button.onclick = () => { edits[current] = { ...edits[current], palette: id, background: '', foreground: '', accent: '' }; save(); render(true); }; $('palettes').append(button);
}
for (const field of fields) $(field).addEventListener('input', () => change(field, field === 'decoration' ? $(field).checked : $(field).value));
for (const field of ['background', 'foreground', 'accent']) $(field).oninput = () => change(field, $(field).value);
$('mobile-poster').onchange = () => { current = $('mobile-poster').value; render(true); };
$('reset').onclick = () => { delete edits[current]; save(); render(true); };
$('gameplayImage').onchange = async event => {
  const file = event.target.files[0]; if (!file) return; if (file.size > 5e6) return message('Choose an image under 5 MB.');
  const reader = new FileReader(); reader.onload = () => change('gameplayImage', reader.result); reader.readAsDataURL(file);
};
$('clear-image').onclick = () => { change('gameplayImage', ''); $('gameplayImage').value = ''; };
$('copy-caption').onclick = async () => { try { await navigator.clipboard.writeText(config().caption); message('Caption copied.'); } catch { $('caption').select(); message('Select and copy the caption.'); } };
$('motion').onclick = () => {
  if (running) { stop(); render(); return; } running = true; $('motion').textContent = '❚❚'; $('motion').setAttribute('aria-label', 'Pause motion preview');
  const start = performance.now(); const frame = time => { setMotionFrame(root, ((time - start) / 1000) % (config().motionDuration || 4)); animation = requestAnimationFrame(frame); }; animation = requestAnimationFrame(frame);
};
let downloadURL;
function download(blob, name) {
  if (downloadURL) URL.revokeObjectURL(downloadURL);
  const a = document.createElement('a'); downloadURL = URL.createObjectURL(blob);
  a.href = downloadURL; a.download = name; a.textContent = `Download ${name}`;
  $('status').replaceChildren(document.createTextNode('Export ready. '), a); a.click();
}
async function exportAsset(kind, all = false) {
  stop(); const buttons = [$('export-png'), $('export-video'), $('export-pack')]; buttons.forEach(b => b.disabled = true); message(all ? 'Rendering collection. This may take a minute…' : `Rendering ${kind.toUpperCase()}…`);
  let exportPending = true;
  const progressTimer = localRenderer ? setInterval(async () => {
    try {
      const state = await (await fetch('/api/social-export-progress', { cache: 'no-store' })).json();
      if (exportPending && state.active) message(`${state.phase}${state.frames ? ` · frame ${state.frame}/${state.frames}` : ''}${all ? ` · ${state.index}/${state.total} compositions` : ''}`);
    } catch {}
  }, 1000) : null;
  try {
    await render();
    const selected = all ? collection().map(p => ({ ...p, ...edits[p.id] })) : [config()];
    const request = { kind, format, pack: all, configs: selected };
    let blob;
    if (localRenderer) {
      try {
        const response = await fetch('/api/social-export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
        if (!response.ok) throw Error((await response.json()).error || 'Export failed');
        blob = await response.blob();
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        localRenderer = false; blob = await browserExport(request, message);
      }
    } else blob = await browserExport(request, message);
    download(blob, all ? `KONKERS-${format}-collection.zip` : `${current}-${format}.${kind}`);
  } catch (error) { message(error.message); }
  finally { exportPending = false; clearInterval(progressTimer); buttons.forEach(b => b.disabled = false); $('export-pack').disabled = collection().length === 0; updateExportControls(); }
}
$('export-png').onclick = () => exportAsset('png'); $('export-video').onclick = () => exportAsset('mp4'); $('export-pack').onclick = () => exportAsset('png', true);
$('save-config').onclick = () => download(new Blob([JSON.stringify(posters.map(p => ({ ...p, ...edits[p.id] })), null, 2)], { type: 'application/json' }), 'konk-campaign-data.json');
new ResizeObserver(resize).observe($('preview-shell'));
window.renderSocialPoster = async (c, f, time = -1) => {
  document.body.classList.add('export-mode'); const node = buildPoster(c, f);
  document.body.querySelector(':scope > .poster')?.remove(); document.body.append(node); await readyPoster(node);
  if (time >= 0) setMotionFrame(node, time); return true;
};
window.setSocialMotionFrame = time => setMotionFrame(document.body.querySelector(':scope > .poster'), time);
if (!new URLSearchParams(location.search).has('export')) render(true);
