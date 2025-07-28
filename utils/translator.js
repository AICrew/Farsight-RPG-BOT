const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const config = require('../config.json');

const supportedTypes = ['abilities', 'skills'];

let initialized = false;

async function init() {
  if (initialized) return;

  await i18next.use(Backend).init({
    lng: config.language || 'it',
    fallbackLng: 'it',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}.json')
    },
    interpolation: {
      escapeValue: false
    }
  });

  initialized = true;
}
/**
 * Traduzione semplice con chiavi flat o con interpolazione
 * @param {string} key - Chiave di traduzione
 * @param {object} [vars] - Variabili da interpolare
 * @returns {string}
 */
function loc(key, vars) {
  return i18next.t(key, vars);
}

// Ritorna un oggetto con tutte le lingue disponibili e la traduzione per quella chiave
function locAll(key) {
  const locales = {
    'it': 'it',
    'en': 'en-GB' // oppure 'en-US' se preferisci
  };

  const result = {};
  for (const [short, discordCode] of Object.entries(locales)) {
    result[discordCode] = i18next.getFixedT(short)(key);
  }

  return result;
}


// Funzione per pulire la stringa: minuscolo ascii, rimuove accenti e spazi
function normalizeCommandName(str) {
  return str
    .toLowerCase()
    .normalize('NFD')             // decomponi lettere accentate
    .replace(/[\u0300-\u036f]/g, '') // rimuovi segni diacritici
    .replace(/[^a-z0-9_-]/g, '') // tieni solo lettere minuscole, numeri, _ e -
}

// Funzione che restituisce localizzazioni pulite
function locAllName(prefix) {
  const rawLoc = locAll(prefix); // es. { it: "Abilità", en: "Ability" }
  const cleanedLoc = {};
  for (const [lang, str] of Object.entries(rawLoc)) {
    cleanedLoc[lang] = normalizeCommandName(str);
  }
  return cleanedLoc;
}

/**
 * Traduzione dinamica di abilità e qualifiche
 * @param {string} str - Valore da tradurre (es. "Combativity", "Gunnery")
 * @param {'abilities' | 'skills'} type - Tipo di valore
 * @returns {string}
 */
function translate(str, type) {
  if (!str || !supportedTypes.includes(type)) return str;

  const fullKey = type === 'abilities'
    ? `abilitiesValue.${str}`
    : `skillsValue.${str}`;

  const translation = i18next.t(fullKey);
  return translation !== fullKey ? translation : str;
}

module.exports = { loc, translate, init, locAll, locAllName };
