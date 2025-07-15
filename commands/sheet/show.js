const { SlashCommandBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const { PaginationWrapper } = require('djs-button-pages');
const { NextPageButton, PreviousPageButton } = require('@djs-button-pages/presets');
const supabase = require('../../utils/supabaseClient');
const parentMap = require('../../utils/parentMap');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show')
    .setDescription('Mostra i dati del personaggio salvato')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Nome del personaggio')
				.setAutocomplete(true)
        .setRequired(true)),
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused();

		try {
			const { data, error } = await supabase
				.from('characters')
				.select('name')
				.eq('player', interaction.user.id)
				.ilike('name', `${focused}%`)
				.limit(25);

			if (error) {
				console.error('Supabase error:', error);
				return interaction.respond([]);
			}

			if (!data || data.length === 0) {
				return interaction.respond([]);
			}

			const choices = data.map(char => ({ name: char.name, value: char.name }));
			return interaction.respond(choices);
		} catch (err) {
			console.error('Autocomplete exception:', err);
			return interaction.respond([]);
		}
	},

  async execute(interaction) {
    try {
      const characterName = interaction.options.getString('name');
      if (!characterName) throw new Error('Devi fornire il nome del personaggio.');

      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', characterName)
        .single();

      if (charError || !character) throw new Error(`Personaggio "${characterName}" non trovato.`);

      const [abilitiesRes, skillsRes, traitsRes] = await Promise.all([
        supabase.from('abilities').select('*').eq('character_id', character.id),
        supabase.from('skills').select('*').eq('character_id', character.id),
        supabase.from('traits').select('*').eq('character_id', character.id)
      ]);

      const abilities = abilitiesRes.data || [];
      const skills = skillsRes.data || [];
      const traits = traitsRes.data || [];

      const skillMap = new Map();
      for (const skill of skills) {
        for (const [ability, list] of Object.entries(parentMap)) {
          if (list.includes(skill.name)) {
            if (!skillMap.has(ability)) skillMap.set(ability, []);
            skillMap.get(ability).push(skill);
            break;
          }
        }
      }

      const baseInfoEmbed = new EmbedBuilder()
        .setTitle(`${character.name}`)
        .addFields({
          name: '📋 Info Base',
          value:
            `**Classe:** ${character.classType || '-'}\n` +
            `**Specie:** ${character.specie || '-'}\n` +
            `**Livello:** ${character.level ?? '-'}\n` +
						`**Iniziativa:** ${character.initiative ?? '-'}\n` +
            `**Movimento:** 🏃‍♂️ ${character.speed ?? '-'} | 🧗‍♂️ ${character.climb ?? '-'} | 🏊‍♂️ ${character.swim ?? '-'} | 🦅 ${character.fly ?? '-'}\n` +
            `**Punti Vita:** ${character.vitality_point ?? '-'} | **Soglia Morte:** ${character.death_threshold ?? '-'}\n` +
            `**Difesa:** ${character.defense ?? '-'} | **Armatura:** ${character.armor_value ?? '-'}\n` +
						`**Background:** ${character.background || '-'}\n`,
          inline: false
        },
				{
          name: '🧠 Tratti',
          value: traits.map(t => `• ${t.name}`).join('\n') || 'Nessun tratto disponibile.',
          inline: false
        });

      const abilityEmbed = new EmbedBuilder()
        .setTitle(`🧬 Abilità e Competenze di ${character.name}`)
        .setColor('Blue');

      for (const ability of abilities) {
        const skillsOfAbility = skillMap.get(ability.name) || [];
        const skillsList = skillsOfAbility.length > 0
          ? skillsOfAbility.map(s => `• ${s.name}: ${s.value}`).join('\n')
          : '-';

        abilityEmbed.addFields({
          name: `🧬 ${ability.name} (${ability.value})`,
          value: skillsList || '\u200B',
          inline: true
        });
      }

      const buttons = [
        new PreviousPageButton({ custom_id: 'prev', emoji: '◀', style: ButtonStyle.Secondary }),
        new NextPageButton({ custom_id: 'next', emoji: '▶', style: ButtonStyle.Secondary })
      ];

      const pagination = new PaginationWrapper()
        .setEmbeds([baseInfoEmbed, abilityEmbed])
        .setButtons(buttons)
        .setTime(60000);

      await pagination.interactionReply(interaction);

    } catch (error) {
      console.error('Errore show command:', error);
      await interaction.reply({ content: `❌ Errore nel comando show: ${error.message}`, ephemeral: true });
    }
  }
};
