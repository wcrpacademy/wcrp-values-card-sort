// Where to send: decided by where the page was loaded from (docs/PLAN.md §5).
// Online (the page came from config.onlineHost): the Apps Script web app.
// Offline (anywhere else, e.g. the laptop's IP): server.py on the same origin.
export function saveTarget(cfg) {
  if (location.hostname === cfg.onlineHost) return { mode: 'online', url: String(cfg.onlineEndpoint || '') };
  return { mode: 'offline', url: String(cfg.offlineEndpoint || '') };
}

/** Where the live and admin views read group counts: the Apps Script doGet online, server.py offline. */
export function readTarget(cfg) {
  const t = saveTarget(cfg);
  if (t.mode === 'online') return t;
  return { mode: 'offline', url: String(cfg.offlineLiveEndpoint || '') };
}

/** GET JSON, never from the browser cache. Rejects on network failure, timeout or a reply that isn't JSON. */
export async function getJson(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl.signal });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST JSON as text/plain (a "simple" request, so Apps Script needs no CORS preflight) and read the JSON reply.
 * Resolves to the reply object; rejects on network failure, timeout or a reply that isn't JSON.
 */
export async function postJson(url, body, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: ctrl.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
