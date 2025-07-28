const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../../utils/supabaseClient');
const parentMap = require('../../utils/parentMap');
const { loc, translate, locAllName, locAll } = require('../../utils/translator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show')
    .setNameLocalizations(locAllName('commands.show.name'))
    .setDescription(loc('commands.show.description'))
    .setDescriptionLocalizations(locAll('commands.show.description'))
    .addStringOption(option =>
      option.setName('name')
        .setNameLocalizations(locAllName('commands.show.option.name'))
        .setDescription(loc('commands.show.option.name'))
        .setDescriptionLocalizations(locAll('commands.show.option.name_description'))
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
        .ilike('name', `${focused}%`)
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

      const [abilitiesRes, traitsRes] = await Promise.all([
        supabase.from('abilities').select('*').eq('character_id', character.id),
        supabase.from('traits').select('*').eq('character_id', character.id)
      ]);

      const allAbilities = abilitiesRes.data || [];
      const traits = traitsRes.data || [];
      const skillMap = new Map();

      for (const abilityName of Object.keys(parentMap)) {

        const skillNames = parentMap[abilityName];
        const relatedSkills = allAbilities.filter(a => skillNames.includes(a.name));
        skillMap.set(abilityName, relatedSkills);
      }

      // Embed info base + tratti + abilità con skill > 0
      const baseInfoEmbed = new EmbedBuilder()
        .setTitle(character.name)
        .setColor('Blue')
        .addFields(
          {
            name: `${character.specie || loc('misc.no_data')} — ${character.classtype || loc('misc.no_data')} — ${character.level ?? loc('misc.no_data')}`,
            value:
              `**${loc('vitality_point')}:** \`${character.vitality_point ?? loc('misc.no_data')}\` | ` +
              `**${loc('death_threshold')}:** \`${character.death_threshold ?? loc('misc.no_data')}\`\n` +
              `**${loc('defense')}:** \`${character.defense ?? loc('misc.no_data')}\` | ` +
              `**${loc('armor_value')}:** \`${character.armor_value ?? loc('misc.no_data')}\`\n` +
              `**${loc('initiative')}:** \`${character.initiative ?? loc('misc.no_data')}\`\n` +
              `**${loc('speed')}:** \`${character.speed ?? loc('misc.no_data')}\`\n` +
              `**${loc('climb')}:** \`${character.climb ?? loc('misc.no_data')}\`\n` +
              `**${loc('swim')}:** \`${character.swim ?? loc('misc.no_data')}\`\n` +
              `**${loc('fly')}:** \`${character.fly ?? loc('misc.no_data')}\`\n` +
              `**${loc('background')}:** \`${character.background || loc('misc.no_data')}\``,
            inline: false
          },
          {
            name: loc('commands.show.traits'),
            value: traits.length > 0
              ? traits.map(t => `\`${t.name}\``).join(', ')
              : loc('commands.show.no_traits'),
            inline: false
          }
        );

      const abilities = allAbilities.filter(a => Object.keys(parentMap).includes(a.name));

      // Aggiungo le abilità con le skill > 0
      for (const ability of abilities) {
        const abilityName = translate(ability.name, 'abilities');
        const relatedSkills = (skillMap.get(ability.name) || []).filter(s => s.value > 0);

        if (relatedSkills.length === 0) continue;

        const skillText = relatedSkills.map(s => {
          const skillName = translate(s.name, 'skills');
          return `**${skillName}:** \`${s.value}\``;
        }).join('\n');

        baseInfoEmbed.addFields({
          name: `${abilityName}: \`${ability.value}\``,
          value: skillText,
          inline: true
        });
      }

      await interaction.reply({ embeds: [baseInfoEmbed], ephemeral: false });

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: loc('log.error.show_generic', { message: error.message }),
        ephemeral: true
      });
    }
  }
};
