const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const { loc } = require('./translator');

module.exports = async (client) => {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        Logger.debug(loc('log.error.commands_loaded', { name: command.data.name }));
      } else {
        Logger.warn(loc('log.error.commands_invalid', { file: filePath }), { 
          missing: !command.data ? loc('log.error.commands_missingData') : loc('log.error.commands_missingExecute')
        });
      }
    }
  }
};
