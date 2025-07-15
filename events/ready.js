const Logger = require('../utils/logger');
const { loc } = require('../utils/translator');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    Logger.info(loc('interaction.bot_ready', { tag: client.user.tag }));
    client.user.setActivity('Farsight RPG', { type: 'PLAYING' });
  }
};
