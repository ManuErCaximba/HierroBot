require('dotenv').config();

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('change')
		.setDescription('Cambia elementos de tu rol personalizado')
		.addSubcommand(subcommand =>
			subcommand
				.setName('name')
				.setDescription('Cambia el nombre de tu rol personalizado')
				.addStringOption(option => option.setName('nombre').setDescription('nombre nuevo')))
		.addSubcommand(subcommand =>
			subcommand
				.setName('color')
				.setDescription('Cambia el color de tu rol personalizado')
				.addStringOption(option => option.setName('color').setDescription('color nuevo'))),
	async execute(interaction) {
		if (!interaction.member._roles.includes('1082258345794211862')) throw "No tienes el rol de Server Booster";
		const rthGuild = await interaction.guild;
		let customRol = null;
		const customRoles = process.env.VIP_ROLES_IDS.split(",");
		for (i = 0; i < customRoles.length; i++) {
			vipId = customRoles[i];
			if (interaction.member._roles.includes(vipId)) {
				customRol = await rthGuild.roles.fetch(vipId)
				break;
			}
		}

		if (!customRol) throw "No se ha encontrado tu rol personalizado, contacta con ManuErCaximba para solucionar el problema";
		if (interaction.options._hoistedOptions.length === 0) throw "No se ha encontrado parametro de entrada";
		const subcommandName = interaction.options.getSubcommand();
		const value = interaction.options._hoistedOptions[0].value;
		if (subcommandName === 'name') {
			customRol.edit({
				name: value
			});
			await interaction.reply({ content: 'El nombre de tu rol personalizado se ha editado con exito', ephemeral: true });
		} else if (subcommandName === 'color') {
			const regexp = /^[#]{1}[A-Fa-f0-9]{6}$/gm
			if (!regexp.test(value)) throw "El color no es un hexadecimal (Ej: #1234AB)";
			customRol.edit({
				color: value
			});
			await interaction.reply({ content: 'El color de tu rol personalizado se ha editado con exito', ephemeral: true });
		}
	},
};