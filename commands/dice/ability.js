const { SlashCommandBuilder } = require('discord.js');
const { DiceRoll } = require('@dice-roller/rpg-dice-roller');
const supabase = require('../../utils/supabaseClient');
const { loc, translate, locAll, locAllName } = require('../../utils/translator');
const parentMap = require('../../utils/parentMap');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ability')
    .setNameLocalizations(locAllName('ability'))
    .setDescription('Roll an Ability')
    .setDescriptionLocalizations(locAll('commands.ability.description'))
    .addStringOption(option =>
      option.setName('name')
        .setNameLocalizations(locAll('commands.ability.option.name'))
        .setDescription('Character name')
        .setDescriptionLocalizations(locAll('commands.ability.option.name_description'))
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('mode')
        .setNameLocalizations(locAllName('commands.ability.option.mode'))
        .setDescription('Mode')
        .setDescriptionLocalizations(locAll('commands.ability.option.mode_description'))
        .setRequired(true)
        .addChoices(
          { name: loc('commands.ability.mode.normal'), value: 'normal' },
          { name: loc('commands.ability.mode.adv'), value: 'adv' },
          { name: loc('commands.ability.mode.dis'), value: 'dis' }
        )
    )
    .addStringOption(option =>
      option.setName('ability')
        .setNameLocalizations(locAllName('commands.ability.option.ability'))
        .setDescription('Ability')
        .setDescriptionLocalizations(locAll('commands.ability.option.ability_description'))
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('skill')
        .setNameLocalizations(locAllName('commands.ability.option.skill'))
        .setDescription('Skill')
        .setDescriptionLocalizations(locAll('commands.ability.option.skill_description'))
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option.setName('bonus')
        .setNameLocalizations(locAllName('commands.ability.option.bonus'))
        .setDescription('Bonus')
        .setDescriptionLocalizations(locAll('commands.ability.option.bonus_description'))
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const playerId = interaction.user.id;

    if (focused.name === 'name') {
      const { data } = await supabase
        .from('characters')
        .select('name')
        .eq('player', playerId)
        .ilike('name', `%${focused.value}%`)
        .limit(25);

      return interaction.respond(data.map(c => ({ name: c.name, value: c.name })));
    }

    
    if (focused.name === 'ability') {
      const abilities = Object.keys(parentMap)
        .filter(a => a.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25);  // limita a 25

      return interaction.respond(
        abilities.map(a => ({ name: translate(a, 'abilities'), value: a }))
      );
    }

    if (focused.name === 'skill') {
      const skills = Object.values(parentMap).flat()
        .filter(s => s.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25);  // limita a 25

      return interaction.respond(
        skills.map(s => ({ name: translate(s, 'skills'), value: s }))
      );
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const abilityName = interaction.options.getString('ability');
    const skillName = interaction.options.getString('skill');
    const bonus = interaction.options.getInteger('bonus') ?? 0;
    const mode = interaction.options.getString('mode') ?? 'normal';
    const playerId = interaction.user.id;

    try {
      const { data: character, error: charErr } = await supabase
        .from('characters')
        .select('id')
        .eq('name', name)
        .eq('player', playerId)
        .single();

      if (charErr || !character)
        return interaction.editReply(loc('log.error.commands_character_notFound'));

      // Prendo tutte le abilities (incluse skill) di questo personaggio
      const { data: abilities, error: abilErr } = await supabase
        .from('abilities')
        .select('name, value')
        .eq('character_id', character.id);

      if (abilErr || !abilities)
        return interaction.editReply(loc('log.error.commands_character_noLink'));

      // Trovo il valore dell'abilità scelta
      const ability = abilities.find(a => a.name === abilityName);
      if (!ability)
        return interaction.editReply(loc('log.error.commands_character_noLink'));

      let totalMod = ability.value;
      let skillMod = 0;

      if (skillName) {
        // Trovo la skill (se esiste) nella lista abilities
        const skill = abilities.find(a => a.name === skillName);
        if (skill) {
          skillMod = skill.value;
          totalMod += skillMod;
        }
      }

      totalMod += bonus;

      const diceBase = {
        normal: '2d12',
        adv: '3d12kh2',
        dis: '3d12kl2'
      }[mode];

      const modeLabel = {
        normal: loc('commands.ability.mode.normal'),
        adv: loc('commands.ability.mode.adv'),
        dis: loc('commands.ability.mode.dis')
      }[mode];

      const roll = new DiceRoll(`${diceBase}+${totalMod}`);

      const abilityLabel = translate(abilityName, 'abilities');
      const skillLabel = skillName ? translate(skillName, 'skills') : null;

      const embed = {
        color: 0x00bfff,
        title: `${name}`,
        fields: [
          {
            name: `**${abilityLabel}**${skillLabel ? ` > **${skillLabel}**` : ''}`,
            value: 
              `*${modeLabel}*\n` +
              `**${loc('result')}:** \`${roll.total}\`\n` +
              `\`${roll.output}\`\n` +
              `**${loc('abilities')}:** \`${ability.value}\`\n` +
              `${skillName ? `**${loc('skills')}:** \`${skillMod}\`` : ''}\n` +
              `${bonus !== 0 ? `**${loc('bonus')}:** \`${bonus > 0 ? '+' : ''}${bonus}\`` : ''}`
          },
        ],
        timestamp: new Date()
      };

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(`${loc('log.error.import')} ${err.message || 'Unknown error'}`);
      await interaction.editReply(`${loc('log.error.import')} ${err.message || 'Unknown error'}`);
    }
  }
};

