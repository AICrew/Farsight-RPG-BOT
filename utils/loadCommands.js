const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

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
        Logger.debug(`Caricato comando: ${command.data.name}`);
      } else {
        Logger.warn(`Comando non valido in ${filePath}`, { missing: !command.data ? 'data' : 'execute' });
      }
    }
  }
};