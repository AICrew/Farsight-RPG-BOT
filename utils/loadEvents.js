const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

module.exports = async (client) => {
  const eventsPath = path.join(__dirname, '../events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event.name || !event.execute) {
      Logger.warn(`Evento non valido in ${file}`, { 
        reason: !event.name ? 'Manca "name"' : 'Manca "execute"' 
      });
      continue;
    }

    try {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      Logger.debug(`Caricato evento: ${event.name}`);
    } catch (error) {
      Logger.error(`Errore nel caricare l'evento ${event.name}`, { 
        stack: error.stack,
        file: file 
      });
    }
  }
};