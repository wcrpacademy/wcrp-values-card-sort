// Screen flow and state for the participant page (index.html).
// Start → Sort → Review piles → Choose top N → Rank → Results. Every change is saved,
// so reopening the page returns to the same screen and card.
import { restoreState, saveState, resetState, randomCode, PILE_KEYS } from './store.js';
import { initNewsletter, relabelNewsletter } from './newsletter.js';
import { initSender, enqueue, flush, canSend, isSending } from './send.js';
import { initLang, getLang, getLanguages, setLang, onLangChange, t, tn, parts, applyText, LANG_NAMES } from './i18n.js';

const ID_MODES = ['anonymous', 'self', 'badge'];
const VALUE_LISTS = ['full', 'trimmed'];
const TOP_N = [5, 10];

// Each pile is always shown by colour + label + icon, never colour alone. Labels: i18n.js "pile.<key>".
const PILES = {
  very: { icon: 'star' },
  important: { icon: 'check' },
  not: { icon: 'minus' },
};
const pileLabel = (key) => t(`pile.${key}`);

// The consent line always says honestly what is stored for the current idMode (i18n.js "consent.<idMode>").

// Code field, only for "self" and "badge". Server-side limit is 32 characters. Texts: i18n.js "code.<idMode>.*".
const CODE_FIELD = {
  self: { maxLength: 12, pattern: /^[A-Z0-9]{2,12}$/ },
  badge: { maxLength: 32, pattern: /^[A-Z0-9][A-Z0-9-]{0,31}$/ },
};

// Save status on the Results screen. "local" only when no endpoint is set in config.js. Texts: i18n.js "save.<kind>".
const SAVE_ICONS = { local: 'check', saving: 'check', saved: 'check', pending: 'clock' };

// Step indicator in the header. Start has none. Names: i18n.js "step.<step>".
const STEP_KEYS = ['sort', 'review', 'choose', 'rank', 'results'];

const SORT_GUARD_MS = 300; // a double tap must not sort a card nobody has read
const DRAG_START_PX = 8; // movement before a press on the card becomes a drag
const DROP_SLOP_PX = 16; // a drop this close to a pile still counts
const TOUCH_LIFT_PX = 44; // on touch, the small card rides above the fingertip so the finger doesn't hide it
const SVG_NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let cfg;
let values = [];
let byId = new Map();
let credit = { credit: '' }; // credit line text + link, from values.json
let state;
const vars = {}; // fills {placeholders} in the page text (i18n.js); see bind()
let lastSortAt = -Infinity; // performance.now() restarts near 0 on each page load
const TUTORIAL_KEY = 'wcrp-cardsort-tutorial-seen'; // separate from the session, so "Start over" doesn't show it again

const RENDERERS = {
  start: renderStart,
  sort: renderSort,
  review: renderReview,
  choose: renderChoose,
  rank: renderRank,
  results: renderResults,
};

async function main() {
  $('#reload-btn').addEventListener('click', () => location.reload());
  initLang(window.CARD_SORT_CONFIG || {});
  vars.year = new Date().getFullYear();
  applyText(vars);
  wireLang();
  try {
    cfg = readConfig(window.CARD_SORT_CONFIG);
    const data = await loadValues();
    values = data.list;
    credit = data;
    byId = new Map(values.map((v) => [v.id, v]));

    const restored = restoreState(cfg, values.map((v) => v.id));
    state = restored.state;
    const stored = saveState(state); // also keeps deviceId stable from the first visit

    bindStatic();
    initNewsletter(cfg);
    $('#start-lost').hidden = !restored.lostProgress;
    $('#start-nostore').hidden = stored;
    // Sending: anything still waiting from earlier goes first; then count this phone as joined (once).
    initSender(cfg, { onSent: handleSent, onChange: () => state.step === 'results' && renderSaveStatus() });
    if (!state.sent.join) enqueue(joinId(), { type: 'join', device_id: state.deviceId });

    wire();
    render();
    show(state.step, { focus: false });
  } catch (err) {
    console.error(err);
    showError(err.userKey || 'error.load');
  }
}

// ---------- Settings and data ----------

function readConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    throw userError('config.js is missing', 'error.setup');
  }
  const c = { ...raw };
  if (!ID_MODES.includes(c.idMode)) {
    console.warn(`config.js: idMode "${c.idMode}" is not one of ${ID_MODES.join(', ')}; using "anonymous".`);
    c.idMode = 'anonymous';
  }
  if (!TOP_N.includes(Number(c.topN))) {
    console.warn(`config.js: topN "${c.topN}" must be 5 or 10; using 5.`);
    c.topN = 5;
  }
  c.topN = Number(c.topN);
  if (!VALUE_LISTS.includes(c.valuesList)) {
    console.warn(`config.js: valuesList "${c.valuesList}" must be "full" or "trimmed"; using "trimmed".`);
    c.valuesList = 'trimmed';
  }
  return Object.freeze(c);
}

