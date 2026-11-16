/**
 * Values Card Sort — Google Sheet receiver (one-time use)
 *
 * Paste into the "Database" Google Sheet: Extensions → Apps Script.
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Copy the web app URL into config.js (onlineEndpoint).
 * After the workshop: Deploy → Manage deployments → Archive.
 *
 * Tabs (already set up): "Results" and "Joins", headers in row 1.
 * The Sheet itself does NOT need to be shared publicly; the script runs as you.
 *
 * Newsletter sign-up (type "newsletter"): forwarded straight to MailerLite, never written to the Sheet
 * and never linked to card-sort answers. Set these in Project Settings → Script properties (not in code):
 *   MAILERLITE_API_KEY   your MailerLite API key
 *   MAILERLITE_GROUP_ID  the group to add people to (optional; run `npm run mailerlite` to list groups)
 * Check the field keys in ML_FIELDS below against your account (`npm run mailerlite` lists them).
 */

const RESULTS = 'Results';
const JOINS = 'Joins';
const MAX_BODY = 10000;          // bytes
const LIVE_MIN_RESPONSES = 5;    // keep in sync with config.js liveMinResponses
const CACHE_SECONDS = 5;

// MailerLite (new API, connect.mailerlite.com). Keys of the subscriber fields each form answer goes to:
// the same fields the wcrp-academy.org sign-up form fills (checked with `npm run mailerlite`, 17 Nov 2026).
// Set a key to '' to skip that answer.
const ML_API = 'https://connect.mailerlite.com/api/subscribers';
const ML_FIELDS = {
  first_name: 'name',
  last_name: 'last_name',
  country: 'country',
  language: 'native_language',
  affiliation: 'affiliationinstitution',
  roles: 'are_you_aan',
  topics: 'what_topics_are_you_interested_in',
  consent: 'i_agree_to_receive_communications_from_the_wcrp_academy_and_accept_the_data_privacy_statement',
};
const ML_CONSENT_VALUE = 'on'; // what the consent field records when the box was ticked (same as the live site's form)

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return json({ ok: false, error: 'too_large' });
    const data = JSON.parse(raw);

    // Newsletter: no Sheet, no lock, nothing stored here.
    if (data.type === 'newsletter') return json(subscribe(data));

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (data.type === 'join') return json(saveJoin(data));
      if (data.type === 'result') return json(saveResult(data));
      return json({ ok: false, error: 'unknown_type' });
    } finally {
      lock.releaseLock();
      CacheService.getScriptCache().remove('live');
    }
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
}

/** Live view: group counts only, never codes or individual answers. */
function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('live');
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

  const joins = rows(JOINS);
  const results = rows(RESULTS);
  const joinedIds = new Set(joins.map(r => r[0]));
  const finished = results.length;
  const joined = Math.max(joinedIds.size, finished);

  // Group counts only, and only once LIVE_MIN_RESPONSES results are in (nobody identifiable from the first few).
  let counts = [];
  if (finished >= LIVE_MIN_RESPONSES) {
    const tally = {};
    results.forEach(r => {
      const n = Number(r[5]) || 5;
      for (let i = 0; i < n; i++) {
        const v = r[6 + i];
        if (v) tally[v] = (tally[v] || 0) + 1;
      }
    });
    counts = Object.keys(tally)
      .map(k => ({ value: k, count: tally[k] }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  }

  const out = JSON.stringify({
    ok: true,
    joined: joined,
    finished: finished,
    sorting: Math.max(joined - finished, 0),
    minResponses: LIVE_MIN_RESPONSES,
    top: counts.slice(0, 10),   // live view (projector)
    counts: counts,             // admin view: every value chosen at least once
    updatedAt: new Date().toISOString()
  });
  cache.put('live', out, CACHE_SECONDS);
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function saveJoin(d) {
  const id = clean(d.device_id, 64);
  if (!id) return { ok: false, error: 'missing_id' };
  const sheet = sh(JOINS);
  if (columnHas(sheet, 1, id)) return { ok: true, duplicate: true };
  sheet.appendRow([id, new Date(), clean(d.mode, 10)]);
  return { ok: true };
}

function saveResult(d) {
  const id = clean(d.submission_id, 64);
  if (!id) return { ok: false, error: 'missing_id' };
  const top = Array.isArray(d.top) ? d.top.slice(0, 10).map(v => clean(v, 80)) : [];
  if (top.length < 1) return { ok: false, error: 'missing_top' };
  const sheet = sh(RESULTS);
  if (columnHas(sheet, 1, id)) return { ok: true, duplicate: true };
  while (top.length < 10) top.push('');
  sheet.appendRow([
    id,
    new Date(),
    clean(d.participant_code, 32),
    clean(d.id_mode, 12),
    clean(d.list_version, 40),
    Number(d.top_n) === 10 ? 10 : 5
  ].concat(top, [
    list(d.very_important),
    list(d.important),
    list(d.not_important),
    clean(d.mode, 10)
  ]));
  return { ok: true };
}

/** Newsletter sign-up → MailerLite. Never logs or stores the person's details. */
function subscribe(d) {
  if (d.website) return { ok: true }; // spam trap filled in: pretend it worked, send nothing
  const email = text(d.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'bad_email' };
  const first = text(d.first_name, 60);
  const last = text(d.last_name, 60);
  if (!first || !last) return { ok: false, error: 'missing_name' };
  if (d.consent !== true) return { ok: false, error: 'no_consent' };

  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('MAILERLITE_API_KEY');
  if (!key) return { ok: false, error: 'not_configured' };
  const group = props.getProperty('MAILERLITE_GROUP_ID');

  const answers = {
    first_name: first,
    last_name: last,
    country: text(d.country, 80),
    language: text(d.language, 40),
    affiliation: text(d.affiliation, 120),
    roles: textList(d.roles, 6, 40),
    topics: textList(d.topics, 6, 80),
    consent: ML_CONSENT_VALUE, // only reached when the box was ticked
  };
  const fields = {};
  Object.keys(ML_FIELDS).forEach(function (k) {
    if (ML_FIELDS[k] && answers[k]) fields[ML_FIELDS[k]] = answers[k];
  });
  const body = { email: email, fields: fields };
  if (group) body.groups = [String(group)];

  const res = UrlFetchApp.fetch(ML_API, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code === 200 || code === 201) return { ok: true };
  if (code === 422 && /email/i.test(res.getContentText())) return { ok: false, error: 'bad_email' };
  return { ok: false, error: 'provider_error', status: code };
}

// ---------- helpers ----------
function text(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
function textList(arr, maxItems, maxLen) {
  return Array.isArray(arr) ? arr.slice(0, maxItems).map(function (v) { return text(v, maxLen); }).filter(String).join(', ') : '';
}
function sh(name) { return SpreadsheetApp.getActive().getSheetByName(name); }
function rows(name) {
  const s = sh(name);
  const n = s.getLastRow() - 1;
  return n > 0 ? s.getRange(2, 1, n, s.getLastColumn()).getValues() : [];
}
function columnHas(sheet, col, value) {
  const n = sheet.getLastRow() - 1;
  if (n < 1) return false;
  return sheet.getRange(2, col, n, 1).createTextFinder(value).matchEntireCell(true).findNext() !== null;
}
function clean(v, max) {
  // Strip leading = + - @ so a value can never become a spreadsheet formula
  return String(v == null ? '' : v).replace(/^[=+\-@]+/, '').slice(0, max);
}
function list(arr) { return Array.isArray(arr) ? arr.slice(0, 100).map(v => clean(v, 80)).join('; ') : ''; }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
