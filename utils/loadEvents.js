const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const { loc } = require('./translator');

module.exports = async (client) => {
  const eventsPath = path.join(__dirname, '../events');
  let eventFiles;
  
  try {
    eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  } catch (err) {
    Logger.error(loc('events.readDirError'), { stack: err.stack });
    return;
  }

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    let event;
    
    try {
      event = require(filePath);
    } catch (err) {
      Logger.error(loc('events.loadFileError', { file }), { stack: err.stack });
      continue;
    }

    if (!event.name || !event.execute) {
      Logger.warn(
        loc('events.invalidEvent', { file }),
        {
          reason: !event.name ? loc('events.missingName') : loc('events.missingExecute'),
          file
        }
      );
      continue;
    }

    try {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      Logger.debug(loc('events.loaded', { name: event.name }));
    } catch (error) {
      Logger.error(loc('events.loadError', { name: event.name }), {
        stack: error.stack,
        file
      });
    }
  }
};