async function loadValues() {
  const res = await fetch('values.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`values.json: HTTP ${res.status}`);
  const data = await res.json();
  const all = Array.isArray(data.values) ? data.values : [];
  const list = cfg.valuesList === 'full' ? all : all.filter((v) => v.trimmed === true);
  if (list.length < cfg.topN) {
    throw userError(`values.json: only ${list.length} values for list "${cfg.valuesList}"`, 'error.setup');
  }
  return {
    credit: String(data.credit || ''),
    creditFr: String((data.fr && data.fr.credit) || ''),
    creditLinkText: String(data.creditLinkText || ''),
    creditUrl: /^https:\/\//.test(String(data.creditUrl || '')) ? String(data.creditUrl) : '',
    list,
  };
}

/** A value's name and description in the page language (English when there is no translation). */
const vName = (v) => (v[getLang()] && v[getLang()].name) || v.name;
const vDesc = (v) => (v[getLang()] && v[getLang()].description) || v.description;

/** The credit line, with the name of the card sort linking to its source (new tab). */
function renderCredit({ credit: en, creditFr, creditLinkText, creditUrl }) {
  const text = getLang() === 'fr' && creditFr ? creditFr : en;
  const p = $('.credit');
  const at = creditLinkText ? text.indexOf(creditLinkText) : -1;
  if (!creditUrl || at < 0) {
    p.textContent = text;
    return;
  }
  const a = document.createElement('a');
  a.href = creditUrl;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = creditLinkText;
  const note = document.createElement('span');
  note.className = 'visually-hidden';
  note.textContent = t('newTab');
  a.append(note);
  p.replaceChildren(text.slice(0, at), a, text.slice(at + creditLinkText.length));
}

/** About 10 s per card plus 3 min for choosing and ranking, rounded to 5 min. */
function estimateMinutes(cards) {
  return Math.max(5, Math.round((cards / 6 + 3) / 5) * 5);
}

/** Text that never changes while the page is open. */
function bindStatic() {
  renderCredit(credit);
  renderDemo();
  bind('topN', cfg.topN);
  bind('cardTotal', values.length);
  const name = eventName();
  for (const node of $$('[data-bind="eventName"]')) {
    node.textContent = name;
    node.hidden = !name;
  }
}

/** config.js eventName: one string, or one per language ({ en: "…", fr: "…" }). */
function eventName() {
  const e = cfg.eventName;
  if (!e) return '';
  if (typeof e === 'string') return e;
  return String(e[getLang()] || e.en || '');
}

/** The "How to sort" scene shows the Honesty card in the page language. */
function renderDemo() {
  const v = byId.get('honesty') || values[0];
  $('#demo-name').textContent = vName(v);
  $('#demo-desc').textContent = vDesc(v);
  $('#demo-chip').textContent = vName(v);
}

// ---------- Flow ----------

function wire() {
  wireStart();
  wireSort();
  wireReview();
  wireChoose();
  wireRank();
  wireRestart();
  wireTutorial();
  for (const btn of $$('[data-go]')) btn.addEventListener('click', () => go(btn.dataset.go));
}

function render() {
  RENDERERS[state.step]();
  renderRestart();
}

/** Move to a step, save it, and show its screen. */
function go(step) {
  state.step = step;
  saveState(state);
  render();
  show(step);
}

// ---------- 0. Start ----------

function renderStart() {
  renderStartText();
  const field = CODE_FIELD[cfg.idMode];
  $('#code-field').hidden = !field;
  if (field) {
    const input = $('#code');
    input.maxLength = field.maxLength;
    input.value = field.pattern.test(state.code) ? state.code : '';
    setCodeError('');
  }
}

/** Start screen text only (a language change must not clear a code being typed). */
function renderStartText() {
  bind('minutes', estimateMinutes(values.length));
  bind('consent', t(`consent.${cfg.idMode}`));
  if (CODE_FIELD[cfg.idMode]) {
    bind('codeLabel', t(`code.${cfg.idMode}.label`));
    bind('codeHint', t(`code.${cfg.idMode}.hint`));
  }
}

function wireStart() {
  $('#start-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const field = CODE_FIELD[cfg.idMode];
    if (field) {
      const input = $('#code');
      const code = input.value.replace(/\s+/g, '').toUpperCase();
      input.value = code;
      const msg = !code ? t(`code.${cfg.idMode}.empty`) : field.pattern.test(code) ? '' : t(`code.${cfg.idMode}.invalid`);
      setCodeError(msg);
      if (msg) {
        input.focus();
        return;
      }
      state.code = code;
    } else if (!/^P-/.test(state.code)) {
      state.code = randomCode();
    }

    // A fresh deck, in a different random order on every phone.
    state.order = shuffle(values.map((v) => v.id));
    state.index = 0;
    state.piles = { very: [], important: [], not: [] };
    state.top = [];
    state.ranked = [];
    go('sort');
  });
}

