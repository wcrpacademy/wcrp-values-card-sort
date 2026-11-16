# Values Card Sort — PLAN (v2, one-time use)

Build brief for Claude Code. Owner: Ken. Updated 16 Nov 2026.

## 1. Goal

A values card sort that 45–50 participants do on their phones during the Cape Town Leadership workshop (Day 1, "Who I am when I lead"). **Results must be collected** so Doc Lau and Lora can see the group picture.

It is used **once**, so keep it as light as possible:

- one HTML file + one text file for the values list
- no framework, no build step, no database
- works **online** (venue internet) and **offline** (laptop + travel router) from the same files
- paper worksheet as the last fallback

Reference Doc Lau shared: https://drjennyshields.com/values-card-sort/. Copy the idea and flow only, not its code, wording or list.

## 2. Participant flow (until Step 2, as in the session plan)

0. **Start:** short intro, consent line ("Your answers are saved anonymously for the facilitators"), participant code (see §5). No names, no email.
1. **Sort:** one card at a time → Very important / Important / Not important. Progress bar, undo, review piles before continuing.
2. **Top values:** pick the top 5 from "Very important" (fill from "Important" if fewer than 5), then order them with up/down buttons.
3. **Results:** ranked top 5 + full "Very important" list. Sending happens automatically; status shown ("Saved" / "Not sent yet, retrying"). No download button (removed 17 Nov). Reminder to copy the top 5 onto the worksheet.

## 3. Values list

- Default: Miller, C'de Baca, Matthews & Wilbourne (2001) Personal Values Card Sort, marked public domain on the CASAA copy (https://casaa.unm.edu/assets/inst/personal-values-card-sort-2.pdf). Ken checks the notice; credit line on the start screen.
- 83 values is long on a phone; Doc Lau decides full list or a trimmed 40–50.
- Stored in `values.json` (`id`, `name`, `description`) so edits are text edits.

## 4. Files

See `FRONTEND_PLAN.md` §6 for the full code structure.

## 5. Collecting results

**One save routine, two destinations.** The page decides by where it was loaded from:

| Mode | When | Page served from | Results go to |
|---|---|---|---|
| **Online** | Venue internet works | Free static host (Vercel / Netlify / GitHub Pages) | **Google Sheet** via Apps Script web app |
| **Offline** | No internet | Ken's laptop on the travel router | **`results.csv`** on the laptop via `server.py` |

Rules for both:

- Every result gets a random `submission_id` made on the phone. The receiver ignores repeats, so retries never create duplicates.
- The phone keeps every result in `localStorage` until the receiver confirms. If sending fails, it retries every 15 s and when the page regains connection.
- After the session, offline CSV rows are appended to the same Google Sheet (one-off import), so Doc Lau has one place.

