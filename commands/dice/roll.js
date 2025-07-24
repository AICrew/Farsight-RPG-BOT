const { SlashCommandBuilder } = require('discord.js');
const { DiceRoll } = require('@dice-roller/rpg-dice-roller');
const supabase = require('../../utils/supabaseClient');
const { loc, translate } = require('../../utils/translator');
const parentMap = require('../../utils/parentMap');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription(loc('commands.roll.description'))
    .addStringOption(option =>
      option.setName('name')
        .setDescription(loc('commands.roll.option.name'))
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('ability')
        .setDescription(loc('commands.roll.option.ability'))
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('skill')
        .setDescription(loc('commands.roll.option.skill'))
        .setRequired(false)
        .setAutocomplete(true))
    .addIntegerOption(option =>
      option.setName('bonus')
        .setDescription(loc('commands.roll.option.bonus'))
        .setRequired(false))
    .addStringOption(option =>
      option.setName('mode')
        .setDescription(loc('commands.roll.option.mode'))
        .setRequired(false)
        .addChoices(
          { name: '🎯 ' + loc('commands.roll.mode.normal'), value: 'normal' },
          { name: '🟢 ' + loc('commands.roll.mode.adv'), value: 'adv' },
          { name: '🔴 ' + loc('commands.roll.mode.dis'), value: 'dis' }
        )
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
      const abilities = Object.keys(parentMap.defaultAbilities || {});
      return interaction.respond(
        abilities
          .filter(a => a.toLowerCase().includes(focused.value.toLowerCase()))
          .map(a => ({ name: translate(a), value: a }))
      );
    }

    if (focused.name === 'skill') {
      const skills = Object.keys(parentMap.skills || {});
      return interaction.respond(
        skills
          .filter(s => s.toLowerCase().includes(focused.value.toLowerCase()))
          .map(s => ({ name: translate(s), value: s }))
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
      // 1. Trova il personaggio per quell’utente
      const { data: character, error: charErr } = await supabase
        .from('characters')
        .select('id')
        .eq('name', name)
        .eq('player', playerId)
        .single();

      if (charErr || !character)
        return interaction.editReply(loc('log.error.commands_character_notFound'));

      // 2. Prendi il valore dell’abilità
      const { data: ability, error: abilErr } = await supabase
        .from('abilities')
        .select('value')
        .eq('character_id', character.id)
        .eq('name', abilityName)
        .single();

      if (abilErr || !ability)
        return interaction.editReply(loc('log.error.commands_character_noLink'));

      let totalMod = ability.value;
      let skillMod = 0;

      // 3. Se c’è la skill, recupera valore e somma
      if (skillName) {
        const { data: skill } = await supabase
          .from('skills')
          .select('value')
          .eq('character_id', character.id)
          .eq('name', skillName)
          .single();

        if (skill) {
          skillMod = skill.value;
          totalMod += skillMod;
        }
      }

      totalMod += bonus;

      // 4. Determina il dado e la formula in base alla modalità
      const diceBase = {
        normal: '2d12',
        adv: '3d12kh2',
        dis: '3d12kl2'
      }[mode];

      const modeLabel = {
        normal: '🎯 ' + loc('commands.roll.mode.normal'),
        adv: '🟢 ' + loc('commands.roll.mode.adv'),
        dis: '🔴 ' + loc('commands.roll.mode.dis')
      }[mode];

      // 5. Esegui il tiro
      const roll = new DiceRoll(`${diceBase}+${totalMod}`);

      // 6. Embed risposta con traduzioni
      const abilityLabel = translate(abilityName);
      const skillLabel = skillName ? translate(skillName) : null;

      const embed = {
        title: `🎲 ${name} – ${abilityLabel}${skillLabel ? ` + ${skillLabel}` : ''} (${modeLabel})`,
        description: `**${loc('commands.roll.description')}:** ${roll.total}\n**Dettaglio:** \`${roll.output}\``,
        fields: [
          { name: loc('abilities'), value: ability.value.toString(), inline: true },
          ...(skillName ? [{ name: loc('skills'), value: skillMod.toString(), inline: true }] : []),
          ...(bonus !== 0 ? [{ name: loc('commands.roll.option.bonus'), value: (bonus > 0 ? '+' : '') + bonus.toString(), inline: true }] : [])
        ],
        timestamp: new Date()
      };

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Errore in /roll:', err);
      await interaction.editReply(`${loc('log.error.import')} ${err.message || 'Unknown error'}`);
    }
  }
};
