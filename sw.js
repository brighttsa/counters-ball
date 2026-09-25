// KONK! service worker: shows Play by message "your move" notifications and opens the match when tapped.
// It deliberately caches nothing, so every visit still loads the latest game.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { /* a malformed push still shows a generic nudge */ }
  const url = typeof data.url === 'string' && data.url.startsWith(self.location.origin) ? data.url : self.location.origin;
  event.waitUntil(self.registration.showNotification(data.title || 'Your move in KONK!', {
    body: data.body || '', tag: data.tag || 'konk-move', renotify: true,
    icon: '/assets/konk-app-icon-192.png', badge: '/assets/konk-app-icon-192.png', data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) { await open.focus(); return open.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
