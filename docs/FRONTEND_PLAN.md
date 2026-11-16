# Values Card Sort — Frontend plan

How the pages look and behave. Read with `PLAN.md` (what it does, data, network) and `DESIGN_NOTES` below. Build phase by phase (§9) and stop for review after each phase.

## 1. Constraints

- **Static only:** HTML, CSS, vanilla JS (ES modules). No framework, no bundler, no build step to deploy. Must run from any static host and from `python server.py` on a laptop with **no internet**.
- **No external requests at runtime:** fonts, icons and scripts are local files. The only network calls are to the save endpoint and the live/admin read endpoint.
- **Phones first:** designed at 375px, works from 320px to desktop. Most people use it standing or seated with one hand.
- **Node 24** for tooling only (local server, QR script, tests). Pinned in `.nvmrc`.
- **Settings in `config.js`** (see `PLAN.md` §5a). No hard-coded event name, top N, ID mode or endpoints.

## 2. Look (WCRP Academy brand, WCAG 2.2 AA)

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#232C3D` | text, header, primary surfaces |
| `--blue` | `#0069A9` | links, secondary buttons |
| `--green` | `#85E885` | main action buttons (navy text), progress, "saved" |
| `--pollen` | `#F3EA99` | "Very important" pile accent, badges |
| `--cyan` | `#06FAEA` | decoration only |
| `--paper` | `#F1F1F1` | page background |
| `--white` | `#FFFFFF` | cards |
| `--metal` | `#737D84` | borders |
| `--ink-soft` | `#5E676E` | small grey text |
| `--error` | `#C8102E` | error text |

- Font: Plus Jakarta Sans, **self-hosted** (`/fonts/*.woff2`, SIL Open Font Licence; include the licence file), fallback Arial. Weights 400 / 600 / 700 only.
- Body 16px / 150%; card value name 28px bold; headings 24–32px.
- Buttons are pills; tap targets at least 48px tall; 8px+ between targets.
- Never green/cyan/yellow text on light backgrounds; navy text on green/yellow.
- Visible focus ring: 3px `--green` with 3px offset (on light: also a 1px navy inner ring so it shows).
- Respect `prefers-reduced-motion`: card moves become instant.
- Each pile is shown by **colour + label + icon**, never colour alone:
  - Very important: yellow accent + star icon
  - Important: blue accent + check icon
  - Not important: grey + minus icon

## 3. Screens (`index.html`, one page, screens swapped in place)

```
[0 Start] → [1 Sort] → [2 Review piles] → [3 Choose top N] → [4 Rank] → [5 Results]
```

### 0. Start
- Event name (from config), title "What matters most to you?", 2–3 short lines on how it works ("Sort each value into one of three piles. Then pick your top 5 and put them in order. It takes about 10 minutes.").
- Consent line that matches `idMode` (anonymous / self code / badge code). Code field only when `idMode` is `self` or `badge`, with a visible label.
- Credit line for the values list (small, bottom).
- Button: **Start sorting**.
- Sends the `join` ping when this screen first loads (once per device).

### 1. Sort
- Top: progress ("Card 12 of 50") with a progress bar; **Undo** button (disabled on card 1).
- Centre: one card, value name large, description below.
- Bottom: three equal buttons, stacked on narrow phones, in a row from 400px up: **Very important**, **Important**, **Not important**. Each shows its icon and current pile count.
- Keyboard: 1 / 2 / 3 sort, Z or Backspace undoes.
- Drag (built 17 Nov): drag the card onto a pile. Once dragging, the card shrinks into a small card with only the value name (raised above the fingertip on touch); the pile under it lights up and takes it on release. Buttons stay the main way.
- First visit: a "How to sort" dialog with a small looping demo of the drag, shown once per phone ("Got it" or Escape closes it).
- After each choice: a brief card-out movement (instant with reduced motion); the next card's name gets focus for screen readers via a polite live region ("Integrity. Card 13 of 50").

### 2. Review piles
- Three collapsible sections with counts, one open at a time (opening one folds the others). Each value has a small "Move" control (a select or 3 small buttons) to change pile.
- If "Very important" has fewer than `topN`, a note: "You'll also choose from your Important pile."
- Button: **Choose my top 5** (uses `topN`).

### 3. Choose top N
- List of "Very important" values (plus "Important" if needed) as checkable rows (real checkboxes, 48px rows).
- Counter "3 of 5 chosen"; the Continue button stays disabled until exactly `topN` are chosen; extra picks blocked with a short message.

### 4. Rank
- Chosen values in a numbered list; each row has **Move up** / **Move down** buttons (with `aria-label`s like "Move Integrity up"). No drag-only interaction.
- Button: **See my results**.

### 5. Results
- Ranked top N in a large numbered list; full "Very important" list below.
- Save status, always visible: "Saving…" → "Saved" (green check) or "Not sent yet, we'll keep trying" (with retry button). Status uses a polite live region.
- Button: **Start again** (asks to confirm, clears this device). No download (removed 17 Nov at Ken's request; the worksheet is the participant's copy).
- Reminder: "Copy your top 5 onto your worksheet."

### Resume
- Every step is saved to `localStorage`. Reopening the page returns to the same screen and card. A small "Start over" link on the Start screen when a saved session exists.

