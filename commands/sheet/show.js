const { SlashCommandBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const { PaginationWrapper } = require('djs-button-pages');
const { NextPageButton, PreviousPageButton } = require('@djs-button-pages/presets');
const supabase = require('../../utils/supabaseClient');
const parentMap = require('../../utils/parentMap');
const { loc, translate } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show')
    .setDescription(loc('commands.show.description'))
    .addStringOption(option =>
      option.setName('name')
        .setDescription(loc('commands.show.option.name'))
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
    try {
      const characterName = interaction.options.getString('name');
      if (!characterName) {
        return await interaction.reply({ content: loc('log.error.show_no_name'), ephemeral: true });
      }

      const { data: character, error } = await supabase
        .from('characters')
        .select('*')
        .eq('name', characterName)
        .single();

      if (error || !character) {
        return await interaction.reply({ content: loc('log.error.show_not_found', { name: characterName }), ephemeral: true });
      }

      const [abilitiesRes, skillsRes, traitsRes] = await Promise.all([
        supabase.from('abilities').select('*').eq('character_id', character.id),
        supabase.from('skills').select('*').eq('character_id', character.id),
        supabase.from('traits').select('*').eq('character_id', character.id)
      ]);

      const abilities = abilitiesRes.data || [];
      const skills = skillsRes.data || [];
      const traits = traitsRes.data || [];

      // Mappa delle skill raggruppate per abilità
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

      // Embed 1 - Info Base + Tratti
      const baseInfoEmbed = new EmbedBuilder()
        .setTitle(character.name)
        .addFields(
          {
            name: '📋 ' + loc('commands.show.base_info'),
            value:
              `**${loc('classType')}:** ${character.classType || loc('misc.no_data')}\n` +
              `**${loc('species')}:** ${character.specie || loc('misc.no_data')}\n` +
              `**${loc('level')}:** ${character.level ?? loc('misc.no_data')}\n` +
              `**${loc('initiative')}:** ${character.initiative ?? loc('misc.no_data')}\n` +
              `**${loc('speed')}:** 🏃‍♂️ ${character.speed ?? loc('misc.no_data')} | 🧗‍♂️ ${character.climb ?? loc('misc.no_data')} | 🏊‍♂️ ${character.swim ?? loc('misc.no_data')} | 🦅 ${character.fly ?? loc('misc.no_data')}\n` +
              `**${loc('vitality_point')}:** ${character.vitality_point ?? loc('misc.no_data')} | **${loc('death_threshold')}:** ${character.death_threshold ?? loc('misc.no_data')}\n` +
              `**${loc('defense')}:** ${character.defense ?? loc('misc.no_data')} | **${loc('armor_value')}:** ${character.armor_value ?? loc('misc.no_data')}\n` +
              `**${loc('background')}:** ${character.background || loc('misc.no_data')}`,
            inline: false
          },
          {
            name: '🧠 ' + loc('commands.show.traits'),
            value: traits.length > 0
              ? traits.map(t => `• ${t.name}`).join('\n')
              : loc('commands.show.no_traits'),
            inline: false
          }
        );

      // Embed 2 - Abilità + Qualifiche
      const abilityEmbed = new EmbedBuilder()
        .setTitle(`🧬 ${loc('commands.show.abilities_and_skills', { name: character.name })}`)
        .setColor('Blue');

      for (const ability of abilities) {
        const abilityName = translate(ability.name, 'abilities'); // usa `abilitiesValue`
        const relatedSkills = skillMap.get(ability.name) || [];

        const skillText = relatedSkills.length > 0
          ? relatedSkills.map(s => {
              const skillName = translate(s.name, 'skills'); // usa `skillsValue`
              return `• ${skillName}: ${s.value}`;
            }).join('\n')
          : loc('misc.no_data');

        abilityEmbed.addFields({
          name: `🧬 ${abilityName} (${ability.value})`,
          value: skillText,
          inline: true
        });
      }

      // Paginazione
      const buttons = [
        new PreviousPageButton({ custom_id: 'prev', emoji: loc('misc.pagination_prev'), style: ButtonStyle.Secondary }),
        new NextPageButton({ custom_id: 'next', emoji: loc('misc.pagination_next'), style: ButtonStyle.Secondary })
      ];

      const pagination = new PaginationWrapper()
        .setEmbeds([baseInfoEmbed, abilityEmbed])
        .setButtons(buttons)
        .setTime(60000);

      await pagination.interactionReply(interaction);

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `${loc('log.error.show_generic', { message: error.message })}`,
        ephemeral: true
      });
    }
  }
};
