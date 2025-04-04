const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'panel',
    description: 'Muestra el panel de control del bot',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎮 Panel de Control del Bot')
            .setDescription('Bienvenido al panel de control. Selecciona una categoría para gestionar.')
            .setColor('#0099ff')
            .addFields(
                { name: '👥 Roles', value: 'Gestión de roles automáticos y temporales', inline: true },
                { name: '🎫 Tickets', value: 'Sistema de tickets y soporte', inline: true },
                { name: '🛡️ Moderación', value: 'Herramientas de moderación', inline: true },
                { name: '⚙️ Configuración', value: 'Configuración del servidor', inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('panel_roles')
                    .setLabel('Roles')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('panel_tickets')
                    .setLabel('Tickets')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎫'),
                new ButtonBuilder()
                    .setCustomId('panel_moderation')
                    .setLabel('Moderación')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setCustomId('panel_config')
                    .setLabel('Configuración')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};