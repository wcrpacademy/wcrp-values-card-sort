/*
 * Values card sort settings: the only file to edit on the day.
 * Change one line, save, reload the page. No code changes needed.
 * See docs/PLAN.md §5a for what each setting does.
 */
window.CARD_SORT_CONFIG = {
  eventName: {                // one per language; a single "..." string also works
    en: "Leadership Workshop, Cape Town",
    fr: "Atelier sur le leadership, Le Cap"
  },
  languages: ["en", "fr"],    // participant page languages (flag menu in the header); ["en"] hides the menu
  idMode: "anonymous",        // "anonymous" | "self" | "badge"
  topN: 5,                    // 5 or 10
  valuesList: "trimmed",      // "full" (83) | "trimmed" (values with "trimmed": true in values.json)
  liveView: true,             // enables live.html for the projector
  liveMinResponses: 5,        // live chart stays hidden until this many results (keep in sync with apps-script.gs)
  onlineHost: "values.wcrp-academy.org", // pages loaded from this host save to onlineEndpoint; anywhere else uses offlineEndpoint
  onlineEndpoint: "https://script.google.com/macros/s/AKfycbxyFawzJ8If9TfmGj0djEp1e8FOTtkvV2lY7DSiMc46C_6PEOCXJCdqsTvOgJwkeMir/exec", // Apps Script web app URL (not secret)
  offlineEndpoint: "/api/submit",
  offlineLiveEndpoint: "/api/live", // live + admin views read group counts here in offline mode (server.py)
  sheetUrl: "",               // admin view: link to the Google Sheet (the Sheet stays private; this is only a shortcut)
  listVersion: "miller-2001-v1",
  newsletterSignup: true,     // "Join the newsletter" form on Start and Results (needs the Apps Script + MailerLite key); false hides it
  oneEntryPerDevice: true,    // after finishing, "Start again" is gone: one set of answers per phone. false allows retakes (testing)
  adminPinHash: "158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab"            // SHA-256 hex of the admin PIN (never the PIN itself)
};
