const Logger = require('../utils/logger');
const { supabase } = require('../utils/supabaseClient.js');
const { loc } = require('../utils/translator');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        Logger.error(loc('log.error.command_execution'), {
          user: interaction.user.id,
          stack: error.stack
        });
      }
      return;
    }

    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      Logger.debug(loc('interaction.command_executing', { command: interaction.commandName }), {
        user: interaction.user.id,
        guild: interaction.guild?.id || 'DM'
      });
      await command.execute(interaction, client);
    } catch (error) {
      Logger.error(loc('log.error.command_execution'), {
        user: interaction.user.id,
        stack: error.stack
      });

      await interaction.reply({
        content: loc('log.error.command_execution'),
        ephemeral: true
      });
    }
  }
};
