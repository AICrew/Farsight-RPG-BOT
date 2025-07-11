const { SlashCommandBuilder } = require('discord.js');
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

		if (!dice) {
			return interaction.reply(`There is no dice of that type \`${diceType}\`!`);
		}

		try {
	        const roll = new DiceRoll(dice);

			    console.log(roll);

	        await interaction.reply(`Result: ${roll}`);
		}
		catch (error) {
	        console.error(error);
	        await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
		}

	},
};