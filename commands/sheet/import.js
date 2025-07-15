const { SlashCommandBuilder } = require('discord.js');
const sheetDataFetcher = require('../../utils/sheetDataFetcher');
const supabase = require('../../utils/supabaseClient');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('import')
    .setDescription('Importa TUTTI i dati dal foglio Google')
    .addStringOption(option =>
      option.setName('sheet_link')
        .setDescription('Incolla il link COMPLETO del foglio')
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

			// 2. Salva TUTTO in Supabase
			const { data: savedChar, error: charError } = await supabase
				.from('characters')
				.upsert(character)
				.select()
				.single();

			if (charError) throw charError;

			// Prepara array per abilità (flatten da oggetto a array)
			const abilitiesArray = Object.entries(abilities).map(([name, ability]) => ({
				character_id: savedChar.id,
				name,
				value: ability.value
			}));

			// Le skills già sono array pronto all'uso, solo aggiungi character_id
			const skillsArray = skills.map(({ name, value }) => ({
				character_id: savedChar.id,
				name,
				value
			}));

			// 4. Salva tutti i dati correlati
			await Promise.all([
				this._saveRelatedData('abilities', savedChar.id, abilitiesArray),
				this._saveRelatedData('skills', savedChar.id, skillsArray),
				this._saveRelatedData('attacks', savedChar.id, attacks),
				this._saveRelatedData('powers', savedChar.id, powers),
				this._saveRelatedData('traits', savedChar.id, traits)
			]);

			// 3. Conferma all'utente
			await interaction.editReply({
				content: `✅ **${character.name}** importato con:`,
				embeds: [{
					fields: [
						{ name: 'Abilità', value: (abilities?.length ?? 0).toString(), inline: true },
						{ name: 'Skill', value: (skills?.length ?? 0).toString(), inline: true },
						{ name: 'Attacchi', value: (attacks?.length ?? 0).toString(), inline: true },
						{ name: 'Poteri', value: (powers?.length ?? 0).toString(), inline: true },
						{ name: 'Tratti', value: (traits?.length ?? 0).toString(), inline: true }

					],
					timestamp: new Date()
				}]
			});

		} catch (error) {
			 // Log completo in console
			console.error('Errore durante import:', error);

			// Se l'errore ha proprietà 'message', 'code', 'details', le mostriamo
			const errorMsg = error.message || 'Errore sconosciuto';
			const errorCode = error.code ? ` (Code: ${error.code})` : '';
			const errorDetails = error.details ? `\nDettagli: ${error.details}` : '';

			await interaction.editReply(`❌ Errore durante l'import: ${errorMsg}${errorCode}${errorDetails}`);
		}
	},


  // Helper per salvare dati correlati
  async _saveRelatedData(table, characterId, items) {
    if (!items?.length) return;

    // Svuota dati esistenti
    await supabase
      .from(table)
      .delete()
      .eq('character_id', characterId);

    // Inserisci nuovi dati
    const records = items.map(item => ({ 
      ...item, 
      character_id: characterId 
    }));

    await supabase
      .from(table)
      .insert(records);
  }
};