function setCodeError(msg) {
  const input = $('#code');
  $('#code-error-text').textContent = msg;
  $('#code-error').hidden = !msg;
  // Only point at the error while it is visible, so screen readers don't read a stale message.
  input.setAttribute('aria-describedby', msg ? 'code-hint code-error' : 'code-hint');
  if (msg) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

// ---------- 1. Sort ----------

function renderSort() {
  const total = state.order.length;
  const card = byId.get(state.order[state.index]);
  bind('cardIndex', state.index + 1);

  const bar = $('#sort-progress');
  bar.setAttribute('aria-valuemax', total);
  bar.setAttribute('aria-valuenow', state.index);
  $('#sort-progress-fill').style.width = `${(state.index / total) * 100}%`;

  $('#card-name').textContent = vName(card);
  $('#card-desc').textContent = vDesc(card);
  const left = total - state.index;
  $('#sort-stage').dataset.left = left > 2 ? 'many' : left === 2 ? 'two' : 'one';
  const next = byId.get(state.order[state.index + 1]);
  $('#next-card').hidden = !next;
  $('#next-name').textContent = next ? vName(next) : '';
  $('#next-desc').textContent = next ? vDesc(next) : '';
  $('#undo-btn').disabled = state.index === 0;
  renderPileCounts();
}

/** Pile counts on the sort buttons and the review headings. */
function renderPileCounts() {
  for (const key of PILE_KEYS) {
    const n = state.piles[key].length;
    for (const node of $$(`[data-count="${key}"]`)) node.textContent = n;
    $(`#pile-desc-${key}`).textContent = tn('sort.pileDesc', n);
  }
}

function wireSort() {
  $('.pile-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pile]');
    if (btn) sortCard(btn.dataset.pile);
  });
  $('#undo-btn').addEventListener('click', undo);
  wireDrag();

  // Keyboard: 1 / 2 / 3 sort, Z or Backspace undoes.
  document.addEventListener('keydown', (e) => {
    if (state.step !== 'sort' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#restart-confirm').hidden || $('#tutorial').open || document.body.classList.contains('is-dragging-card')) return;
    if ($('#lang-btn').getAttribute('aria-expanded') === 'true') return;
    if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
    const pile = { 1: 'very', 2: 'important', 3: 'not' }[e.key];
    if (pile) {
      e.preventDefault();
      sortCard(pile);
    } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      e.preventDefault();
      undo();
    }
  });
}

/** Put the current card in a pile. Returns false if ignored. A drag animates its own small card, so it passes animate: false. */
function sortCard(pile, { animate = true } = {}) {
  if (state.step !== 'sort') return false;
  const now = performance.now();
  if (now - lastSortAt < SORT_GUARD_MS) return false;
  lastSortAt = now;

  state.piles[pile].push(state.order[state.index]);
  state.index += 1;
  if (state.index >= state.order.length) {
    go('review');
    return true;
  }
  saveState(state);
  if (animate) cardOut(pile);
  else replay($('#value-card'), 'is-entering');
  renderSort();
  replay($(`.pile-btn [data-count="${pile}"]`), 'is-bumped');
  announceCard();
  return true;
}

/**
 * Drag the card onto a pile. Pointer events cover mouse, touch and pen. This is an extra
 * way to sort: the pile buttons and keys stay, so it never depends on dragging.
 * Once a press becomes a drag, the card shrinks into a small card with only the value name,
 * which follows the pointer; the pile under it lights up and takes it on release.
 */
