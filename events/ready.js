const Logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    Logger.info(`Bot pronto! Loggato come ${client.user.tag}`);
    client.user.setActivity('Farsight RPG', { type: 'PLAYING' });
  }
};