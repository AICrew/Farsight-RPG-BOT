const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');
const config = require('../config.json');

const supportedTypes = ['abilities', 'skills'];

i18next.use(Backend).init({
  lng: config.language || 'it',
  fallbackLng: 'it',
  backend: {
    loadPath: path.join(__dirname, `../locales/{{lng}}.json`)
  },
  interpolation: {
    escapeValue: false
  }
});

/**
 * Traduzione semplice con chiavi flat o con interpolazione
 * @param {string} key - Chiave di traduzione
 * @param {object} [vars] - Variabili da interpolare
 * @returns {string}
 */
function loc(key, vars) {
  return i18next.t(key, vars);
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

module.exports = { loc, translate };