function wireDrag() {
  const card = $('#value-card');
  const chip = $('#drag-chip');
  let drag = null;
  let settling = null; // the small card's fly-away animation, so a new drag can cut it short

  const pileAt = (x, y) => {
    for (const btn of $$('.pile-btn')) {
      const r = btn.getBoundingClientRect();
      if (x >= r.left - DROP_SLOP_PX && x <= r.right + DROP_SLOP_PX && y >= r.top - DROP_SLOP_PX && y <= r.bottom + DROP_SLOP_PX) {
        return btn.dataset.pile;
      }
    }
    return null;
  };
  const setTarget = (pile) => {
    for (const btn of $$('.pile-btn')) btn.classList.toggle('is-target', btn.dataset.pile === pile);
  };
  /** Centre the small card on the pointer (raised above the fingertip on touch). */
  const place = (x, y) => {
    drag.cx = x;
    drag.cy = y - drag.lift;
    chip.style.left = `${drag.cx - drag.w / 2}px`;
    chip.style.top = `${drag.cy - drag.h / 2}px`;
  };
  const hideChip = () => {
    chip.hidden = true;
    chip.getAnimations().forEach((a) => a.cancel());
  };
  /** Transform from where the small card is now (cx, cy) to the centre of a box. */
  const towards = (from, r, scale, opacity) => ({
    transform: `translate(${r.left + r.width / 2 - from.cx}px, ${r.top + r.height / 2 - from.cy}px) scale(${scale})`,
    opacity,
  });
  /** Fly the small card away, then run done(). Instant with reduced motion. */
  const flyChip = (keyframe, done) => {
    if (reduceMotion.matches) {
      hideChip();
      done();
      return;
    }
    const anim = chip.animate([{ transform: 'none', opacity: 1 }, keyframe], {
      duration: 220,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      fill: 'forwards',
    });
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (settling && settling.anim === anim) settling = null;
      hideChip();
      done();
    };
    settling = { anim, finish };
    anim.onfinish = finish;
    setTimeout(finish, 500); // in case the animation never finishes (tab in the background)
  };

  const start = (e) => {
    if (settling) settling.finish(); // a previous small card is still settling: finish it now
    drag.active = true;
    chip.textContent = vName(byId.get(state.order[state.index]));
    chip.hidden = false;
    drag.w = chip.offsetWidth;
    drag.h = chip.offsetHeight;
    drag.lift = e.pointerType === 'mouse' ? 0 : TOUCH_LIFT_PX;
    place(e.clientX, e.clientY);

    // Shrink from the full card into the small card
    if (!reduceMotion.matches) {
      const c = card.getBoundingClientRect();
      const grow = towards(drag, c, Math.min(c.width / drag.w, 2.5), 0.4);
      chip.animate([grow, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
    card.classList.add('is-lifted');
    document.body.classList.add('is-dragging-card');
  };

  const end = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    document.body.classList.remove('is-dragging-card');
    setTarget(null);
    if (!d.active) return; // a tap on the card does nothing

    if (!cancelled && d.pile && sortCard(d.pile, { animate: false })) {
      // Into the pile. The card underneath already shows the next value.
      card.classList.remove('is-lifted');
      const btn = $(`.pile-btn[data-pile="${d.pile}"]`).getBoundingClientRect();
      flyChip(towards(d, btn, 0.35, 0), () => {});
    } else {
      // Back to the deck, growing into the full card again
      const c = card.getBoundingClientRect();
      flyChip(towards(d, c, Math.min(c.width / d.w, 2.5), 0.3), () => card.classList.remove('is-lifted'));
    }
  };

  card.addEventListener('pointerdown', (e) => {
    if (state.step !== 'sort' || !e.isPrimary || e.button !== 0 || drag) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, pile: null, w: 0, h: 0, lift: 0, cx: 0, cy: 0 };
    try {
      card.setPointerCapture(e.pointerId); // keep getting moves even when the finger leaves the card
    } catch {
      /* not supported: moves still arrive while over the card */
    }
  });

  card.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < DRAG_START_PX) return;
      start(e);
    }
    place(e.clientX, e.clientY);
    drag.pile = pileAt(drag.cx, drag.cy); // what the person sees: the small card, not the fingertip
    setTarget(drag.pile);
  });

  card.addEventListener('pointerup', (e) => end(e, false));
  card.addEventListener('pointercancel', (e) => end(e, true));

  // Stop the browser starting its own image/text drag on desktop.
  card.addEventListener('dragstart', (e) => e.preventDefault());
}

function undo() {
  if (state.step !== 'sort' || state.index === 0) return;
  const undoHadFocus = document.activeElement === $('#undo-btn');
  state.index -= 1;
  const id = state.order[state.index];
  for (const key of PILE_KEYS) state.piles[key] = state.piles[key].filter((x) => x !== id);
  saveState(state);
  renderSort();
  // On card 1 Undo is disabled again; don't leave keyboard focus on a dead button.
  if (state.index === 0 && undoHadFocus) $('#card-name').focus();
  announceCard(true);
}

/** Screen readers hear each new card: "Integrity: to be honest. Card 13 of 45." */
function announceCard(back = false) {
  const card = byId.get(state.order[state.index]);
  announce(
    t(back ? 'sort.announceBack' : 'sort.announce', {
      name: vName(card),
      desc: vDesc(card),
      i: state.index + 1,
      total: state.order.length,
    })
  );
}

