// Interface text in English and French for the participant page (index.html).
// The language only changes what is shown: answers are always sent with the English value
// names, so the Sheet, the live chart and the admin counts add French and English answers together.
//
// In index.html: data-i18n="key" fills an element's text, data-i18n-label="key" its aria-label.
// {name} in a string is a placeholder; plural strings have "one" and "other" forms.

export const LANG_NAMES = { en: 'English', fr: 'Français' };
const LANG_KEY = 'wcrp-cardsort-lang'; // per phone, separate from the session so "Start over" keeps it

const STRINGS = {
  en: {
    pageTitle: 'Values card sort · WCRP Academy',
    loading: 'Loading…',
    newTab: ' (opens in a new tab)',
    officialSite: 'Official site',
    officialSiteNote: ' (wcrp-academy.org, opens in a new tab)',
    langGroup: 'Language',
    langButton: 'Language: {name}',

    'brand.home': 'WCRP Academy values card sort: home',
    'start.title': 'What matters most to you?',
    'start.meta': '{cardTotal} values · about {minutes} minutes',
    'start.step1': 'Sort each value into one of three piles.',
    'start.pilesLabel': 'The three piles',
    'start.step2': 'Pick your top {topN} values.',
    'start.step3': 'Put them in order, most important first.',
    'start.lost': "Your earlier sorting couldn't be restored, so you're starting again.",
    'start.noStore': "This browser can't save your progress. Keep this page open until you finish.",
    'start.button': 'Start sorting',

    'consent.anonymous':
      "Your answers are saved anonymously for the facilitators. We don't ask for your name, and nothing links your answers to you.",
    'consent.self':
      "Your answers are saved for the facilitators with a code you make up. Don't use your name: the code is only there so you can find your own result later.",
    'consent.badge':
      'Your answers are saved with your badge code (not your name), so the facilitators can link them to your workshop survey. Only group totals are shown to the room.',

    'code.self.label': 'Your code',
    'code.self.hint': "Make up a short code you'll remember, like your initials and 2 digits (e.g. KR27).",
    'code.self.empty': 'Make up a code to continue.',
    'code.self.invalid': 'Use 2 to 12 letters or numbers.',
    'code.badge.label': 'Badge code',
    'code.badge.hint': 'Enter the code printed on your badge.',
    'code.badge.empty': 'Enter your badge code to continue.',
    'code.badge.invalid': 'Enter the code as it is on your badge: letters, numbers and dashes only.',

    'pile.very': 'Very important',
    'pile.important': 'Important',
    'pile.not': 'Not important',

    'step.sort': 'Sort',
    'step.review': 'Review',
    'step.choose': 'Choose',
    'step.rank': 'Rank',
    'step.results': 'Results',
    stepper: 'Step {n} of 5 · {name}',

    'sort.cardOf': 'Card {cardIndex} of {cardTotal}',
    'sort.undo': 'Undo',
    'sort.progress': 'Cards sorted',
    'sort.next': 'Next',
    'sort.prompt': 'How important is this to you?',
    'sort.pileGroup': 'Put this value in a pile',
    'sort.hint': 'Drag the card onto a pile, or tap a pile.',
    'sort.keys': ' Keys: 1, 2, 3 · Z to undo.',
    'sort.pileDesc.one': '{n} value in this pile so far',
    'sort.pileDesc.other': '{n} values in this pile so far',
    'sort.announce': '{name}: {desc}. Card {i} of {total}.',
    'sort.announceBack': 'Back to {name}: {desc}. Card {i} of {total}.',

    'review.title': 'Review your piles',
    'review.lead': "All {cardTotal} sorted. Move any value that's in the wrong pile.",
    'review.countUnit': ' values',
    'review.next': 'Choose my top {topN}',
    'review.empty': 'Nothing in this pile.',
    'review.moveLabel': 'Move {name} to another pile',
    'review.move': 'Move',
    'review.moveTo': 'to {pile}',
    'review.needMore': 'Move at least {topN} values into Very important or Important to continue.',
    'review.alsoImportant': "You'll also choose from your Important pile.",
    'review.moved': '{name} moved to {pile}.',

    'choose.back': 'Back to my piles',
    'choose.title': 'Choose your top {topN}',
    'choose.lead': 'Tick the {topN} that matter most.',
    'choose.extra': 'Your Very important pile has fewer than {topN}, so your Important pile is here too.',
    'choose.count': '{n} of {topN} chosen',
    'choose.more': 'Choose {n} more.',
    'choose.ready': 'Ready to continue.',
    'choose.tooMany': "You've already chosen {topN}. Remove one to choose a different value.",
    'choose.moreToGo': 'Choose {n} more to continue.',
    'choose.next': 'Continue',

    'rank.back': 'Change my choices',
    'rank.title': 'Put them in order',
    'rank.lead': 'Most important at the top. Use the arrows to move a value.',
    'rank.up': 'Move {name} up',
    'rank.down': 'Move {name} down',
    'rank.now': '{name} is now number {pos} of {total}.',
    'rank.next': 'See my results',
    'rank.final': "You can't change your answers after this.",

    'results.title': 'Your top {rankedCount} values',
    'results.lead': 'What matters most to you, in your own order.',
    'results.code': 'Your code: {code}',
    'results.retry': 'Try again',
    'results.copy': 'Copy your top {rankedCount} onto your worksheet.',
    'results.very': 'Your Very important pile ({veryCount})',
    'save.local': 'Your results are saved on this phone.',
    'save.saving': 'Saving…',
    'save.saved': 'Saved',
    'save.pending': "Not sent yet, we'll keep trying",

    'error.title': 'Something went wrong',
    'error.reload': 'Reload the page',
    'error.load': "We couldn't load the activity. Reload the page, or ask a facilitator for a paper worksheet.",
    'error.setup': "The activity isn't set up yet. Please tell a facilitator.",

    'restart.over': 'Start over',
    'restart.overQ': 'Start over? This clears your answers on this phone.',
    'restart.overYes': 'Yes, start over',
    'restart.again': 'Start again',
    'restart.againQ': 'Start again? This clears your answers on this phone.',
    'restart.againYes': 'Yes, start again',
    'restart.cancel': 'Cancel',
    'restart.cleared': 'Your answers on this phone were cleared.',
    'restart.done': 'Thanks for taking part. Each phone can send one set of answers.',

    'tutorial.title': 'How to sort',
    'tutorial.drag': 'Drag the card onto a pile, or just tap a pile.',
    'tutorial.undo': 'Changed your mind? Tap Undo.',
    'tutorial.ok': 'Got it',

    'news.title': 'Stay in touch with the WCRP Academy',
    'news.lead': 'Climate science training and opportunities, in our quarterly newsletter.',
    'news.open': 'Join the newsletter',
    'news.thanks': "You're signed up. Thank you!",
    'links.flp': 'Future Leaders Programme',
    'links.flpText': "The WCRP Academy's programme for the next generation of climate science leaders.",
    'links.flpMore': 'Find out more',
    'links.catalogue': 'Training catalogue',
    'links.catalogueText': 'Browse climate science courses and training from across the WCRP Academy network.',
    'links.catalogueMore': 'Browse training',
    'footer.tagline': 'A hub for climate science training',
    'footer.social': 'WCRP Academy on social media',
    'footer.on': 'WCRP Academy on {site} (opens in a new tab)',
    'footer.copy': '© {year} WCRP Academy. All rights reserved.',

    'nl.title': 'Join the WCRP Academy newsletter',
    'nl.close': 'Close',
    'nl.intro':
      'Climate science training and opportunities, four times a year. This is separate from the card sort: your values answers stay anonymous.',
    'nl.required': 'Required',
    'nl.first': 'First name',
    'nl.last': 'Last name',
    'nl.email': 'Email address',
    'nl.country': 'Country',
    'nl.countryPick': 'Select your country',
    'nl.language': 'Language',
    'nl.languagePick': 'Select a language',
    'nl.affiliation': 'Affiliation or institution',
    'nl.roles': 'Are you a/an…',
    'nl.topics': 'What topics are you interested in?',
    'nl.consentBefore': 'I agree to receive communications from the WCRP Academy and accept the',
    'nl.consentLink': 'data privacy statement',
    'nl.consentAfter': '.',
    'nl.submit': 'Subscribe',
    'nl.submitting': 'Subscribing…',
    'nl.doneTitle': 'Thank you for signing up!',
    'nl.doneText': 'Look out for the WCRP Academy newsletter in your inbox.',
    'nl.offlineTitle': 'Sign-up needs the internet',
    'nl.offlineText':
      "This page is running without an internet connection, so we can't sign you up here. You can sign up any time at wcrp-academy.org.",
    'nl.errFirst': 'Enter your first name.',
    'nl.errLast': 'Enter your last name.',
    'nl.errEmail': 'Enter your email address.',
    'nl.errEmailBad': 'Enter an email address like name@example.org.',
    'nl.errConsent': 'Tick the box to agree, so we can send you the newsletter.',
    'nl.errOffline': 'You seem to be offline. Check your connection and try again.',
    'nl.errRefused': "This email address wasn't accepted. Please check it.",
    'nl.errLater': "We couldn't sign you up just now. Please try again, or sign up later at wcrp-academy.org.",
  },

  fr: {
    pageTitle: 'Tri des valeurs · WCRP Academy',
    loading: 'Chargement…',
    newTab: ' (s’ouvre dans un nouvel onglet)',
    officialSite: 'Site officiel',
    officialSiteNote: ' (wcrp-academy.org, s’ouvre dans un nouvel onglet)',
    langGroup: 'Langue',
    langButton: 'Langue : {name}',

    'brand.home': 'Tri des valeurs de la WCRP Academy : accueil',
    'start.title': 'Qu’est-ce qui compte le plus pour vous ?',
    'start.meta': '{cardTotal} valeurs · environ {minutes} minutes',
    'start.step1': 'Placez chaque valeur dans l’une des trois piles.',
    'start.pilesLabel': 'Les trois piles',
    'start.step2': 'Choisissez vos {topN} valeurs les plus importantes.',
    'start.step3': 'Classez-les, de la plus importante à la moins importante.',
    'start.lost': 'Votre tri précédent n’a pas pu être récupéré : vous recommencez depuis le début.',
    'start.noStore': 'Ce navigateur ne peut pas enregistrer votre progression. Gardez cette page ouverte jusqu’à la fin.',
    'start.button': 'Commencer le tri',

    'consent.anonymous':
      'Vos réponses sont enregistrées de façon anonyme pour les animateurs. Nous ne demandons pas votre nom, et rien ne relie vos réponses à vous.',
    'consent.self':
      'Vos réponses sont enregistrées pour les animateurs avec un code que vous inventez. N’utilisez pas votre nom : ce code sert seulement à retrouver votre propre résultat plus tard.',
    'consent.badge':
      'Vos réponses sont enregistrées avec le code de votre badge (pas votre nom), pour que les animateurs puissent les relier à votre questionnaire d’atelier. Seuls les totaux du groupe sont montrés à la salle.',

    'code.self.label': 'Votre code',
    'code.self.hint': 'Inventez un code court facile à retenir, par exemple vos initiales et 2 chiffres (ex. KR27).',
    'code.self.empty': 'Inventez un code pour continuer.',
    'code.self.invalid': 'Utilisez de 2 à 12 lettres ou chiffres.',
    'code.badge.label': 'Code du badge',
    'code.badge.hint': 'Saisissez le code imprimé sur votre badge.',
    'code.badge.empty': 'Saisissez le code de votre badge pour continuer.',
    'code.badge.invalid': 'Saisissez le code tel qu’il figure sur votre badge : lettres, chiffres et tirets uniquement.',

    'pile.very': 'Très important',
    'pile.important': 'Important',
    'pile.not': 'Pas important',

    'step.sort': 'Trier',
    'step.review': 'Vérifier',
    'step.choose': 'Choisir',
    'step.rank': 'Classer',
    'step.results': 'Résultats',
    stepper: 'Étape {n} sur 5 · {name}',

    'sort.cardOf': 'Carte {cardIndex} sur {cardTotal}',
    'sort.undo': 'Annuler',
    'sort.progress': 'Cartes triées',
    'sort.next': 'Suivante',
    'sort.prompt': 'Quelle importance cela a-t-il pour vous ?',
    'sort.pileGroup': 'Placer cette valeur dans une pile',
    'sort.hint': 'Faites glisser la carte sur une pile, ou touchez une pile.',
    'sort.keys': ' Touches : 1, 2, 3 · Z pour annuler.',
    'sort.pileDesc.one': '{n} valeur dans cette pile pour l’instant',
    'sort.pileDesc.other': '{n} valeurs dans cette pile pour l’instant',
    'sort.announce': '{name} : {desc}. Carte {i} sur {total}.',
    'sort.announceBack': 'Retour à {name} : {desc}. Carte {i} sur {total}.',

    'review.title': 'Vérifiez vos piles',
    'review.lead': 'Les {cardTotal} valeurs sont triées. Déplacez celles qui ne sont pas dans la bonne pile.',
    'review.countUnit': ' valeurs',
    'review.next': 'Choisir mes {topN} valeurs',
    'review.empty': 'Cette pile est vide.',
    'review.moveLabel': 'Déplacer {name} vers une autre pile',
    'review.move': 'Déplacer',
    'review.moveTo': 'vers {pile}',
    'review.needMore': 'Placez au moins {topN} valeurs dans Très important ou Important pour continuer.',
    'review.alsoImportant': 'Vous choisirez aussi dans votre pile Important.',
    'review.moved': '{name} est maintenant dans la pile {pile}.',

    'choose.back': 'Retour à mes piles',
    'choose.title': 'Choisissez vos {topN} valeurs',
    'choose.lead': 'Cochez les {topN} qui comptent le plus.',
    'choose.extra': 'Votre pile Très important en contient moins de {topN} : votre pile Important est donc aussi proposée.',
    'choose.count': '{n} sur {topN} choisies',
    'choose.more': 'Choisissez-en encore {n}.',
    'choose.ready': 'Vous pouvez continuer.',
    'choose.tooMany': 'Vous en avez déjà choisi {topN}. Retirez-en une pour choisir une autre valeur.',
    'choose.moreToGo': 'Choisissez-en encore {n} pour continuer.',
    'choose.next': 'Continuer',

    'rank.back': 'Modifier mes choix',
    'rank.title': 'Classez-les',
    'rank.lead': 'La plus importante en haut. Utilisez les flèches pour déplacer une valeur.',
    'rank.up': 'Monter {name}',
    'rank.down': 'Descendre {name}',
    'rank.now': '{name} est maintenant en position {pos} sur {total}.',
    'rank.next': 'Voir mes résultats',
    'rank.final': 'Vous ne pourrez plus modifier vos réponses ensuite.',

    'results.title': 'Vos {rankedCount} valeurs les plus importantes',
    'results.lead': 'Ce qui compte le plus pour vous, dans votre propre ordre.',
    'results.code': 'Votre code : {code}',
    'results.retry': 'Réessayer',
    'results.copy': 'Recopiez ces {rankedCount} valeurs sur votre fiche de travail.',
    'results.very': 'Votre pile Très important ({veryCount})',
    'save.local': 'Vos résultats sont enregistrés sur ce téléphone.',
    'save.saving': 'Enregistrement…',
    'save.saved': 'Enregistré',
    'save.pending': 'Pas encore envoyé, nous réessayons',

    'error.title': 'Un problème est survenu',
    'error.reload': 'Recharger la page',
    'error.load':
      'Impossible de charger l’activité. Rechargez la page, ou demandez une fiche papier à un animateur.',
    'error.setup': 'L’activité n’est pas encore prête. Merci de prévenir un animateur.',

    'restart.over': 'Recommencer',
    'restart.overQ': 'Recommencer ? Vos réponses sur ce téléphone seront effacées.',
    'restart.overYes': 'Oui, recommencer',
    'restart.again': 'Refaire l’activité',
    'restart.againQ': 'Refaire l’activité ? Vos réponses sur ce téléphone seront effacées.',
    'restart.againYes': 'Oui, refaire l’activité',
    'restart.cancel': 'Annuler',
    'restart.cleared': 'Vos réponses sur ce téléphone ont été effacées.',
    'restart.done': 'Merci de votre participation. Chaque téléphone peut envoyer une seule série de réponses.',

    'tutorial.title': 'Comment trier',
    'tutorial.drag': 'Faites glisser la carte sur une pile, ou touchez simplement une pile.',
    'tutorial.undo': 'Vous avez changé d’avis ? Touchez Annuler.',
    'tutorial.ok': 'Compris',

    'news.title': 'Restez en contact avec la WCRP Academy',
    'news.lead': 'Formations et opportunités en science du climat, dans notre lettre d’information trimestrielle.',
    'news.open': 'S’abonner à la lettre d’information',
    'news.thanks': 'Inscription confirmée. Merci !',
    'links.flp': 'Future Leaders Programme',
    'links.flpText': 'Le programme de la WCRP Academy pour la prochaine génération de leaders en science du climat.',
    'links.flpMore': 'En savoir plus',
    'links.catalogue': 'Catalogue de formations',
    'links.catalogueText': 'Parcourez les cours et formations en science du climat de tout le réseau de la WCRP Academy.',
    'links.catalogueMore': 'Voir les formations',
    'footer.tagline': 'Un pôle de formation en science du climat',
    'footer.social': 'La WCRP Academy sur les réseaux sociaux',
    'footer.on': 'La WCRP Academy sur {site} (s’ouvre dans un nouvel onglet)',
    'footer.copy': '© {year} WCRP Academy. Tous droits réservés.',

    'nl.title': 'Abonnez-vous à la lettre d’information de la WCRP Academy',
    'nl.close': 'Fermer',
    'nl.intro':
      'Formations et opportunités en science du climat, quatre fois par an. C’est indépendant du tri des valeurs : vos réponses restent anonymes.',
    'nl.required': 'Obligatoire',
    'nl.first': 'Prénom',
    'nl.last': 'Nom',
    'nl.email': 'Adresse e-mail',
    'nl.country': 'Pays',
    'nl.countryPick': 'Choisissez votre pays',
    'nl.language': 'Langue',
    'nl.languagePick': 'Choisissez une langue',
    'nl.affiliation': 'Affiliation ou institution',
    'nl.roles': 'Vous êtes…',
    'nl.topics': 'Quels sujets vous intéressent ?',
    'nl.consentBefore': 'J’accepte de recevoir des communications de la WCRP Academy et j’accepte la',
    'nl.consentLink': 'déclaration de confidentialité des données',
    'nl.consentAfter': '.',
    'nl.submit': 'S’abonner',
    'nl.submitting': 'Abonnement en cours…',
    'nl.doneTitle': 'Merci pour votre inscription !',
    'nl.doneText': 'La lettre d’information de la WCRP Academy arrivera dans votre boîte de réception.',
    'nl.offlineTitle': 'L’inscription nécessite Internet',
    'nl.offlineText':
      'Cette page fonctionne sans connexion Internet, nous ne pouvons donc pas vous inscrire ici. Vous pouvez vous inscrire à tout moment sur wcrp-academy.org.',
    'nl.errFirst': 'Saisissez votre prénom.',
    'nl.errLast': 'Saisissez votre nom.',
    'nl.errEmail': 'Saisissez votre adresse e-mail.',
    'nl.errEmailBad': 'Saisissez une adresse e-mail du type nom@exemple.org.',
    'nl.errConsent': 'Cochez la case pour donner votre accord, afin que nous puissions vous envoyer la lettre d’information.',
    'nl.errOffline': 'Vous semblez être hors ligne. Vérifiez votre connexion et réessayez.',
    'nl.errRefused': 'Cette adresse e-mail n’a pas été acceptée. Merci de la vérifier.',
    'nl.errLater':
      'Nous n’avons pas pu vous inscrire pour le moment. Réessayez, ou inscrivez-vous plus tard sur wcrp-academy.org.',
  },
};

