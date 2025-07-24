const { SlashCommandBuilder } = require('discord.js');
const sheetDataFetcher = require('../../utils/sheetDataFetcher');
const supabase = require('../../utils/supabaseClient');
const { loc } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription(loc('commands.update.description'))
    .addStringOption(option =>
      option.setName('name')
        .setDescription(loc('commands.update.option.name'))
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
    await interaction.deferReply();

    const saveRelatedData = async (table, characterId, items) => {
      if (!items?.length) return;

      await supabase
        .from(table)
        .delete()
        .eq('character_id', characterId);

      const records = items.map(item => ({
        ...item,
        character_id: characterId
      }));

      await supabase
        .from(table)
        .insert(records);
    };

    try {
      const name = interaction.options.getString('name');

      // 🔹 Cerca il personaggio per nome e player
      const { data: existing, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', name)
        .eq('player', interaction.user.id)
        .single();

      if (fetchError || !existing) {
        return await interaction.editReply(loc('logs.error.command_character_notFound'));
      }

      if (!existing.link) {
        return await interaction.editReply(loc('logs.error.command_character_noLink'));
      }

      // 🔸 Prendi i dati aggiornati dal foglio originale
      const { character, abilities, skills, attacks, powers, traits } =
        await sheetDataFetcher.fetchAllData(existing.link);

      character.player = interaction.user.id;
      character.link = existing.link;

      const { data: updatedChar, error: updateError } = await supabase
        .from('characters')
        .update(character)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const abilitiesArray = Object.entries(abilities).map(([name, ability]) => ({
        character_id: updatedChar.id,
        name,
        value: ability.value
      }));

      const skillsArray = skills.map(({ name, value }) => ({
        character_id: updatedChar.id,
        name,
        value
      }));

      await Promise.all([
        saveRelatedData('abilities', updatedChar.id, abilitiesArray),
        saveRelatedData('skills', updatedChar.id, skillsArray),
        saveRelatedData('attacks', updatedChar.id, attacks),
        saveRelatedData('powers', updatedChar.id, powers),
        saveRelatedData('traits', updatedChar.id, traits)
      ]);

      await interaction.editReply({
        content: `🔄 **${updatedChar.name}** aggiornato con successo.`,
        embeds: [{
          fields: [
            { name: loc('abilities'), value: (abilitiesArray?.length ?? 0).toString(), inline: true },
            { name: loc('skills'), value: (skillsArray?.length ?? 0).toString(), inline: true },
            { name: loc('attacks'), value: (attacks?.length ?? 0).toString(), inline: true },
            { name: loc('powers'), value: (powers?.length ?? 0).toString(), inline: true },
            { name: loc('traits'), value: (traits?.length ?? 0).toString(), inline: true }
          ],
          timestamp: new Date()
        }]
      });

    } catch (error) {
      console.error('Errore durante update:', error);

      const errorMsg = error.message || loc('log.error.import_unknown');
      const errorDetails = error.details ? `\n${loc('log.error.import_details')}: ${error.details}` : '';

      await interaction.editReply(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);
    }
  }
};