/** After a tap or key, the sorted card flies into its pile button. Purely visual: the next card is already live underneath. */
function cardOut(pile) {
  if (reduceMotion.matches) return;
  const card = $('#value-card');
  const stage = $('#sort-stage');
  const ghost = card.cloneNode(true);
  ghost.removeAttribute('id');
  for (const node of $$('[id]', ghost)) node.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('style');
  ghost.classList.remove('is-entering', 'is-lifted');
  ghost.classList.add('value-card--ghost', `value-card--to-${pile}`);
  ghost.style.height = `${card.offsetHeight}px`;
  stage.append(ghost);

  const c = card.getBoundingClientRect();
  const b = $(`.pile-btn[data-pile="${pile}"]`).getBoundingClientRect();
  const tx = b.left + b.width / 2 - (c.left + c.width / 2);
  const ty = b.top + b.height / 2 - (c.top + c.height / 2);
  const anim = ghost.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${tx}px, ${ty}px) scale(0.25)`, opacity: 0.2 },
    ],
    { duration: 260, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }
  );
  anim.onfinish = () => ghost.remove();
  setTimeout(() => ghost.remove(), 600); // in case the animation never finishes (tab in the background)
  replay(card, 'is-entering');
}

// ---------- 2. Review piles ----------

function renderReview() {
  // One pile open at a time: start with Very important (or the first pile that has values).
  const first = PILE_KEYS.find((k) => state.piles[k].length) || 'very';
  for (const d of $$('details.pile')) d.open = d.dataset.pile === first;
  renderReviewLists();
}

function renderReviewLists() {
  for (const key of PILE_KEYS) {
    const ids = byName(state.piles[key]);
    $(`[data-list="${key}"]`).replaceChildren(
      ...(ids.length
        ? ids.map((id) => reviewRow(id, key))
        : [el('li', { class: 'pile__empty', text: t('review.empty') })])
    );
  }
  renderPileCounts();

  const { ok, note } = reviewCheck();
  setText($('#review-note'), note);
  $('#review-next').setAttribute('aria-disabled', String(!ok));
}

function reviewRow(id, pile) {
  const v = byId.get(id);
  return el(
    'li',
    { class: 'value-row' },
    el(
      'div',
      { class: 'value-row__text' },
      el('span', { class: 'value-row__name', text: vName(v) }),
      el('span', { class: 'value-row__desc', text: vDesc(v) })
    ),
    el(
      'select',
      { class: 'move-select', 'data-id': id, 'aria-label': t('review.moveLabel', { name: vName(v) }) },
      el('option', { value: '', selected: true, text: t('review.move') }),
      ...PILE_KEYS.filter((k) => k !== pile).map((k) => el('option', { value: k, text: t('review.moveTo', { pile: pileLabel(k) }) }))
    )
  );
}

/** Can the person go on to choose, and what should they know first? */
function reviewCheck() {
  const very = state.piles.very.length;
  const pool = very + state.piles.important.length;
  if (pool < cfg.topN) {
    return { ok: false, note: t('review.needMore', { topN: cfg.topN }) };
  }
  if (very < cfg.topN) return { ok: true, note: t('review.alsoImportant') };
  return { ok: true, note: '' };
}

function wireReview() {
  // Opening one pile folds the others
  for (const d of $$('details.pile')) {
    d.addEventListener('toggle', () => {
      if (d.open) for (const other of $$('details.pile')) if (other !== d) other.open = false;
    });
  }

  $('#review-piles').addEventListener('change', (e) => {
    const select = e.target.closest('.move-select');
    if (select && select.value) moveValue(select.dataset.id, select.value);
  });

  $('#review-next').addEventListener('click', () => {
    const { ok, note } = reviewCheck();
    if (!ok) {
      announce(note);
      return;
    }
    go('choose');
  });
}

function moveValue(id, to) {
  const from = PILE_KEYS.find((k) => state.piles[k].includes(id));
  if (!from || from === to) return;
  const rowIndex = byName(state.piles[from]).indexOf(id);
  state.piles[from] = state.piles[from].filter((x) => x !== id);
  state.piles[to].push(id);
  saveState(state);
  renderReviewLists();
  replay($(`details[data-pile="${to}"] .pile__count`), 'is-bumped');

  // The row has left this pile: keep focus where it was, on the row that took its place.
  const rest = $$(`[data-list="${from}"] .move-select`);
  (rest[Math.min(rowIndex, rest.length - 1)] || $(`details[data-pile="${from}"] summary`)).focus();
  announce(t('review.moved', { name: vName(byId.get(id)), pile: pileLabel(to) }));
}

// ---------- 3. Choose top N ----------

/** "Very important", plus "Important" when there are fewer than topN to choose from. */
function chooseGroups() {
  const groups = [{ key: 'very', ids: byName(state.piles.very) }];
  if (state.piles.very.length < cfg.topN) groups.push({ key: 'important', ids: byName(state.piles.important) });
  return groups.filter((g) => g.ids.length);
}

function renderChoose() {
  const groups = chooseGroups();
  const allowed = new Set(groups.flatMap((g) => g.ids));
  const kept = state.top.filter((id) => allowed.has(id));
  // First time here with topN or fewer "Very important" values: they all start chosen.
  state.top = !kept.length && state.piles.very.length <= cfg.topN ? [...state.piles.very] : kept;
  saveState(state);

  $('#choose-extra').hidden = !groups.some((g) => g.key === 'important');
  $('#choose-groups').replaceChildren(...groups.map(chooseGroup));
  renderChooseStatus();
}

function chooseGroup({ key, ids }) {
  return el(
    'fieldset',
    { class: 'choose-group' },
    el(
      'legend',
      { class: 'choose-group__legend' },
      el('span', { class: `pile-chip pile-chip--${key}` }, icon(PILES[key].icon), pileLabel(key))
    ),
    el('div', { class: 'choose-group__rows' }, ...ids.map(checkRow))
  );
}

function checkRow(id) {
  const v = byId.get(id);
  const input = el('input', { type: 'checkbox', name: 'top', value: id });
  input.checked = state.top.includes(id);
  return el(
    'label',
    { class: input.checked ? 'check-row is-checked' : 'check-row' },
    input,
    el(
      'span',
      { class: 'check-row__text' },
      el('span', { class: 'check-row__name', text: vName(v) }),
      el('span', { class: 'check-row__desc', text: vDesc(v) })
    )
  );
}

function renderChooseStatus(warning = '') {
  const left = cfg.topN - state.top.length;
  $('#choose-count').textContent = t('choose.count', { n: state.top.length, topN: cfg.topN });
  const note = $('#choose-note');
  note.textContent = warning || (left > 0 ? t('choose.more', { n: left }) : t('choose.ready'));
  note.classList.toggle('is-warning', Boolean(warning));
  $('#choose-next').setAttribute('aria-disabled', String(left !== 0));
}

function wireChoose() {
  $('#choose-groups').addEventListener('change', (e) => {
    const input = e.target;
    if (!input.matches('input[type="checkbox"]')) return;
    if (input.checked && state.top.length >= cfg.topN) {
      input.checked = false; // extra picks are blocked, with a short message
      renderChooseStatus(t('choose.tooMany', { topN: cfg.topN }));
      return;
    }
    state.top = input.checked ? [...state.top, input.value] : state.top.filter((id) => id !== input.value);
    input.closest('.check-row').classList.toggle('is-checked', input.checked);
    saveState(state);
    renderChooseStatus();
  });

  $('#choose-next').addEventListener('click', () => {
    const left = cfg.topN - state.top.length;
    if (left !== 0) {
      renderChooseStatus(t('choose.moreToGo', { n: left }));
      return;
    }
    // Keep the order already given to values that are still chosen; new ones go last.
    state.ranked = [
      ...state.ranked.filter((id) => state.top.includes(id)),
      ...state.top.filter((id) => !state.ranked.includes(id)),
    ];
    go('rank');
  });
}

// ---------- 4. Rank ----------

function renderRank() {
  const last = state.ranked.length - 1;
  $('#rank-list').replaceChildren(
    ...state.ranked.map((id, i) => {
      const name = vName(byId.get(id));
      const move = (dir, label, disabled) =>
        el(
          'button',
          { type: 'button', class: 'icon-btn', 'data-move': dir, 'aria-label': t(`rank.${label}`, { name }), disabled },
          icon(dir)
        );
      return el(
        'li',
        { class: 'rank-row', 'data-id': id },
        el('span', { class: 'rank-row__n', 'aria-hidden': 'true', text: i + 1 }),
        el('span', { class: 'rank-row__name', text: name }),
        el('span', { class: 'rank-row__moves' }, move('up', 'up', i === 0), move('down', 'down', i === last))
      );
    })
  );
}

function wireRank() {
  $('#rank-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-move]');
    if (btn) moveRank(btn.closest('li').dataset.id, btn.dataset.move);
  });
  $('#rank-next').addEventListener('click', () => go('results'));
  $('#save-retry').addEventListener('click', () => flush());
}

function moveRank(id, dir) {
  const from = state.ranked.indexOf(id);
  const to = dir === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= state.ranked.length) return;
  [state.ranked[from], state.ranked[to]] = [state.ranked[to], state.ranked[from]];
  saveState(state);
  renderRank();

  // Focus follows the value, so pressing again keeps moving it. At either end that
  // arrow is disabled, so focus goes to the other one.
  const row = $$('#rank-list > li').find((li) => li.dataset.id === id);
  const same = $(`[data-move="${dir}"]`, row);
  (same.disabled ? $(`[data-move="${dir === 'up' ? 'down' : 'up'}"]`, row) : same).focus();
  replay(row, 'is-moved');
  announce(t('rank.now', { name: vName(byId.get(id)), pos: to + 1, total: state.ranked.length }));
}

// ---------- 5. Results ----------

function renderResults() {
  bind('rankedCount', state.ranked.length);
  bind('veryCount', state.piles.very.length);
  bind('code', state.code);

  $('#top-list').replaceChildren(
    ...state.ranked.map((id, i) => {
      const v = byId.get(id);
      return el(
        'li',
        { class: 'top-item' },
        el('span', { class: 'top-item__n', 'aria-hidden': 'true', text: i + 1 }),
        el(
          'span',
          { class: 'top-item__text' },
          el('span', { class: 'top-item__name', text: vName(v) }),
          el('span', { class: 'top-item__desc', text: vDesc(v) })
        )
      );
    })
  );

  const very = byName(state.piles.very);
  $('#very-all').hidden = !very.length;
  $('#very-list').replaceChildren(...very.map((id) => el('li', { class: 'chip', text: vName(byId.get(id)) })));

  queueResult();
  renderSaveStatus();
}

// ---------- Sending (send.js does the queue and retries) ----------

const joinId = () => `join:${state.deviceId}`;
const resultId = () => `result:${state.submissionId}`;

/**
 * The row for the Results tab (docs/PLAN.md §5). Value names, not ids, so the Sheet reads on its own.
 * Always the English names, whatever language the page is in, so all answers count together.
 */
function resultBody() {
  const names = (ids) => ids.map((id) => byId.get(id).name).sort((a, b) => a.localeCompare(b, 'en'));
  return {
    type: 'result',
    submission_id: state.submissionId,
    participant_code: state.code,
    id_mode: cfg.idMode,
    list_version: cfg.listVersion,
    top_n: state.ranked.length,
    top: state.ranked.map((id) => byId.get(id).name),
    very_important: names(state.piles.very),
    important: names(state.piles.important),
    not_important: names(state.piles.not),
  };
}

function queueResult() {
  if (!state.sent.result) enqueue(resultId(), resultBody());
}

function handleSent(id) {
  if (id === joinId() && !state.sent.join) {
    state.sent.join = true;
    saveState(state);
  }
  if (id === resultId() && !state.sent.result) {
    state.sent.result = true;
    saveState(state);
    if (state.step === 'results') renderSaveStatus();
  }
}

function renderSaveStatus() {
  if (state.sent.result) setSaveStatus('saved');
  else if (!canSend()) setSaveStatus('local');
  else setSaveStatus(isSending() ? 'saving' : 'pending');
}

/** "local" | "saving" | "saved" | "pending" */
function setSaveStatus(kind) {
  $('#save-status').dataset.state = kind;
  setText($('#save-status-text'), t(`save.${kind}`));
  $('#save-status-use').setAttribute('href', `#i-${SAVE_ICONS[kind]}`);
  $('#save-retry').hidden = kind !== 'pending';
}

