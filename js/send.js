// Save queue for the card sort: the "join" ping and the result (docs/PLAN.md §5).
// Every item stays on the phone (localStorage) until the receiver replies {ok:true}. It is retried every
// 15 s, when the phone comes back online and when the page is opened again. Each item carries its own ID
// (device ID for joins, submission ID for results) and the receivers ignore repeats, so retries never
// create duplicate rows. The newsletter form does NOT use this queue: personal details are never stored.
import { saveTarget, postJson } from './endpoint.js';

const KEY = 'wcrp-cardsort-outbox-v1';
const RETRY_MS = 15000;

let cfg;
let outbox = [];
let running = null;
let timer = 0;
let hooks = { onSent() {}, onChange() {} };

export function initSender(config, h = {}) {
  cfg = config;
  hooks = { ...hooks, ...h };
  outbox = load();
  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flush();
  });
  flush();
}

/** False when no endpoint is set (e.g. onlineEndpoint still empty): results then stay on the phone only. */
export const canSend = () => Boolean(saveTarget(cfg).url);
export const isSending = () => running !== null;
export const isQueued = (id) => outbox.some((e) => e.id === id);

export function enqueue(id, body) {
  if (!isQueued(id)) {
    outbox.push({ id, body, queuedAt: new Date().toISOString() });
    save();
  }
  return flush();
}

/** Send everything waiting, oldest first. Safe to call often: only one run at a time. */
export function flush() {
  if (running) return running;
  const target = saveTarget(cfg);
  if (!target.url || !outbox.length) return Promise.resolve();
  clearTimeout(timer);
  timer = 0;

  running = (async () => {
    for (const item of [...outbox]) {
      let reply;
      try {
        reply = await postJson(target.url, { ...item.body, mode: target.mode });
      } catch {
        break; // offline, timed out or no receiver: try again later
      }
      if (reply && reply.ok === true) {
        outbox = outbox.filter((e) => e.id !== item.id);
        save();
        hooks.onSent(item.id);
      }
    }
  })().finally(() => {
    running = null;
    if (outbox.length) timer = setTimeout(flush, RETRY_MS);
    hooks.onChange();
  });
  hooks.onChange(); // now "sending"
  return running;
}

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string' && e.body && typeof e.body === 'object') : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(outbox));
  } catch {
    /* storage blocked: the queue still works while the page is open */
  }
}
