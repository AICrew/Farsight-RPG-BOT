const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const supabase = require('../../utils/supabaseClient');
const { loc } = require('../../utils/translator');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Elimina un personaggio')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Nome del personaggio da eliminare')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();

    try {
      const { data, error } = await supabase
        .from('characters')
        .select('name')
        .eq('player', interaction.user.id)
        .ilike('name', `${focused}%`) // o `%${focused}%`
        .limit(25);

      if (error) {
        console.error('Autocomplete error:', error);
        return interaction.respond([]);
      }
      if (!data) return interaction.respond([]);

      return interaction.respond(
        data.map(char => ({ name: char.name, value: char.name }))
      );
    } catch (e) {
      console.error('Autocomplete exception:', e);
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    const name = interaction.options.getString('name');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_delete')
        .setLabel('✅ Conferma')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_delete')
        .setLabel('❌ Annulla')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: `Sei sicuro di voler eliminare **${name}**?`,
      components: [row],
      ephemeral: true
    });

    const filter = i =>
      ['confirm_delete', 'cancel_delete'].includes(i.customId) &&
      i.user.id === interaction.user.id;

    try {
      const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 15000 });

      if (confirmation.customId === 'cancel_delete') {
        return confirmation.update({ content: '❌ Eliminazione annullata.', components: [] });
      }

      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('name', name)
        .eq('player', interaction.user.id);

      if (error) throw error;

      await confirmation.update({ content: `✅ Personaggio **${name}** eliminato.`, components: [] });

    } catch (err) {
      Logger.error(loc('log.error.delete'), {
        user: interaction.user.id,
        character: name,
        stack: err.stack
      });

      await interaction.editReply({
        content: `❌ ${loc('log.error.delete')}`,
        components: []
      });
    }
  }
};
