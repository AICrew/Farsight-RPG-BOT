const { SlashCommandBuilder } = require('discord.js');
const sheetDataFetcher = require('../../utils/sheetDataFetcher');
const supabase = require('../../utils/supabaseClient');
const { loc } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import')
    .setDescription(loc('commands.import.description'))
    .addStringOption(option =>
      option.setName('sheet_link')
        .setDescription(loc('commands.import.option.sheet_link'))
        .setRequired(true)),

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
      // 1. Prendi il link e recupera i dati
      const fullLink = interaction.options.getString('sheet_link');
      const { character, abilities, skills, attacks, powers, traits } =
        await sheetDataFetcher.fetchAllData(fullLink);

      character.player = interaction.user.id;
      character.link = fullLink;

      // 2. Salva il personaggio nel DB
      const { data: savedChar, error: charError } = await supabase
        .from('characters')
        .upsert(character)
        .select()
        .single();

      if (charError) throw charError;

      // 3. Prepara array per abilità (da oggetto a array)
      const abilitiesArray = Object.entries(abilities).map(([name, ability]) => ({
        character_id: savedChar.id,
        name,
        value: ability.value
      }));

      // Le skills sono già array, aggiungi solo character_id
      const skillsArray = skills.map(({ name, value }) => ({
        character_id: savedChar.id,
        name,
        value
      }));

      // 4. Salva i dati correlati
      await Promise.all([
        saveRelatedData('abilities', savedChar.id, abilitiesArray),
        saveRelatedData('skills', savedChar.id, skillsArray),
        saveRelatedData('attacks', savedChar.id, attacks),
        saveRelatedData('powers', savedChar.id, powers),
        saveRelatedData('traits', savedChar.id, traits)
      ]);

      // 5. Conferma all'utente
      await interaction.editReply({
        content: `✅ **${savedChar.name}** importato con successo.`,
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
      console.error('Errore durante import:', error);

      const errorMsg = error.message || loc('log.error.import_unknown');
      const errorDetails = error.details ? `\n${loc('log.error.import_details')}: ${error.details}` : '';

      await interaction.editReply(`${loc('log.error.import')} ${errorMsg}${errorDetails}`);
    }
  }
};
