// Projector view: polls the read endpoint every 5 s and shows joins, progress and the most chosen values.
// Group counts only. The chart stays hidden until liveMinResponses people have finished (also enforced
// by the receiver), so no one can be identified from the first few answers.
import { readTarget, getJson } from './endpoint.js';

const POLL_MS = 5000;
const $ = (sel) => document.querySelector(sel);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cfg = window.CARD_SORT_CONFIG || {};

let lastOk = 0;
let failing = false;
let shownJoined = 0;

if (cfg.liveView === false) {
  $('#live').hidden = true;
  $('#off').hidden = false;
} else {
  start();
}

function start() {
  const target = readTarget(cfg);
  const min = Number(cfg.liveMinResponses) || 5;
  $('#event-name').textContent = (cfg.eventName && typeof cfg.eventName === 'object' ? cfg.eventName.en : cfg.eventName) || ''; // English on the projector
  $('#top-n').textContent = Number(cfg.topN) === 10 ? 10 : 5;
  $('#min-n').textContent = min;
  const joinUrl = target.mode === 'online' ? cfg.onlineHost : location.host;
  $('#join-url').textContent = joinUrl;
  $('#qr-full-url').textContent = joinUrl;
  const qr = $('#qr');
  const qrBtn = $('#qr-btn');
  qr.addEventListener('error', () => (qrBtn.hidden = true));
  qr.src = `qr/${target.mode}.svg`;
  $('#qr-full-img').src = qr.src;
  wireQrFull(qrBtn, $('#qr-full'));

  if (!target.url) {
    setStatus(target.mode === 'online' ? 'Not connected: onlineEndpoint is empty in config.js' : 'Not connected: offlineLiveEndpoint is empty in config.js', true);
    return;
  }
  poll(target.url, min);
  setInterval(renderAgo, 1000);
}

/** The small QR opens a full-screen one (polling carries on underneath). Esc closes it natively;
 *  a click anywhere closes it too, and focus returns to the small QR. */
function wireQrFull(btn, dlg) {
  if (typeof dlg.showModal !== 'function') return; // very old browser: the small QR still works
  btn.addEventListener('click', () => dlg.showModal());
  dlg.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => btn.focus());
}

async function poll(url, min) {
  try {
    const data = await getJson(url);
    if (!data || data.ok !== true) throw new Error('bad reply');
    render(data, min);
    lastOk = Date.now();
    failing = false;
    renderAgo();
  } catch {
    failing = true; // keep the last numbers on screen
    renderAgo();
  } finally {
    setTimeout(() => poll(url, min), POLL_MS);
  }
}

function render(d, min) {
  const joined = Math.max(0, Number(d.joined) || 0);
  const finished = Math.max(0, Number(d.finished) || 0);
  const sorting = Math.max(0, Number(d.sorting) || 0);
  countTo(joined);
  $('#sorting').textContent = sorting;
  $('#finished').textContent = finished;
  $('#progress').style.width = `${joined ? Math.min(100, (finished / joined) * 100) : 0}%`;

  const top = Array.isArray(d.top) ? d.top.slice(0, 10) : [];
  const ready = finished >= min && top.length > 0;
  $('#bars').hidden = !ready;
  $('#waiting').hidden = ready;
  if (!ready) {
    const left = Math.max(0, min - finished);
    $('#waiting-left').textContent = left ? `${left} more to go` : '';
    return;
  }
  renderBars(top);
}

/** Rows are reused by value name, so bars glide to their new length instead of jumping. */
function renderBars(top) {
  const list = $('#bars');
  const max = Math.max(...top.map((t) => Number(t.count) || 0), 1);
  const old = new Map([...list.children].map((li) => [li.dataset.value, li]));
  const rows = top.map((t, i) => {
    const name = String(t.value);
    let li = old.get(name);
    if (!li) {
      li = document.createElement('li');
      li.dataset.value = name;
      li.innerHTML = '<span class="bars__rank"></span><span class="bars__name"></span><span class="bars__track"><span class="bars__fill"></span></span><span class="bars__count"></span>';
      li.querySelector('.bars__name').textContent = name;
    }
    li.querySelector('.bars__rank').textContent = i + 1;
    li.querySelector('.bars__count').textContent = t.count;
    li.querySelector('.bars__fill').style.width = `${(Number(t.count) / max) * 100}%`;
    return li;
  });
  list.replaceChildren(...rows);
}

/** The Joined number ticks up rather than jumping (instant with reduced motion). */
function countTo(target) {
  const el = $('#joined');
  if (target === shownJoined) return;
  const from = shownJoined;
  shownJoined = target;
  if (reduceMotion.matches || target < from) {
    el.textContent = target;
    return;
  }
  el.classList.add('is-ticking');
  const t0 = performance.now();
  const dur = Math.min(1200, 250 * (target - from));
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(from + (target - from) * p);
    if (p < 1) requestAnimationFrame(step);
    else setTimeout(() => el.classList.remove('is-ticking'), 400);
  };
  requestAnimationFrame(step);
}

function renderAgo() {
  if (!lastOk) {
    setStatus(failing ? 'Reconnecting…' : 'Connecting…', failing);
    return;
  }
  const s = Math.round((Date.now() - lastOk) / 1000);
  setStatus(failing ? `Reconnecting… (last update ${s} s ago)` : `Updated ${s} s ago`, failing);
}

function setStatus(text, warn) {
  const el = $('#status');
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('is-warning', Boolean(warn));
}
