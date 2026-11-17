// Organiser view: PIN, then joined / sorting / finished and every value's count, refreshed every 10 s.
// The PIN only hides this page (its SHA-256 hash is in config.js); the data behind it is group counts,
// and the full results stay in the private Google Sheet (online) or on the laptop (offline).
import { readTarget, getJson } from './endpoint.js';
import { sha256Hex } from './sha256.js';

const KEY = 'wcrp-cardsort-admin';
const REFRESH_MS = 10000;
const $ = (sel) => document.querySelector(sel);
const cfg = window.CARD_SORT_CONFIG || {};
const expected = String(cfg.adminPinHash || '').trim().toLowerCase();

let timer = 0;
let lastCounts = [];
let lastFinished = 0;

init();

function init() {
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    $('#nopin').hidden = false;
    return;
  }
  let ok = false;
  try {
    ok = sessionStorage.getItem(KEY) === expected;
  } catch {
    /* storage blocked: ask every time */
  }
  if (ok) unlock(false);
  else {
    $('#lock').hidden = false;
    $('#pin').focus();
  }
  $('#pin-form').addEventListener('submit', checkPin);
}

async function checkPin(e) {
  e.preventDefault();
  const input = $('#pin');
  const btn = $('#pin-btn');
  if (btn.getAttribute('aria-disabled') === 'true') return;
  btn.setAttribute('aria-disabled', 'true');
  const [hash] = await Promise.all([sha256Hex(input.value.trim()), new Promise((r) => setTimeout(r, 400))]); // slows guessing a little
  btn.removeAttribute('aria-disabled');
  if (hash === expected) {
    try {
      sessionStorage.setItem(KEY, hash);
    } catch {
      /* fine: it just asks again next time */
    }
    input.value = '';
    unlock(true);
    return;
  }
  $('#pin-error').hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', 'pin-error');
  input.select();
}

function unlock(focus) {
  $('#lock').hidden = true;
  $('#dash').hidden = false;
  $('#event-name').textContent = (cfg.eventName && typeof cfg.eventName === 'object' ? cfg.eventName.en : cfg.eventName) || ''; // English on the projector
  $('#top-n').textContent = Number(cfg.topN) === 10 ? 10 : 5;
  renderLinks();
  if (focus) $('#dash-title').focus();
  $('#refresh-btn').addEventListener('click', load);
  $('#lock-btn').addEventListener('click', () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    location.reload();
  });
  $('#csv-btn').addEventListener('click', downloadCsv);
  load();
}

async function load() {
  clearTimeout(timer);
  const target = readTarget(cfg);
  if (!target.url) {
    setStatus(target.mode === 'online' ? 'Not connected: onlineEndpoint is empty in config.js.' : 'Not connected: offlineLiveEndpoint is empty in config.js.', true);
    return;
  }
  try {
    const d = await getJson(target.url);
    if (!d || d.ok !== true) throw new Error('bad reply');
    render(d);
    setStatus(`Updated ${new Date().toLocaleTimeString('en-GB')} · refreshes every 10 seconds · ${target.mode} mode`, false);
  } catch {
    setStatus("Couldn't reach the results just now. Showing the last numbers; trying again in 10 seconds.", true);
  } finally {
    timer = setTimeout(load, REFRESH_MS);
  }
}

function render(d) {
  const finished = Number(d.finished) || 0;
  const min = Number(d.minResponses) || Number(cfg.liveMinResponses) || 5;
  $('#t-joined').textContent = Number(d.joined) || 0;
  $('#t-sorting').textContent = Number(d.sorting) || 0;
  $('#t-finished').textContent = finished;

  const counts = Array.isArray(d.counts) ? d.counts : Array.isArray(d.top) ? d.top : [];
  lastCounts = counts;
  lastFinished = finished;
  const ready = counts.length > 0;
  $('#table-wrap').hidden = !ready;
  $('#csv-btn').hidden = !ready;
  $('#counts-note').textContent = ready
    ? `${counts.length} values chosen at least once, by ${finished} ${finished === 1 ? 'person' : 'people'}.`
    : `Counts appear once ${min} people have finished (${Math.max(0, min - finished)} to go), so no one can be identified from the first few answers.`;
  if (!ready) return;

  const max = Math.max(...counts.map((c) => Number(c.count) || 0), 1);
  const rows = counts.map((c, i) => {
    const tr = document.createElement('tr');
    const pct = finished ? Math.round((Number(c.count) / finished) * 100) : 0;
    const cells = [String(i + 1), String(c.value), String(c.count), `${pct}%`];
    cells.forEach((text, j) => {
      const td = document.createElement('td');
      td.textContent = text;
      if (j >= 2) td.className = 'num';
      if (j === 1) {
        const bar = document.createElement('span');
        bar.className = 'bar';
        bar.style.width = `${(Number(c.count) / max) * 100}%`;
        bar.setAttribute('aria-hidden', 'true');
        td.append(bar);
      }
      tr.append(td);
    });
    return tr;
  });
  $('#counts-body').replaceChildren(...rows);
}

function renderLinks() {
  const target = readTarget(cfg);
  const items = [];
  const link = (href, text, external) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (external) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    return a;
  };
  if (target.mode === 'online') {
    if (/^https:\/\//.test(String(cfg.sheetUrl || ''))) items.push(link(cfg.sheetUrl, 'Open the Google Sheet (all rows)', true));
    else items.push(document.createTextNode('All rows are in the "Database" Google Sheet. Add its link as sheetUrl in config.js for a shortcut here.'));
  } else {
    items.push(link('/api/results.csv', 'Download results.csv (all rows)', false));
    items.push(link('/api/joins.csv', 'Download joins.csv', false));
  }
  $('#data-links').replaceChildren(
    ...items.map((node) => {
      const li = document.createElement('li');
      li.append(node);
      return li;
    })
  );
}

function downloadCsv() {
  const esc = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = ['rank,value,people,percent_of_finished'];
  lastCounts.forEach((c, i) => {
    const pct = lastFinished ? Math.round((Number(c.count) / lastFinished) * 100) : 0;
    lines.push([i + 1, esc(c.value), c.count, pct].join(','));
  });
  const url = URL.createObjectURL(new Blob([`﻿${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `value-counts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setStatus(text, warn) {
  const el = $('#status');
  if (el.textContent !== text) el.textContent = text;
  el.classList.toggle('is-warning', Boolean(warn));
}
