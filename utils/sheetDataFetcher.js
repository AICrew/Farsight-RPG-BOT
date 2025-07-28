const googleAuth = require('./googleAuth');
const importMap = require('./importMap');
const logger = require('./logger');
const { loc } = require('./translator');

class SheetDataFetcher {
  /**
   * Estrae tutti i dati strutturati dal primo foglio del documento Google
   * @param {string} fullLink - URL completo del foglio
   */
  async fetchAllData(fullLink) {
    try {
      const doc = await googleAuth.getDocFromLink(fullLink);
      const sheet = doc.sheetsByIndex[0]; // Usa solo il primo foglio
      if (!sheet) throw new Error(loc('sheet.noTabAvailable'));

      logger.info(`[fetchAllData] ${loc('sheet.loadingAllCells')}...`);
      try {
        await sheet.loadCells(); // 🔁 Carica tutto il foglio
        logger.info(`[fetchAllData] ${loc('sheet.cellsLoaded')}`);
      } catch (err) {
        logger.error(loc('sheet.loadCellsError'), { cause: err.message });
        throw new Error(loc('sheet.loadCellsException'));
      }

      return {
        character: this._extractSection(sheet, importMap.character),
        abilitiesAndSkills: this._extractAbilitiesAndSkills(sheet),
        attacks: this._extractSplitSection(sheet, importMap.attacks),
        powers: this._extractSplitSection(sheet, importMap.powers),
        traits: this._extractSplitSection(sheet, importMap.traits),
        inventory: this._extractSplitSection(sheet, importMap.inventory),
      };

    } catch (error) {
      logger.error(loc('sheet.extractionFailed'), { error: error.message });
      throw new Error(`${loc('sheet.readError')}: ${error.message}`);
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

  /**
   * Estrae tutte abilità e skill in un array piatto
   * basato su importMap.abilitiesAndSkills (array di {type, name, value})
   */
  _extractAbilitiesAndSkills(sheet) {
    const results = [];

    for (const item of importMap.abilitiesAndSkills) {
      const value = this._getCellValue(sheet, item.value);
      if (value === undefined || value === null) continue;

      results.push({
        type: item.type,   // 'ability' o 'skill'
        name: item.name,
        value: Number(value)
      });
    }
    console.log('ABILITIES AND SKILLS:', results);
    return results;
  }

  _extractSplitSection(sheet, sectionMap) {
    const results = [];

    for (const item of sectionMap) {
      const data = this._extractSection(sheet, item);
      for (const [key, value] of Object.entries(data)) {
        if (!value) continue;

        // Split per virgola e crea oggetti
        const parts = value.split(',').map(part =>
          part
            .replace(/\([^)]*\)/g, '') // rimuove contenuto tra parentesi
            .replace(/\*/g, '')        // rimuove asterischi
            .trim()
        ).filter(Boolean);

        for (const p of parts) {
          results.push({ name: p });
        }
      }
    }

    return results;
  }

  _getCellValue(sheet, cell) {
    if (!cell) return undefined;
    try {
      const value = sheet.getCellByA1(cell).value;
      return (typeof value === 'string') ? value.trim() : value;
    } catch (error) {
      logger.warn(loc('sheet.cellMissing', { cell }));
      return undefined;
    }
  }
}

module.exports = new SheetDataFetcher();