// ---------- Start over / Start again ----------

/** One set of answers per phone (config.oneEntryPerDevice): no "Start again" once on Results. */
const entryLocked = () => state.step === 'results' && cfg.oneEntryPerDevice !== false;

function renderRestart({ keepOpen = false } = {}) {
  const which = state.step === 'results' ? 'again' : 'over';
  $('#restart').hidden = state.step === 'start' || entryLocked();
  $('#restart-done').hidden = !entryLocked();
  if (!keepOpen) {
    $('#restart-btn').hidden = false;
    $('#restart-confirm').hidden = true;
  }
  $('#restart-btn').textContent = t(`restart.${which}`);
  $('#restart-q').textContent = t(`restart.${which}Q`);
  $('#restart-yes').textContent = t(`restart.${which}Yes`);
}

function wireRestart() {
  const btn = $('#restart-btn');
  const box = $('#restart-confirm');
  btn.addEventListener('click', () => {
    btn.hidden = true;
    box.hidden = false;
    $('#restart-no').focus();
  });
  $('#restart-no').addEventListener('click', () => {
    box.hidden = true;
    btn.hidden = false;
    btn.focus();
  });
  $('#restart-yes').addEventListener('click', () => {
    if (entryLocked()) return;
    state = resetState(state, cfg); // keeps the device ID, so the Joined counter doesn't count twice
    $('#start-lost').hidden = true;
    go('start');
    announce(t('restart.cleared'));
  });
}

