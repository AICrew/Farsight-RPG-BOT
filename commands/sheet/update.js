const { SlashCommandBuilder } = require('discord.js');
const sheetDataFetcher = require('../../utils/sheetDataFetcher');
const supabase = require('../../utils/supabaseClient');
const { loc, locAll, locAllName } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setNameLocalizations(locAllName('commands.update.name'))
    .setDescription(loc('commands.update.description'))
    .setDescriptionLocalizations(locAll('commands.update.description'))
    .addStringOption(option =>
      option.setName('name')
        .setNameLocalizations(locAllName('commands.update.option.name'))
        .setDescription(loc('commands.update.option.name'))
        .setDescriptionLocalizations(locAll('commands.update.option.name_description'))
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
        return await interaction.editReply(loc('log.error.command_character_notFound'));
      }

      if (!existing.link) {
        return await interaction.editReply(loc('log.error.command_character_noLink'));
      }

      // 🔸 Prendi i dati aggiornati dal foglio originale
      const {
        character,
        abilitiesAndSkills,  // array con type, name, value
        attacks,
        powers,
        traits,
        inventory
      } = await sheetDataFetcher.fetchAllData(existing.link);

      character.player = interaction.user.id;
      character.link = existing.link;

      const { data: updatedChar, error: updateError } = await supabase
        .from('characters')
        .update(character)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Prepara array unico abilità+skill con type
      const abilitiesArray = abilitiesAndSkills.map(({ type, name, value }) => ({
        character_id: updatedChar.id,
        type,    // 'ability' o 'skill'
        name,
        value
      }));

      const traitsArray = traits.map(item => ({
        character_id: updatedChar.id,
        ...item
      }));

      const attacksArray = attacks.map(item => ({
        character_id: updatedChar.id,
        ...item
      }));

      const powersArray = powers.map(item => ({
        character_id: updatedChar.id,
        ...item
      }));

      const inventoryArray = inventory.map(item => ({
        character_id: updatedChar.id,
        ...item
      }));

      // Salva tutti i dati correlati
      await Promise.all([
        saveRelatedData('abilities', updatedChar.id, abilitiesArray), // unica tabella abilità+skill
        saveRelatedData('traits', updatedChar.id, traitsArray),
        saveRelatedData('attacks', updatedChar.id, attacksArray),
        saveRelatedData('powers', updatedChar.id, powersArray),
        saveRelatedData('inventory', updatedChar.id, inventoryArray)
      ]);

      await interaction.editReply({
        content: loc('log.success.update', { name: updatedChar.name })
      });

    } catch (error) {
      const errorMsg = error.message || loc('log.error.import_unknown');
      const errorDetails = error.details ? `\n${loc('log.error.import_details')}: ${error.details}` : '';
      console.error(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);
      await interaction.editReply(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);
    }
  }
};
