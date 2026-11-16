# Values card sort (WCRP Academy)

A one-time values card sort for the WCRP Academy Leadership workshop in Cape Town. Participants sort values on their phones; results go to a Google Sheet (online) or the organiser's laptop (offline); a projector page shows the group picture live.

- Participants: `index.html` (Start → Sort → Review → Choose → Rank → Results)
- Projector: `live.html`
- Organiser: `admin.html` (PIN)

Plans: [docs/PLAN.md](docs/PLAN.md) · [docs/FRONTEND_PLAN.md](docs/FRONTEND_PLAN.md) · on the day: [docs/DAY-OF-SETUP.md](docs/DAY-OF-SETUP.md)

## Commands (Node 24)

| Command | What it does |
|---|---|
| `npm ci` | Install the dev tools (Playwright, qrcode). Nothing from `node_modules` is ever deployed. |
| `npm run preview` | The site on http://127.0.0.1:4173 with a **mock** Apps Script (real `apps-script.gs`, in-memory Sheet, fake MailerLite). Admin PIN there: `1234`. |
| `npm test` | Playwright tests against the preview server, at 375 / 768 / 1280 px (uses your installed Chrome). |
| `npm run qr` | QR codes for `https://<onlineHost>/` into `qr/` (SVG for the projector, PNG for slides and cards). |
| `npm run pin` | Prints the hash of an organiser PIN for `adminPinHash` in `config.js`. |
| `npm run mailerlite` | Lists your MailerLite groups and field keys (reads the key from `.env`; read-only). |

## Settings: `config.js`

Everything that may change on the day: event name, `idMode`, `topN`, `valuesList`, `liveView`, `liveMinResponses`, endpoints, list version, newsletter on/off, admin PIN hash. Change a line, save, reload. See [docs/PLAN.md §5a](docs/PLAN.md).

## Going live (online mode)

1. **Apps Script.** In the "Database" Google Sheet: Extensions → Apps Script → paste [apps-script/apps-script.gs](apps-script/apps-script.gs).
   Project Settings → Script properties: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`.
   Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. Copy the `…/exec` URL into `onlineEndpoint` in `config.js`.
   After changing the script: Deploy → Manage deployments → Edit → **New version** (keeps the same URL).
2. **Admin PIN.** `npm run pin`, paste the hash into `adminPinHash`. Optional: `sheetUrl` for a shortcut to the Sheet.
3. **Hosting.** `values.wcrp-academy.org` points at its own folder on the Academy's Infomaniak hosting (Cloudflare DNS, proxied, SSL Full (strict)).
   Cloudflare: bypass the cache for `config.js`, `live.html` and `admin.html`; a short cache for the rest.
4. **Deploy.** Add the GitHub repository secrets `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_PATH`. Every push to `main` runs the tests and then uploads only the files the pages need ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).
5. **Check.** Open the site on a phone, finish a `TEST` run, see the row in the Sheet and the count in `admin.html`; sign up to the newsletter once with your own email.

## Offline mode

`python server.py` on the organiser's laptop over a travel router (Phase 4, not built yet). See [docs/DAY-OF-SETUP.md](docs/DAY-OF-SETUP.md).

## Privacy

- Card sort: no names, emails, IPs or device details. A random phone ID (for the Joined counter) and a random or self-made code. Group counts are hidden until `liveMinResponses` people finish.
- Newsletter (optional, separate): name, email and the live site's form fields go straight to MailerLite through the Apps Script. Never stored in the Sheet or on the phone, never linked to card-sort answers.
- Secrets: the MailerLite key lives in Apps Script Script properties (and `.env` for the local helper, gitignored). SFTP credentials are GitHub secrets. The admin PIN is stored only as a hash.

## After the workshop

Export the Sheet for Doc Lau and Lora, archive the Apps Script deployment, delete the subdomain and its DNS record, archive this repo ([docs/PLAN.md §9](docs/PLAN.md)).

Values list: Personal Values Card Sort, W. R. Miller, J. C'de Baca, D. B. Matthews and P. L. Wilbourne, University of New Mexico, 2001. Font: Plus Jakarta Sans (SIL Open Font Licence, [fonts/OFL.txt](fonts/OFL.txt)).
