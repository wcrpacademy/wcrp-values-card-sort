// Newsletter sign-up: the one part of this app that collects personal data (agreed with Ken, 17 Nov 2026).
// The form goes straight to MailerLite through the Apps Script, which holds the API key. Nothing from it is
// stored on the phone or in the Google Sheet, and it is never sent with or linked to the card-sort answers
// (no device ID, submission ID or participant code).
import { COUNTRIES } from './countries.js';
import { saveTarget, postJson } from './endpoint.js';

// Same choices as the sign-up form on wcrp-academy.org. The text is what MailerLite receives.
const LANGUAGES = ['English', 'French', 'Spanish', 'Portuguese', 'Arabic', 'Chinese', 'Russian', 'Other'];
const ROLES = ['NGO member', 'Undergraduate', 'Postgraduate', 'Researcher'];
const TOPICS = [
  'Climate Change Impacts Adaptation and Vulnerability',
  'Mitigation of Climate Change',
  'Physical Science Basis of Climate Change',
];

const DONE_KEY = 'wcrp-cardsort-newsletter-done'; // only a yes/no flag, never the details
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRY_LATER = "We couldn't sign you up just now. Please try again, or sign up later at wcrp-academy.org.";

const $ = (sel) => document.querySelector(sel);

let cfg;
let busy = false;

export function initNewsletter(config) {
  cfg = config;
  if (cfg.newsletterSignup === false) {
    $('#newsletter').hidden = true;
    return;
  }
  fillChoices();
  renderCta();

  const dialog = $('#nl-dialog');
  $('#newsletter-open').addEventListener('click', open);
  $('#nl-close').addEventListener('click', () => dialog.close());
  for (const btn of document.querySelectorAll('[data-nl-close]')) btn.addEventListener('click', () => dialog.close());
  $('#nl-form').addEventListener('submit', submit);
  dialog.addEventListener('close', renderCta);
}

function fillChoices() {
  const options = (select, list) => select.append(...list.map((v) => new Option(v, v)));
  options($('#nl-country'), COUNTRIES);
  options($('#nl-language'), LANGUAGES);
  const boxes = (wrap, name, list) =>
    wrap.append(
      ...list.map((v) => {
        const label = document.createElement('label');
        label.className = 'check-line';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = name;
        input.value = v;
        const text = document.createElement('span');
        text.textContent = v;
        label.append(input, text);
        return label;
      })
    );
  boxes($('#nl-roles'), 'roles', ROLES);
  boxes($('#nl-topics'), 'topics', TOPICS);
}

function isDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Footer: the button, or a thank-you once this phone has signed up. */
function renderCta() {
  const done = isDone();
  $('#newsletter-open').hidden = done;
  $('#newsletter-thanks').hidden = !done;
}

function open() {
  const online = saveTarget(cfg);
  const canSend = online.mode === 'online' && /^https:\/\//.test(online.url) || isTestTarget(online);
  $('#nl-form').hidden = !canSend;
  $('#nl-offline').hidden = canSend;
  $('#nl-done').hidden = true;
  setGeneral('');
  $('#nl-dialog').showModal();
  // Land on the title, not a field, so the keyboard doesn't jump up on phones
  (canSend ? $('#nl-title') : $('#nl-offline-title')).focus();
}

/** Allows a local mock endpoint (http on this computer) for testing; the real endpoint is always https. */
function isTestTarget(t) {
  return t.mode === 'online' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(t.url);
}

function read() {
  const form = $('#nl-form');
  const val = (name) => String(form.elements[name].value || '').trim();
  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  return {
    first_name: val('first_name').slice(0, 60),
    last_name: val('last_name').slice(0, 60),
    email: val('email').toLowerCase().slice(0, 254),
    country: val('country'),
    language: val('language'),
    affiliation: val('affiliation').slice(0, 120),
    roles: checked('roles'),
    topics: checked('topics'),
    consent: form.elements.consent.checked,
    website: val('website'), // spam trap
  };
}

function validate(d) {
  const errors = [];
  if (!d.first_name) errors.push(['first', 'Enter your first name.']);
  if (!d.last_name) errors.push(['last', 'Enter your last name.']);
  if (!d.email) errors.push(['email', 'Enter your email address.']);
  else if (!EMAIL.test(d.email)) errors.push(['email', 'Enter an email address like name@example.org.']);
  if (!d.consent) errors.push(['consent', 'Tick the box to agree, so we can send you the newsletter.']);
  return errors;
}

function setFieldError(key, msg) {
  const input = $(`#nl-${key}`);
  const err = $(`#nl-${key}-error`);
  err.textContent = msg;
  err.hidden = !msg;
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function setGeneral(msg) {
  $('#nl-general-text').textContent = msg;
  $('#nl-general').hidden = !msg;
}

async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const d = read();
  const errors = validate(d);
  for (const key of ['first', 'last', 'email', 'consent']) {
    const hit = errors.find(([k]) => k === key);
    setFieldError(key, hit ? hit[1] : '');
  }
  setGeneral('');
  if (errors.length) {
    $(`#nl-${errors[0][0]}`).focus();
    return;
  }

  const target = saveTarget(cfg);
  if (!navigator.onLine) {
    setGeneral("You seem to be offline. Check your connection and try again.");
    return;
  }

  setBusy(true);
  try {
    const reply = await postJson(target.url, { type: 'newsletter', ...d });
    if (reply && reply.ok === true) {
      done();
      return;
    }
    if (reply && reply.error === 'bad_email') {
      setFieldError('email', "This email address wasn't accepted. Please check it.");
      $('#nl-email').focus();
      return;
    }
    setGeneral(TRY_LATER);
  } catch {
    setGeneral(TRY_LATER);
  } finally {
    setBusy(false);
  }
}

function setBusy(on) {
  busy = on;
  const btn = $('#nl-submit');
  btn.textContent = on ? 'Subscribing…' : 'Subscribe';
  btn.setAttribute('aria-disabled', String(on));
}

function done() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* storage blocked: the footer just keeps its button */
  }
  $('#nl-form').reset(); // don't keep anyone's details on screen
  $('#nl-form').hidden = true;
  $('#nl-done').hidden = false;
  $('#nl-done-title').focus();
}