// ---------- Helpers ----------

/** Swap screens in place and move focus to the new screen's heading. */
function show(name, { focus = true } = {}) {
  for (const s of $$('main > [data-screen]')) s.hidden = s.dataset.screen !== name;
  document.body.dataset.step = name;
  renderStepper(name);
  window.scrollTo(0, 0);
  if (focus) {
    const h = $(`main > [data-screen="${name}"] h1`);
    if (h) h.focus();
  }
  if (name === 'sort') showTutorial();
}

/** First time on the Sort screen: the "How to sort" scene. Once per phone. */
function showTutorial() {
  const dialog = $('#tutorial');
  let seen = false;
  try {
    seen = localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    /* storage blocked: show it */
  }
  if (seen || dialog.open || typeof dialog.showModal !== 'function') return;
  dialog.showModal();
  $('#tutorial-ok').focus();
}

function wireTutorial() {
  const dialog = $('#tutorial');
  $('#tutorial-ok').addEventListener('click', () => dialog.close());
  // Closed by the button or Escape
  dialog.addEventListener('close', () => {
    try {
      localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      /* storage blocked: it shows again next time, which is harmless */
    }
    if (state.step === 'sort') $('#card-name').focus();
  });
}

/** Header right side: the step indicator while sorting (Sort–Rank), the "Official site" button on Start and Results. */
function renderStepper(name, { flow = true } = {}) {
  const n = STEP_KEYS.indexOf(name) + 1;
  $('#official-link').hidden = name !== 'start' && name !== 'results';
  $('#stepper').hidden = n === 0 || name === 'results';
  if (flow) replay($('.topbar'), 'is-flowing'); // the stripe under the header flows briefly on each new screen
  if (!n) return;
  const stepName = el('span', { id: 'stepper-name', text: t(`step.${name}`) });
  $('#stepper-text').replaceChildren(...parts('stepper', { n, name: stepName }));
  $$('.stepper__bar i').forEach((seg, i) => seg.classList.toggle('is-done', i < n));
}

