const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');
const Logger = require('./utils/logger');
const loadCommands = require('./utils/loadCommands');
const loadEvents = require('./utils/loadEvents');
const { loc } = require('./utils/translator');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();

// Avvio del bot
(async () => {
  try {
    await loadCommands(client);
    await loadEvents(client);
    await client.login(config.token);
  } catch (error) {
    Logger.error(loc('log.error.command_execution'), { stack: error.stack });
    process.exit(1);
  }
})();

process.on('unhandledRejection', (error) => {
  Logger.error(loc('log.error.unhandled_rejection'), { stack: error.stack });
});

// Pulizia log all'avvio
if (config.autoCleanLogs) {
  require('./utils/cleanLogs')();
}
