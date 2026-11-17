// Test server (never deployed). Serves the site with config.js pointed at a mock Apps Script on this same
// server. The mock runs the REAL apps-script/apps-script.gs in a sandbox, with an in-memory "Database"
// Sheet and a fake MailerLite, so the page talks to exactly the code that will run on Google.
//
//   node tests/serve.mjs [port]      → http://127.0.0.1:4173/   (live.html, admin.html too)
//
// Test-only routes: GET /__test/state, POST /__test/reset, POST /__test/seed?n=6, POST /__test/outage?on=1
// The admin PIN in this server is 1234 (or TEST_PIN). Nothing here touches Google or MailerLite.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const PIN = process.env.TEST_PIN || '1234';

// Same files the deploy uploads. Everything else (.env, docs, tests, scripts…) is a 404.
const ALLOW = /^\/(index\.html|live\.html|admin\.html|config\.js|values\.json|(css|js|fonts|img|qr)\/[\w.-]+)$/;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// ---------- Mock Apps Script ----------
const RESULTS_HEADER = ['submission_id', 'submitted_at', 'participant_code', 'id_mode', 'list_version', 'top_n',
  ...Array.from({ length: 10 }, (_, i) => `top_${i + 1}`), 'very_important', 'important', 'not_important', 'mode'];
const JOINS_HEADER = ['device_id', 'joined_at', 'mode'];

function makeSheet(header) {
  const rows = [header];
  return {
    rows,
    appendRow: (r) => rows.push([...r]),
    getLastRow: () => rows.length,
    getLastColumn: () => header.length,
    getRange: (r, c, nr, nc) => {
      const slice = rows.slice(r - 1, r - 1 + nr);
      return {
        getValues: () => slice.map((row) => Array.from({ length: nc }, (_, j) => row[c - 1 + j] ?? '')),
        createTextFinder: (v) => ({
          matchEntireCell() { return this; },
          findNext: () => (slice.some((row) => String(row[c - 1]) === String(v)) ? {} : null),
        }),
      };
    },
  };
}

let sheets;
let mailerlite;
let outage = false;
const cache = new Map();
function reset() {
  sheets = { Results: makeSheet(RESULTS_HEADER), Joins: makeSheet(JOINS_HEADER) };
  mailerlite = [];
  cache.clear();
}
reset();

const gs = vm.createContext({
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
  SpreadsheetApp: { getActive: () => ({ getSheetByName: (n) => sheets[n] }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => { const e = cache.get(k); return e && e.until > Date.now() ? e.v : null; },
      put: (k, v, s) => cache.set(k, { v, until: Date.now() + s * 1000 }),
      remove: (k) => cache.delete(k),
    }),
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ MAILERLITE_API_TOKEN: 'test-key', MAILERLITE_GROUP_ID: 'test-group' })[k] || null }) },
  UrlFetchApp: {
    fetch: (url, opts) => {
      const body = JSON.parse(opts.payload);
      mailerlite.push({ url, body });
      const fail = /fail@/.test(body.email);
      return { getResponseCode: () => (fail ? 500 : 201), getContentText: () => '{}' };
    },
  },
  Logger: { log() {} },
});
vm.runInContext(readFileSync(join(ROOT, 'apps-script', 'apps-script.gs'), 'utf8'), gs);

function seed(n) {
  const names = JSON.parse(readFileSync(join(ROOT, 'values.json'), 'utf8')).values.filter((v) => v.trimmed).map((v) => v.name);
  for (let i = 0; i < n; i++) {
    // Skewed on purpose so the chart has a clear order: early names are picked more often.
    const pool = [...names];
    const top = [];
    while (top.length < 5) {
      const k = Math.floor(Math.random() ** 2.2 * pool.length);
      top.push(pool.splice(k, 1)[0]);
    }
    const id = `seed-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}`;
    sheets.Joins.appendRow([`dev-${id}`, new Date(), 'online']);
    sheets.Results.appendRow([id, new Date(), `P-S${i}`, 'anonymous', 'miller-2001-v1', 5, ...top, '', '', '', '', '', top.join('; '), '', '', 'online']);
  }
  cache.clear();
}

// ---------- HTTP ----------
const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
};
const cors = { 'Access-Control-Allow-Origin': '*' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname === '/' ? '/index.html' : url.pathname;

  if (path === '/exec') {
    if (outage) return send(res, 503, 'Service unavailable', 'text/plain', cors);
    if (req.method === 'GET') return send(res, 200, gs.doGet().s, undefined, cors);
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      return send(res, 200, gs.doPost({ postData: { contents: raw } }).s, undefined, cors);
    }
    return send(res, 405, '{}', undefined, cors);
  }

  if (path.startsWith('/__test/')) {
    if (path === '/__test/state') return send(res, 200, JSON.stringify({ results: sheets.Results.rows.slice(1), joins: sheets.Joins.rows.slice(1), mailerlite }));
    if (path === '/__test/reset' && req.method === 'POST') { reset(); outage = false; return send(res, 200, '{"ok":true}'); }
    if (path === '/__test/seed' && req.method === 'POST') { seed(Number(url.searchParams.get('n') || 6)); return send(res, 200, '{"ok":true}'); }
    if (path === '/__test/outage' && req.method === 'POST') { outage = url.searchParams.get('on') === '1'; return send(res, 200, '{"ok":true}'); }
    return send(res, 404, '{}');
  }

  if (!ALLOW.test(path)) return send(res, 404, 'Not found', 'text/plain');
  try {
    let body = await readFile(join(ROOT, path));
    if (path === '/config.js') {
      body = body
        .toString('utf8')
        .replace(/onlineHost:\s*"[^"]*"/, 'onlineHost: "127.0.0.1"')
        .replace(/onlineEndpoint:\s*"[^"]*"/, `onlineEndpoint: "http://127.0.0.1:${PORT}/exec"`)
        .replace(/adminPinHash:\s*"[^"]*"/, `adminPinHash: "${createHash('sha256').update(PIN).digest('hex')}"`);
    }
    send(res, 200, body, TYPES[extname(path)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Test server on http://127.0.0.1:${PORT}/ (mock Apps Script at /exec, admin PIN ${PIN})`));
