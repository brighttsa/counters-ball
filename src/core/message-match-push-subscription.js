// Play by message notifications: subscribe this device to "your move" pushes for one side of one match.
// iPhones only allow web push from the installed Home Screen app, so that case gets a hint instead.

// Public half of the match server's VAPID key (match-server/wrangler.toml VAPID_PUBLIC_KEY).
export const VAPID_PUBLIC_KEY = 'BLpzTuejTciUgcCBrrFCDewABuKpHfQetTVfarfjMpdTsV5uG4j-wcjnPUiU3EFMSLmb9NKimmIoE6ybYpX5zuI';

/**
 * 'ready' — can ask now · 'granted' — already allowed · 'install' — iPhone/iPad Safari: add to Home Screen first
 * · 'denied' — blocked in browser settings · 'unsupported' — this browser has no web push.
 */
export function pushAvailability(win = globalThis) {
  const nav = win.navigator;
  const ios = /iPad|iPhone|iPod/.test(nav?.userAgent ?? '') || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);
  const installed = win.matchMedia?.('(display-mode: standalone)').matches || nav?.standalone === true;
  if (!win.isSecureContext || !nav?.serviceWorker || !('PushManager' in win) || !('Notification' in win)) {
    return ios && !installed ? 'install' : 'unsupported';
  }
  if (win.Notification.permission === 'denied') return 'denied';
  return win.Notification.permission === 'granted' ? 'granted' : 'ready';
}

const keyBytes = (b64url) => Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Must run from a tap: the permission prompt needs a user gesture. Resolves true when subscribed. */
export async function subscribeToMatch({ api, matchId, side, win = globalThis }) {
  if (!api || !matchId) return false;
  if (await win.Notification.requestPermission() !== 'granted') return false;
  const registration = await win.navigator.serviceWorker.register('/sw.js');
  await win.navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const res = await win.fetch(`${api}/matches/${matchId}/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ side, subscription: subscription.toJSON() }),
  });
  return res.status === 204;
}
