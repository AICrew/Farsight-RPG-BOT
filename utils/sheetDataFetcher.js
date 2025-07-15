const googleAuth = require('./googleAuth');
const importMap = require('./importMap');
const logger = require('./logger');

class SheetDataFetcher {
  /**
   * Estrae tutti i dati strutturati dal foglio Google
   * @param {string} fullLink - URL completo del foglio
   */
  async fetchAllData(fullLink) {
    try {
      const doc = await googleAuth.getDocFromLink(fullLink);
      const sheet = doc.sheetsByIndex[0];
      if (!sheet) throw new Error('Nessun tab disponibile nel foglio');

      logger.info(`[fetchAllData] Caricamento completo di tutte le celle del tab...`);
      try {
        await sheet.loadCells(); // 🔁 Carica tutto il foglio
        logger.info(`[fetchAllData] Celle caricate con successo`);
      } catch (err) {
        logger.error('Errore durante loadCells globale', { cause: err.message });
        throw new Error('Errore durante il caricamento completo del foglio');
      }

      // Estrazione dati
      return {
        character: this._extractSection(sheet, importMap.character),
        abilities: this._extractAbilities(sheet),
        skills: this._extractAllSkills(sheet),
        attacks: this._extractDynamicSection(sheet, 'attacks'),
        powers: this._extractDynamicSection(sheet, 'powers'),
        traits: this._extractTraits(sheet)
      };

    } catch (error) {
      logger.error('Estrazione dati fallita', { error: error.message });
      throw new Error(`Errore lettura foglio: ${error.message}`);
    }
  }

  // === METODI PRIVATI === //

  _extractSection(sheet, sectionMap) {
    const data = {};
    for (const [key, cell] of Object.entries(sectionMap)) {
      data[key] = this._getCellValue(sheet, cell);
    }
    return data;
  }

  _extractAbilities(sheet) {
    const abilities = {};
    for (const [name, data] of Object.entries(importMap.abilities)) {
      abilities[name] = {
        value: this._getCellValue(sheet, data.value),
        skills: this._extractSection(sheet, data.skills)
      };
    }
    return abilities;
  }

  _extractAllSkills(sheet) {
    const skills = [];
    for (const [abilityName, abilityData] of Object.entries(importMap.abilities)) {
      for (const [skillName, cell] of Object.entries(abilityData.skills)) {
        skills.push({
          ability: abilityName,
          name: skillName,
          value: this._getCellValue(sheet, cell)
        });
      }
    }
    return skills.filter(skill => skill.value !== undefined);
  }

  _extractDynamicSection(sheet, sectionType) {
    return importMap[sectionType].map(item =>
      this._extractSection(sheet, item)
    ).filter(item => Object.values(item).some(val => val !== undefined));
  }

  _extractTraits(sheet) {
    return this._extractDynamicSection(sheet, 'traits')
      .filter(trait => trait.name)
      .map(trait => ({ name: trait.name }));
  }

  _getCellValue(sheet, cell) {
    if (!cell) return undefined;
    try {
      const value = sheet.getCellByA1(cell).value;
      return (typeof value === 'string') ? value.trim() : value;
    } catch (error) {
      logger.warn(`Cella "${cell}" non trovata o fuori dal range del foglio`);
      return undefined;
    }
  }
}

module.exports = new SheetDataFetcher();
