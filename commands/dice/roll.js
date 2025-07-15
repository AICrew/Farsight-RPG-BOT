const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DiceRoll } = require('@dice-roller/rpg-dice-roller');

module.exports = {
	category: 'dice',
	data: new SlashCommandBuilder()
		.setName('roll')
		.setDescription('Roll a dice!')
		.addStringOption(option =>
			option.setName('dice')
				.setDescription('The dice to roll.')
				.setRequired(true)),
	async execute(interaction) {
		const dice = interaction.options.getString('dice', true).toLowerCase();

		console.log(interaction.user.username);

		if (!dice) {
			return interaction.reply(`There is no dice of that type \`${diceType}\`!`);
		}

		try {
			const roll = new DiceRoll(dice);
			const rollEmbed = new EmbedBuilder()
				.setColor(0x0099FF)
				.setTitle('Dice Roll')
				.setAuthor({ name: interaction.user.username })
				.addFields(
					{ name: 'Result', value: '```ansi' + '\n \u001b[1;37m' + roll.output + '\u001b[0;0m' + '\n```', inline: true },
				);
			await interaction.reply({ embeds: [rollEmbed] });
		}
		catch (error) {
	    console.error(error);
	    await interaction.reply(`There was an error executing the command:\n\`${error.message}\``);
		}

	},
};