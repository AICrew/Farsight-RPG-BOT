const Logger = require('../utils/logger');
const { supabase } = require('../utils/supabaseClient.js')

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'show') {
        await require('../commands/sheet/show').autocomplete(interaction);
      }
    }

    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      Logger.debug(`Esecuzione comando: ${interaction.commandName}`, {
        user: interaction.user.id,
        guild: interaction.guild?.id || 'DM'
      });
      await command.execute(interaction, client);
    } catch (error) {
      Logger.error(`Errore nell'esecuzione di /${interaction.commandName}`, {
        user: interaction.user.id,
        stack: error.stack
      });
      
      await interaction.reply({ 
        content: '❌ Errore durante l\'esecuzione del comando!',
        ephemeral: true 
      });
    }
  }
};