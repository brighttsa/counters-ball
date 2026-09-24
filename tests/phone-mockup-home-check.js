const devices = [
  { name: 'iPhone SE', family: 'ios', w: 320, h: 568, safeTop: 28, safeBottom: 18 },
  { name: 'iPhone 14', family: 'ios', w: 390, h: 844, safeTop: 54, safeBottom: 26 },
  { name: 'iPhone 14 Pro Max', family: 'ios', w: 430, h: 932, safeTop: 59, safeBottom: 28 },
  { name: 'Samsung S20', family: 'android', w: 360, h: 800, safeTop: 32, safeBottom: 16 },
  { name: 'Samsung S23 Ultra', family: 'android', w: 412, h: 915, safeTop: 34, safeBottom: 18 },
  { name: 'iPhone SE landscape', family: 'ios', w: 568, h: 320, landscape: true, safeLeft: 44, safeRight: 24, safeTop: 8, safeBottom: 8 },
  { name: 'iPhone 14 landscape', family: 'ios', w: 844, h: 390, landscape: true, safeLeft: 68, safeRight: 24, safeTop: 8, safeBottom: 16 },
  { name: 'iPhone 14 Pro Max landscape', family: 'ios', w: 932, h: 430, landscape: true, safeLeft: 72, safeRight: 24, safeTop: 8, safeBottom: 16 },
  { name: 'Samsung S20 landscape', family: 'android', w: 800, h: 360, landscape: true, safeLeft: 24, safeRight: 24, safeTop: 8, safeBottom: 8 },
  { name: 'Samsung S23 Ultra landscape', family: 'android', w: 915, h: 412, landscape: true, safeLeft: 24, safeRight: 24, safeTop: 8, safeBottom: 8 },
];

const root = document.getElementById('devices');
const summary = document.getElementById('summary');
const results = new Map();

function updateSummary() {
  const values = [...results.values()];
  if (values.length < devices.length) {
    summary.textContent = `Running checks ${values.length}/${devices.length}`;
    summary.classList.remove('fail');
    return;
  }
  const failed = values.filter(result => !result.pass);
  summary.textContent = failed.length
    ? `${devices.length - failed.length}/${devices.length} pass · ${failed.map(result => `${result.name}: ${result.message}`).join(' · ')}`
    : `${devices.length}/${devices.length} pass · no notch overlap, no vertical scroll, utilities below Play`;
  summary.classList.toggle('fail', failed.length > 0);
}
function createDevice(device) {
  const card = document.createElement('section');
  card.className = `device${device.landscape ? ' wide' : ''}`;
  card.innerHTML = `<div class="label"><b>${device.name}</b><span class="status">Loading</span></div>
    <div class="phone ${device.family === 'android' ? 'android' : ''} ${device.landscape ? 'landscape' : ''}" style="--w:${device.w}px;--h:${device.h}px">
      <iframe title="${device.name}" src="/"></iframe>
    </div>`;
  const iframe = card.querySelector('iframe');
  const status = card.querySelector('.status');
  iframe.addEventListener('load', () => checkFrame(iframe, device, status));
  return card;
}

function rectOf(doc, selector) {
  const el = doc.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function visibleButtons(doc) {
  return [...doc.querySelectorAll('.screen-title button:not([hidden])')].map(el => {
    const r = el.getBoundingClientRect();
    const style = doc.defaultView.getComputedStyle(el);
    return { text: el.textContent.trim().replace(/\s+/g, ' '), display: style.display, visibility: style.visibility,
      opacity: Number(style.opacity), x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }).filter(button => button.display !== 'none' && button.visibility !== 'hidden' && button.opacity > 0.01 && button.width > 0 && button.height > 0);
}

function visibleContentRects(doc) {
  return ['.home-logo', '.home-edition', '.home-location', '.screen-title .menu-stack', '.title-stars', '.home-utilities']
    .map(selector => {
      const el = doc.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = doc.defaultView.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= 0.01 || r.width <= 0 || r.height <= 0) return null;
      return { selector, x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    })
    .filter(Boolean);
}

async function waitForHome(iframe) {
  const started = performance.now();
  while (performance.now() - started < 8000) {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    const screen = doc?.querySelector('.screen-title');
    if (win?.__countersBall && screen?.classList.contains('is-active')) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

async function checkFrame(iframe, device, status) {
  const ready = await waitForHome(iframe);
  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!ready) {
    doc.body.dataset.screen = 'title';
    const screen = doc.querySelector('.screen-title');
    if (screen) screen.classList.add('is-active');
  }
  const buttons = visibleButtons(doc);
  const primaryPlay = rectOf(doc, '.screen-title .home-featured');
  const settings = buttons.find(button => button.text === 'SETTINGS');
  const credits = buttons.find(button => button.text === 'CREDITS');
  const utility = rectOf(doc, '.home-utilities');
  const menu = rectOf(doc, '.screen-title .menu-stack');
  const safe = {
    top: device.safeTop ?? 0,
    right: device.safeRight ?? 0,
    bottom: device.safeBottom ?? 0,
    left: device.safeLeft ?? 0,
  };
  const contentRects = visibleContentRects(doc);
  const unsafe = contentRects.filter(rect => (
    rect.x < safe.left - 1 ||
    rect.y < safe.top - 1 ||
    rect.right > win.innerWidth - safe.right + 1 ||
    rect.bottom > win.innerHeight - safe.bottom + 1
  ));
  const overflow = buttons.filter(button => button.x < -1 || button.y < -1 || button.right > win.innerWidth + 1 || button.bottom > win.innerHeight + 1);
  const tinyTargets = buttons.filter(button => button.width < 44 || button.height < 34);
  const utilityAfterPlay = Boolean(primaryPlay && utility && settings && credits && utility.y >= primaryPlay.bottom - 1);
  const noHorizontalScroll = doc.documentElement.scrollWidth <= win.innerWidth + 1;
  const noVerticalScroll = doc.documentElement.scrollHeight <= win.innerHeight + 1;
  const pass = !overflow.length && !unsafe.length && !tinyTargets.length && utilityAfterPlay && noHorizontalScroll && noVerticalScroll;
  status.textContent = pass ? (ready ? 'PASS app' : 'PASS CSS fallback') : [
    overflow.length ? `overflow ${overflow.map(item => item.text).join(', ')}` : '',
    unsafe.length ? `notch/safe ${unsafe.map(item => item.selector).join(', ')}` : '',
    tinyTargets.length ? `small ${tinyTargets.map(item => item.text).join(', ')}` : '',
    utilityAfterPlay ? '' : 'utilities above Play',
    noHorizontalScroll ? '' : `x-scroll ${doc.documentElement.scrollWidth}>${win.innerWidth}`,
    noVerticalScroll ? '' : `y-scroll ${doc.documentElement.scrollHeight}>${win.innerHeight}`,
  ].filter(Boolean).join(' · ');
  status.classList.toggle('fail', !pass);
  results.set(device.name, { name: device.name, pass, message: status.textContent });
  updateSummary();
  status.title = JSON.stringify({ device, safe, mode: ready ? 'app' : 'css-fallback', viewport: [win.innerWidth, win.innerHeight], primaryPlay, menu, utility, contentRects, buttons }, null, 2);
}

root.replaceChildren(...devices.map(createDevice));
