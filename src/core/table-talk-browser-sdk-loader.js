let pending;

export function loadTableTalkBrowserSdk(documentObject = globalThis.document) {
  if (globalThis.LivekitClient) return Promise.resolve(globalThis.LivekitClient);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = documentObject.createElement('script');
    script.src = '/assets/vendor/livekit-client-2.22.3.umd.js';
    script.async = true;
    script.onload = () => globalThis.LivekitClient ? resolve(globalThis.LivekitClient) : reject(new Error('SDK unavailable'));
    script.onerror = () => { pending = null; reject(new Error('SDK unavailable')); };
    documentObject.head.append(script);
  });
  return pending;
}