**Google Sheet:** "Database" (Ken's Drive; link kept by Ken). Set up 16 Nov with two tabs, header row frozen, time zone Africa/Johannesburg:

- **Results:** `submission_id, submitted_at, participant_code, id_mode, list_version, top_n, top_1 … top_10, very_important, important, not_important, mode` (top_6–top_10 stay empty when `topN` is 5; piles are `; `-separated).
- **Joins:** `device_id, joined_at, mode` (one row per phone that opened the page).

The offline `results.csv` and `joins.csv` use the same columns, so importing is a paste.

The receiver is written: `apps-script.gs` (handles `join` and `result` posts, dedupes by ID, strips leading `= + - @` so values can't become formulas, and serves live counts with a 5-second cache).

**Participant code:** set by `id_mode` in `config.js` (§5a). Default `anonymous`.

**Apps Script receiver (`apps-script.gs`), outline:**

- `doPost(e)`: body `{type:'join'|'result', …}`; checks fields and lengths; rejects anything over 10 KB; skips IDs already in the tab; appends one row; returns `{ok:true}`.
- `doGet()`: `{joined, sorting, finished, top:[{value,count}]}`; `top` stays empty until 5 results.
- Deploy as web app: execute as Ken, access "Anyone". The URL goes in `config.js`.
- Send from the page with `fetch(url, {method:'POST', body: JSON.stringify(row)})`. Use a plain-text body to avoid a CORS preflight, and read the JSON reply.
- No secrets in the page. The URL is not secret; validation and the size cap limit abuse. Turn the web app off after the workshop.

**`server.py` (offline):** Python standard library only. Serves the files, accepts `POST /api/submit`, dedupes by `submission_id`, appends to `results.csv` (UTF-8 with BOM for Excel) with a file lock. No IPs logged.

**Facilitator view (`admin.html`):** submission count, top values across the group (counts), CSV download. Online: reads the Sheet through a separate read-only Apps Script `doGet`. Offline: reads from `server.py`. Protected by a PIN (kept by Ken, not in any file in the vault).

## 5c. Newsletter sign-up (added 17 Nov, Ken)

- "Join the newsletter" on the Start and Results screens opens the same form as wcrp-academy.org: first name*, last name*, email*, country, language, affiliation, role (NGO member / Undergraduate / Postgraduate / Researcher), topics (the three IPCC working-group topics), consent* with a link to the privacy statement.
- The only place the app collects personal data. It is a separate request (`type: "newsletter"`) to the Apps Script, which forwards it to MailerLite (`connect.mailerlite.com`, key in Script properties) and stores nothing. It never carries the device ID, submission ID, participant code or answers.
- Online only. In offline mode the form says sign-up needs the internet.
- Spam: a hidden trap field; MailerLite's double opt-in (account setting) is recommended because the web app URL is public.
- `config.js` → `newsletterSignup: false` hides it.

## 5a. Settings (`config.js`)

Doc Lau can't decide yet, so every open choice is a setting. Change one line, reload, done. No code changes.

```js
window.CARD_SORT_CONFIG = {
  eventName: "Leadership Workshop, Cape Town",
  idMode: "anonymous",        // "anonymous" | "self" | "badge"
  topN: 5,                    // 5 or 10
  valuesList: "trimmed",      // "full" (83) | "trimmed" (from values.json "trimmed": true)
  liveView: true,             // enables live.html for the projector
  liveMinResponses: 5,        // live view stays hidden until this many results
  onlineEndpoint: "",         // Apps Script web app URL
  offlineEndpoint: "/api/submit",
  listVersion: "miller-2001-v1"
};
```

| Setting | Options | What participants see |
|---|---|---|
| `idMode: "anonymous"` | default | No code asked. The phone makes a random ID (e.g. `P-7F3K`). Nothing links results to a person. |
| `idMode: "self"` | | "Make up a short code you'll remember (e.g. initials + 2 digits)." Lets someone find their own result later. |
| `idMode: "badge"` | | "Enter the code on your badge." Use only if badge codes are also used in the pre/post survey, so results can be linked. Then apply the survey rules (pseudonyms, groups under 5 hidden). |
| `topN` | 5 / 10 | How many top values they pick and rank. |
| `valuesList` | full / trimmed | 83 cards or the shorter list. |

The start screen's consent line changes with `idMode`, so it always says honestly what is stored.

## 5b. Live view on the projector (`live.html`)

A screen for the facilitator to show **during** the session, updating every 5 seconds:

- **Joined:** a big counter that goes up each time someone scans the QR and opens the page ("38 joined")
- **Sorting now** and **Finished** (e.g. "12 sorting · 26 finished"), with a progress bar
- once at least `liveMinResponses` have finished: a ranked bar chart of the values chosen most often in people's top 5
- a ranked bar chart of the values chosen most often in people's top 5
- optional: the 3 values picked least often, to prompt discussion

**How "Joined" is counted:**

- The first time the page opens on a phone, it sends a small `join` message: the phone's random ID, a timestamp and `"join"`. Nothing else.
- The ID is stored on the phone, so refreshing or reopening doesn't count twice. The same person on a second phone or browser does count twice; that's acceptable for a room counter.
- When the result is submitted, that ID moves from "sorting" to "finished".
- Online: joins go to a second tab ("Joins") in the same Google Sheet; the live view reads counts from a read-only `doGet`. Offline: `server.py` keeps the same counts in memory and in `joins.csv`.
- Stretch goal if cheap: the counter animates up by one when a new join arrives.

The joined counter works before anyone finishes, so it can be on screen from the moment the QR code goes up: people see the number climb as the room scans in.

It never shows codes or individual results, only group counts, and stays blank until `liveMinResponses` results are in, so no one can be identified from the first few answers.

Why it's useful: the facilitator can pause and ask "Why do you think *Integrity* came out on top?" while the room is still in the moment. If `liveView` is off, the same chart is shown in `admin.html` after the session instead.

Online it reads a read-only `doGet` on the Apps Script (group counts only); offline it reads `server.py`. No PIN needed, because it shows nothing personal.

## 6. Network (summary; steps in README.md)

- **Online first.** Ask the venue whether guest Wi-Fi works for 50 phones; a captive portal is fine for online mode.
- **Hotel Wi-Fi won't work for offline mode.** Guest networks usually block device-to-device traffic, so phones can't reach the laptop.
- **Offline backup:** Ken's old router or a travel router.
  - It must handle 50+ devices; dual-band preferred. DHCP pool of 100+, laptop on a reserved IP, client isolation off, WPA2.
  - Test it at home with 10+ devices sending at once before flying.
  - Bring a South African plug adapter (type M/N) and a power bank for power cuts.
- Tell participants to turn mobile data off in offline mode. Phones will say "No internet"; that is expected.

## 7. Build phases (Claude Code)

1. `index.html` + `values.json` + `config.js`: full flow, localStorage resume, download, send queue with retry.
2. `apps-script.gs` + a test Google Sheet; connect online mode.
3. `server.py`: offline mode with the same row format.
4. `admin.html` and `live.html` for both modes; all settings in `config.js` working.
5. QR codes + README.
6. Test (§8).

## 8. Test checklist

- [ ] Full run on Android Chrome and iPhone Safari
- [ ] Refresh mid-sort → resumes
- [ ] Airplane mode at the results screen → "Not sent yet"; back online → sent once
- [ ] Press send twice / reload results → one row only
- [ ] 10+ phones at once, online and offline, all rows land
- [ ] Offline CSV imports cleanly into the Sheet
- [ ] Admin view PIN works; counts match the Sheet
- [ ] Each `idMode` works and the consent line matches it; `topN` 5 and 10 both work
- [ ] Joined counter rises within 5 s of a new phone opening the page; refresh does not add to it
- [ ] Chart stays hidden under `liveMinResponses`, then updates within 5 s
- [ ] 50 joins + polling for 15 min stays within Apps Script limits (one live view open)
- [ ] Page loads with no external requests (fonts and scripts inline)
- [ ] Paper worksheets printed

## 9. After the workshop

- Export the Sheet to CSV for Doc Lau and Lora.
- Turn off the Apps Script web app; take the page down.
- Agree with Doc Lau how long to keep the Sheet, then delete it.

## 10. Open questions for Doc Lau (all have defaults, nothing blocks the build)

| Question | Setting | Default until she decides |
|---|---|---|
| Full 83 values or trimmed? Any to add? | `valuesList` | trimmed |
| Top 5 or top 10? | `topN` | 5 |
| Anonymous, self-made code, or badge code? | `idMode` | anonymous |
| Show results live on the projector? | `liveView` | on |
| Who keeps the results, and for how long? | (process) | Ken exports to her and Lora, Sheet deleted after 3 months (?) |
