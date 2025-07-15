const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Cache per le traduzioni
let translationsCache = null;
const supportedLangs = ['it', 'en']; // Lingue supportate

/**
 * Carica le traduzioni con caching e fallback
 */
function loadTranslations() {
  if (translationsCache) return translationsCache;

  const lang = supportedLangs.includes(config.language) ? config.language : 'en';
  const filePath = path.join(__dirname, `../locales/${lang}.json`);

  try {
    translationsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[Translator] Error loading ${filePath}:`, error.message);
    translationsCache = { _fallback: true };
  }

  return translationsCache;
}

/**
 * Traduce una stringa con supporto a strutture nidificate
 * @param {string} key - Chiave di traduzione
 * @param {Object} [vars] - Variabili per interpolazione
 * @returns {string} Testo tradotto
 */
function translate(key, vars = {}) {
  if (!key) return '—';
  
  const locales = loadTranslations();
  if (locales._fallback) return key; // Fallback se il caricamento fallisce

  // Cerca nelle categorie principali
  const categories = ['abilities', 'skills', 'attacks', 'powers', 'traits', 'ui'];
  
  // 1. Traduzione diretta
  if (locales[key]) {
    return interpolate(locales[key], vars);
  }

  // 2. Cerca nelle categorie nidificate
  for (const category of categories) {
    if (locales[category]?.[key]) {
      return interpolate(locales[category][key], vars);
    }
  }

  // 3. Fallback alla chiave originale
  return key;
}

/**
 * Versione semplificata per chiavi sicure
 */
function loc(key) {
  return translate(key);
}

/**
 * Sostituisce {var} nei testi tradotti
 * @private
 */
function interpolate(text, vars) {
  return Object.entries(vars).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }, text);
}

// Verifica iniziale delle traduzioni
(function init() {
  const locales = loadTranslations();
  if (locales._fallback) {
    console.warn(`[Translator] Using fallback mode for language: ${config.language}`);
  } else {
    console.log(`[Translator] Loaded translations for: ${config.language}`);
  }
})();

module.exports = { 
  translate, 
  loc,
  // Per testing
  _clearCache: () => { translationsCache = null; } 
};