## 4. Live view (`live.html`, for the projector)

- Designed for 1920×1080, readable from the back of a room: numbers 120px+, labels 32px+.
- Navy background, paper text.
- Top: **Joined** (huge number), then "**Sorting** · **Finished**" with a progress bar.
- Before `liveMinResponses` finished: "Results appear after 5 people finish" instead of the chart.
- Then: horizontal bar chart of the 10 most chosen values (value name + count), bars in `--green`, sorted descending, built with plain HTML/CSS (no chart library).
- QR code + short URL in a corner so latecomers can still join.
- Polls the read endpoint every 5 s; a small "Updated 3 s ago" note; if a poll fails, keep the last numbers and show "Reconnecting…".
- Counter change: number ticks up once (instant with reduced motion).

## 5. Admin view (`admin.html`)

- PIN screen (PIN from Ken, not stored in the repo; compare a SHA-256 hash in config). It only hides the page; the data itself is protected by the Sheet's sharing settings.
- Shows: joined / finished counts, top values table (all values with counts), "Download CSV" (offline mode reads `server.py`; online mode links to the Sheet).

## 6. Code structure

```
wcrp-values-card-sort/
  index.html
  live.html
  admin.html
  config.js            # settings, the only file to edit on the day
  values.json          # cards; each has id, name, description, trimmed: true/false
  css/
    tokens.css         # brand tokens above
    app.css            # layout and components
  js/
    app.js             # screen flow and state
    store.js           # localStorage state + resume
    send.js            # save queue: join + result, retry, dedupe IDs
    endpoint.js        # online/offline target + fetch helpers
    newsletter.js      # MailerLite sign-up form (separate from the card sort)
    countries.js
    sha256.js          # admin PIN hash (fallback for plain-http offline mode)
    live.js
    admin.js
  fonts/               # Plus Jakarta Sans woff2 + OFL.txt
  qr/                  # generated PNG/SVG
  server.py            # offline server (Python standard library)
  scripts/
    make-qr.mjs        # writes QR images from config (Node 24)
  apps-script/
    apps-script.gs     # copy into the Google Sheet
  tests/
    flow.spec.mjs      # Playwright: full run at 375 / 768 / 1280, resume, offline and outage
    views.spec.mjs     # live view, admin view, newsletter
    serve.mjs          # test server: site + mock Apps Script (real apps-script.gs, in-memory Sheet)
  docs/
    PLAN.md  DAY-OF-SETUP.md  FRONTEND_PLAN.md
  .github/workflows/deploy.yml
  .nvmrc               # 24
  package.json         # dev tools only; "engines": { "node": ">=24 <25" }
  CLAUDE.md
```

## 7. State and sending

- State shape in `localStorage` (`wcrp-cardsort-v1`): `{ deviceId, submissionId, code, step, order[], index, piles: {very:[], important:[], not:[]}, top[], ranked[], sent: {join:bool, result:bool}, listVersion }`.
- `deviceId` and `submissionId`: `crypto.randomUUID()`.
- Endpoint choice: if `location.hostname` is the online host, use `onlineEndpoint`; otherwise use `offlineEndpoint` (same origin).
- Online POST: `Content-Type: text/plain` body with JSON (avoids the Apps Script CORS preflight). Treat any non-`{ok:true}` reply as "not sent".
- Retry: every 15 s while unsent, on `online` events and on page load.
- Never block the person: results show even if sending fails.

## 8. Accessibility checklist

- Real `<button>`, `<label>`, `<input type="checkbox">`; one `<h1>` per screen; headings in order.
- Focus moves to each new screen's heading when screens change.
- Live regions for card changes and save status.
- Works with keyboard only, VoiceOver (iOS) and TalkBack (Android).
- Contrast per §2; text resizes to 200% without clipping; reflows at 320px.

## 9. Build phases (stop for Ken's review after each)

1. **Scaffold:** repo files, tokens, fonts, `config.js`, `values.json` (Miller list with `trimmed` flags; Ken checks the public-domain notice), Start screen.
2. **Sort flow:** Sort, Review, Choose, Rank, Results with resume. No network yet.
3. **Sending:** `send.js` + the Apps Script on a test copy of the Sheet; join + result; retry and dedupe tests.
4. **Offline:** `server.py` with the same row format; CSV + joins.
5. **Live and admin views.**
6. **QR script, deploy workflow, Playwright tests,** README day-of steps.

## 10. Deploy (Infomaniak, static)

- Subdomain `values.wcrp-academy.org` → its own folder on the Academy's Infomaniak web hosting; Cloudflare DNS record proxied; SSL Full (strict).
- GitHub Actions on push to `main`: checkout → setup Node from `.nvmrc` → run tests → upload over SFTP to the subdomain folder. The upload is an allowlist (the three pages, `config.js`, `values.json`, `css/`, `js/`, `fonts/`, `img/`, `qr/`), so `.env`, `tests/`, `scripts/`, `docs/`, `server.py` and `apps-script/` are never uploaded. Credentials in GitHub repository secrets (names in `deploy.yml`, values never in the repo).
- Cloudflare: bypass cache for `config.js`, `live.html` and `admin.html`; short cache for the rest.
- After the workshop: archive the repo, delete the subdomain and the DNS record, archive the Apps Script deployment.