let errorKey = '';
function showError(key) {
  errorKey = key;
  $('#error-msg').textContent = t(key);
  show('error');
}

/** Sets a value shown on the page: [data-bind] elements, and {name} in translated text. */
function bind(name, value) {
  vars[name] = value;
  for (const node of $$(`[data-bind="${name}"]`)) node.textContent = String(value);
  applyText(vars);
}

// ---------- Language (flag button in the header) ----------

function wireLang() {
  const langs = getLanguages();
  const box = $('#lang');
  box.hidden = langs.length < 2;
  if (box.hidden) return;

  const btn = $('#lang-btn');
  const menu = $('#lang-menu');
  menu.replaceChildren(
    ...langs.map((code) =>
      el(
        'li',
        {},
        el(
          'button',
          { type: 'button', class: 'lang__opt', 'data-lang': code, lang: code },
          flag(code),
          el('span', { class: 'lang__name', text: LANG_NAMES[code] || code }),
          icon('check')
        )
      )
    )
  );

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const open = () => {
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    $(`.lang__opt[data-lang="${getLang()}"]`, menu).focus();
  };
  const close = ({ focus = true } = {}) => {
    if (!isOpen()) return;
    btn.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (focus) btn.focus();
  };

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-lang]');
    if (!opt) return;
    setLang(opt.dataset.lang);
    close();
  });
  // Escape closes; arrow keys move between languages
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && isOpen()) {
      e.preventDefault();
      const opts = $$('.lang__opt', menu);
      const i = opts.indexOf(document.activeElement);
      opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length].focus();
    }
  });
  // Clicking or tabbing anywhere else closes it
  document.addEventListener('pointerdown', (e) => {
    if (!box.contains(e.target)) close({ focus: false });
  });
  box.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !box.contains(e.relatedTarget)) close({ focus: false });
  });

  renderLangButton();
  onLangChange(relabel);
}

function renderLangButton() {
  const code = getLang();
  $('#lang-btn-flag').setAttribute('href', `#flag-${code}`);
  $('#lang-btn-text').textContent = t('langButton', { name: LANG_NAMES[code] || code });
  for (const opt of $$('.lang__opt')) {
    if (opt.dataset.lang === code) opt.setAttribute('aria-current', 'true');
    else opt.removeAttribute('aria-current');
  }
}

/** After a language change: redo every text on the page, keeping the person's place and focus. */
function relabel() {
  applyText(vars);
  renderLangButton();
  if (!state) {
    if (errorKey) $('#error-msg').textContent = t(errorKey);
    return;
  }
  bindStatic();
  relabelNewsletter();
  const step = state.step;
  if (step === 'start') renderStartText();
  else if (step === 'sort') renderSort();
  else if (step === 'review') renderReviewLists();
  else if (step === 'choose') renderChoose();
  else if (step === 'rank') renderRank();
  else if (step === 'results') renderResults();
  renderRestart({ keepOpen: true });
  renderStepper(step, { flow: false });
  if (errorKey) $('#error-msg').textContent = t(errorKey);
}

function flag(code) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'flag');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#flag-${code}`);
  svg.append(use);
  return svg;
}

/** Only touch the text when it changes, so live regions don't repeat themselves. */
function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/** Polite screen-reader message. Cleared first so repeating the same text is still read. */
function announce(msg) {
  const node = $('#announcer');
  node.textContent = '';
  setTimeout(() => {
    node.textContent = msg;
  }, 50);
}

/** Restart a CSS animation class. */
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/** Ids sorted by the name shown, in the page language. */
function byName(ids) {
  const lang = getLang();
  return [...ids].sort((a, b) => vName(byId.get(a)).localeCompare(vName(byId.get(b)), lang));
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** el('li', { class: 'row', text: 'Hi' }, child, …). false / null / undefined attributes are skipped. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children);
  return node;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/** An error with a message for the participant (an i18n.js key). */
function userError(devMessage, userKey) {
  const err = new Error(devMessage);
  err.userKey = userKey;
  return err;
}

main();
