// localStorage state + resume. One key per device; shape in docs/FRONTEND_PLAN.md §7.

const KEY = 'wcrp-cardsort-v1';

export const PILE_KEYS = ['very', 'important', 'not'];
const STEPS = ['start', 'sort', 'review', 'choose', 'rank', 'results'];

// Unambiguous characters for the anonymous code (no 0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Random UUID. crypto.randomUUID only exists in secure contexts (https or localhost),
 * and offline mode is served over plain http from the laptop's IP, so fall back to
 * getRandomValues, which works everywhere.
 */
export function uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Anonymous participant code, e.g. "P-7F3K". Links to nothing about the person. */
export function randomCode() {
  let out = '';
  for (const x of crypto.getRandomValues(new Uint8Array(8))) {
    if (out.length === 4) break;
    if (x < 248) out += CODE_CHARS[x % 31]; // 248 = 8 × 31: rejection keeps it unbiased
  }
  return out.length === 4 ? `P-${out}` : randomCode();
}

/**
 * A fresh session. deviceId and the join flag survive "Start over", so the live
 * "Joined" counter never counts the same phone twice.
 */
export function newState(cfg, deviceId = uuid(), joinSent = false) {
  return {
    deviceId,
    submissionId: uuid(),
    code: '',
    step: 'start',
    order: [],
    index: 0,
    piles: { very: [], important: [], not: [] },
    top: [],
    ranked: [],
    sent: { join: joinSent, result: false },
    listVersion: cfg.listVersion,
  };
}

export function resetState(old, cfg) {
  return newState(cfg, old.deviceId, Boolean(old.sent && old.sent.join));
}

/**
 * The session to continue with. A saved session is dropped (device ID and join flag
 * are kept) when it was made with another list version, no longer matches the cards
 * in values.json, or is damaged. lostProgress is true when that threw away sorting.
 */
export function restoreState(cfg, listIds) {
  const saved = readSaved();
  if (!saved) return { state: newState(cfg), lostProgress: false };
  if (saved.listVersion === cfg.listVersion && fitState(saved, listIds, cfg.topN)) {
    return { state: saved, lostProgress: false };
  }
  return { state: resetState(saved, cfg), lostProgress: saved.step !== 'start' };
}

/** Returns false when storage is unavailable (e.g. blocked site data); the page still works in memory. */
export function saveState(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

function readSaved() {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
  if (!s || typeof s !== 'object' || typeof s.deviceId !== 'string' || !s.deviceId) return null;
  return s;
}

/**
 * Checks a saved session against the current cards and topN. Returns false when it
 * can't be used. Otherwise moves it back to the last step that still makes sense
 * (for example when topN changed while someone was choosing) and returns true.
 */
function fitState(s, listIds, topN) {
  const isIdList = (a) => Array.isArray(a) && a.every((x) => typeof x === 'string');
  const unique = (a) => new Set(a).size === a.length;

  if (!STEPS.includes(s.step) || !isIdList(s.order) || !isIdList(s.top) || !isIdList(s.ranked)) return false;
  if (!s.piles || !PILE_KEYS.every((p) => isIdList(s.piles[p]))) return false;
  if (!s.sent || typeof s.sent !== 'object') return false;
  if (s.step === 'start') return true; // nothing sorted yet; the order is made when sorting starts

  // The cards must be exactly the current list.
  const list = new Set(listIds);
  if (s.order.length !== list.size || !unique(s.order) || !s.order.every((id) => list.has(id))) return false;

  // The sorted cards must be exactly the first `index` cards, each in one pile.
  if (!Number.isInteger(s.index) || s.index < 0 || s.index > s.order.length) return false;
  const sorted = PILE_KEYS.flatMap((p) => s.piles[p]);
  const done = new Set(s.order.slice(0, s.index));
  if (sorted.length !== done.size || !unique(sorted) || !sorted.every((id) => done.has(id))) return false;

  if (s.index < s.order.length) {
    s.step = 'sort';
    s.top = [];
    s.ranked = [];
    return true;
  }
  if (s.step === 'sort') s.step = 'review';

  // Finished: keep what was ranked, even if topN was changed afterwards.
  if (s.step === 'results') {
    return s.ranked.length > 0 && unique(s.ranked) && s.ranked.every((id) => done.has(id));
  }

  const pool = new Set([...s.piles.very, ...s.piles.important]);
  s.top = [...new Set(s.top)].filter((id) => pool.has(id)).slice(0, topN);
  const rankedFits =
    s.top.length === topN && s.ranked.length === topN && unique(s.ranked) && s.top.every((id) => s.ranked.includes(id));
  if (s.step === 'rank' && !rankedFits) s.step = 'choose';
  if (s.step === 'choose' && pool.size < topN) s.step = 'review';
  return true;
}