// Newsletter choices: the value sent to MailerLite stays in English (same as the wcrp-academy.org form);
// only the label shown changes.
export const CHOICE_LABELS = {
  fr: {
    English: 'Anglais',
    French: 'Français',
    Spanish: 'Espagnol',
    Portuguese: 'Portugais',
    Arabic: 'Arabe',
    Chinese: 'Chinois',
    Russian: 'Russe',
    Other: 'Autre',
    'NGO member': 'Membre d’une ONG',
    Undergraduate: 'Étudiant(e) en licence',
    Postgraduate: 'Étudiant(e) en master ou doctorat',
    Researcher: 'Chercheur ou chercheuse',
    'Climate Change Impacts Adaptation and Vulnerability': 'Impacts du changement climatique, adaptation et vulnérabilité',
    'Mitigation of Climate Change': 'Atténuation du changement climatique',
    'Physical Science Basis of Climate Change': 'Bases scientifiques physiques du changement climatique',
  },
};

let lang = 'en';
let available = ['en'];
const listeners = [];

/** The languages offered (config.js `languages`), and which one to start in. */
export function initLang(cfg) {
  const wanted = Array.isArray(cfg.languages) ? cfg.languages : ['en'];
  available = wanted.filter((l) => STRINGS[l]);
  if (!available.length) available = ['en'];
  lang = pickStart();
  document.documentElement.lang = lang;
}

