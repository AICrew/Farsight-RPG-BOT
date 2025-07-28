const { SlashCommandBuilder } = require('discord.js');
const sheetDataFetcher = require('../../utils/sheetDataFetcher');
const supabase = require('../../utils/supabaseClient');
const { loc, locAll, locAllName } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import')
    .setNameLocalizations(locAllName('commands.import.name'))
    .setDescription(loc('commands.import.description'))
    .setDescriptionLocalizations(locAll('commands.import.description'))
    .addStringOption(option =>
      option.setName('sheet_link')
        .setNameLocalizations(locAllName('commands.import.option.sheet_link'))
        .setDescription(loc('commands.import.option.sheet_link'))
        .setDescriptionLocalizations(locAll('commands.import.option.sheet_link_description'))
        .setRequired(true)
    ),

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
      // 1. Prendi il link e recupera i dati dal Google Sheet
      const fullLink = interaction.options.getString('sheet_link');
      const {
        character,
        abilitiesAndSkills,  // array piatto con type, name, value
        attacks,
        powers,
        traits,
        inventory
      } = await sheetDataFetcher.fetchAllData(fullLink);

      character.player = interaction.user.id;
      character.link = fullLink;

      // 2. Salva il personaggio nel DB
      const { data: savedChar, error: charError } = await supabase
        .from('characters')
        .upsert(character)
        .select()
        .single();

      if (charError) throw charError;

      // 3. Salva abilities + skills nella tabella abilities con type
      const abilitiesArray = abilitiesAndSkills.map(({ type, name, value }) => ({
        character_id: savedChar.id,
        name,
        value,
        category: type
      }));
      console.log('ABILITIES ARRAY TO INSERT:', abilitiesArray);

      // 4. Prepara array tratti e altre sezioni
      const traitsArray = traits.map(item => ({
        character_id: savedChar.id,
        ...item
      }));

      const attacksArray = attacks.map(item => ({
        character_id: savedChar.id,
        ...item
      }));

      const powersArray = powers.map(item => ({
        character_id: savedChar.id,
        ...item
      }));

      const inventoryArray = inventory.map(item => ({
        character_id: savedChar.id,
        ...item
      }));

      // 5. Salva tutti i dati correlati
      await Promise.all([
        saveRelatedData('abilities', savedChar.id, abilitiesArray), // unica tabella per abilità e skill
        saveRelatedData('traits', savedChar.id, traitsArray),
        saveRelatedData('attacks', savedChar.id, attacksArray),
        saveRelatedData('powers', savedChar.id, powersArray),
        saveRelatedData('inventory', savedChar.id, inventoryArray)
      ]);

      // 6. Conferma all'utente
      await interaction.editReply({
        content: loc('log.success.import', { name: savedChar.name })
      });

    } catch (error) {
      const errorMsg = error.message || loc('log.error.import_unknown');
      const errorDetails = error.details ? `\n${loc('log.error.import_details')}: ${error.details}` : '';

      console.error(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);

      await interaction.editReply(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);
    }
  }
};
