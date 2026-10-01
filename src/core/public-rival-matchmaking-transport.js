const KEY = 'konk:public-search';
export function loadSearchTicket(storage) {
  try { return (storage ?? globalThis.sessionStorage)?.getItem(KEY) ?? null; } catch { return null; }
}
export function saveSearchTicket(ticket, storage) {
  try { storage ??= globalThis.sessionStorage; if (ticket) storage?.setItem(KEY, ticket); else storage?.removeItem(KEY); } catch { /* private browsing */ }
}
export function newSearchTicket() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), n => n.toString(16).padStart(2, '0')).join('');
}
export async function searchForRival(base, details, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(`${base}/matchmaking`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details), signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.error ?? 'Search unavailable'), { status: response.status });
    return body;
  } finally { clearTimeout(timeout); }
}
