# wcrp-values-card-sort

A one-time values card sort for the WCRP Academy Leadership workshop in Cape Town (Day 1, "Who I am when I lead"). Participants use their phones; results go to a Google Sheet (online) or the organiser's laptop (offline); a live projector view shows joins and group results.

## Read first

1. `docs/PLAN.md`: what it does, data, settings, network, collection.
2. `docs/FRONTEND_PLAN.md`: screens, look, code structure, build phases, deploy.
3. `docs/DAY-OF-SETUP.md`: how it is run on the day.

## Rules

- Static HTML/CSS/vanilla JS only. No framework, no bundler, no CDN, no external requests at runtime (fonts are self-hosted).
- Everything that may change on the day lives in `config.js`. Never hard-code event name, `topN`, `idMode`, endpoints or the list version.
- Collect no names, emails, IPs or device details. Only the fields listed in `docs/PLAN.md`.
- One exception (Ken, 17 Nov 2026): the optional newsletter sign-up form (`js/newsletter.js`) collects name, email and the other fields of the wcrp-academy.org form. It goes straight to MailerLite through the Apps Script and must never be stored in the Sheet, on the phone (beyond a yes/no flag) or in `server.py`, and never sent with or linked to card-sort data (no device ID, submission ID or participant code).
- WCRP Academy brand tokens and WCAG 2.2 AA rules in `docs/FRONTEND_PLAN.md` §2 and §8 are fixed. Never put green, cyan or yellow text on light backgrounds.
- Never hide content on small screens; adapt the layout.
- Node 24 (`.nvmrc`), used for tooling only. The offline server is Python standard library only.
- Build in the phases in `docs/FRONTEND_PLAN.md` §9 and stop after each phase for Ken's review.

## Secrets

- None belong in this repo. The Apps Script web app URL is not secret and goes in `config.js`.
- The admin PIN is never committed: store only its SHA-256 hash in `config.js`.
- MailerLite API key: in the Apps Script's Script properties (`MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`) for the live form, and in the gitignored `.env` for `npm run mailerlite`. Never in `config.js` or any file the page loads. `server.py` and the deploy must never serve or upload `.env`.
- Infomaniak SFTP credentials live in GitHub repository secrets (names only in `deploy.yml`).

## Git

- Default branch `main`; work on `feat/*` branches.
- Commit or push only when Ken asks.

## Hosting

- `values.wcrp-academy.org` on the Academy's Infomaniak web hosting (static), behind Cloudflare.
- Offline: `python server.py` on the organiser's laptop over a local router.
- Retire after the workshop (see `docs/FRONTEND_PLAN.md` §10).