function pickStart() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (available.includes(saved)) return saved;
  } catch {
    /* storage blocked: fall through */
  }
  for (const l of navigator.languages || [navigator.language || '']) {
    const base = String(l).slice(0, 2).toLowerCase();
    if (available.includes(base)) return base;
  }
  return available[0];
}

export const getLang = () => lang;
export const getLanguages = () => [...available];

export function setLang(next) {
  if (!available.includes(next) || next === lang) return;
  lang = next;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage blocked: the choice lasts until the page closes */
  }
  for (const fn of listeners) fn(lang);
}

export const onLangChange = (fn) => listeners.push(fn);

/** Text for a key, with {placeholders} filled. Falls back to English, then to the key. */
export function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Plural text: uses key.one or key.other for the number n (French counts 0 and 1 as singular). */
export function tn(key, n, vars = {}) {
  const form = new Intl.PluralRules(lang).select(n) === 'one' ? 'one' : 'other';
  return t(`${key}.${form}`, { n, ...vars });
}

/** A label for a newsletter choice whose value stays in English. */
export const choiceLabel = (value) => (CHOICE_LABELS[lang] && CHOICE_LABELS[lang][value]) || value;

/**
 * Text for a key as a list of pieces, where a placeholder whose value is a DOM node stays a node
 * (e.g. the bold step name in "Step 2 of 5 · Review"). Use with node.replaceChildren(...parts()).
 */
export function parts(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return s
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((piece) => {
      const m = /^\{(\w+)\}$/.exec(piece);
      if (!m || !(m[1] in vars)) return piece;
      const v = vars[m[1]];
      return v instanceof Node ? v : String(v);
    });
}

/**
 * Fill every [data-i18n] / [data-i18n-label] under root. vars fills the placeholders;
 * an element's own data-* attributes (e.g. data-site) can fill them too.
 */
export function applyText(vars = {}, root = document) {
  document.title = t('pageTitle');
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const text = t(node.dataset.i18n, { ...vars, ...node.dataset });
    if (node.textContent !== text) node.textContent = text;
  }
  for (const node of root.querySelectorAll('[data-i18n-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel, { ...vars, ...node.dataset }));
  }
}
