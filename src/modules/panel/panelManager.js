const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class PanelManager {
    constructor(client) {
        this.client = client;
    }

    async handlePanelInteraction(interaction) {
        const action = interaction.customId.split('_')[1];

        switch (action) {
            case 'roles':
                await this.showRolesPanel(interaction);
                break;
            case 'tickets':
                await this.showTicketsPanel(interaction);
                break;
            case 'moderation':
                await this.showModerationPanel(interaction);
                break;
            case 'config':
                await this.showConfigPanel(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Opción no válida',
                    ephemeral: true
                });
        }
    }

    async showRolesPanel(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('👥 Panel de Roles')
            .setDescription('Gestiona los roles del servidor')
            .setColor('#0099ff')
            .addFields(
                { name: '🎭 Roles Automáticos', value: 'Configura roles que se asignan automáticamente', inline: true },
                { name: '⏱️ Roles Temporales', value: 'Gestiona roles con duración limitada', inline: true },
                { name: '📋 Plantillas', value: 'Crea y aplica plantillas de roles', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('roles_auto')
                    .setLabel('Roles Automáticos')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎭'),
                new ButtonBuilder()
                    .setCustomId('roles_temp')
                    .setLabel('Roles Temporales')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⏱️'),
                new ButtonBuilder()
                    .setCustomId('roles_template')
                    .setLabel('Plantillas')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Volver')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('↩️')
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    async showTicketsPanel(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Panel de Tickets')
            .setDescription('Gestiona el sistema de tickets')
            .setColor('#00ff00')
            .addFields(
                { name: '📝 Crear Ticket', value: 'Crea un nuevo ticket de soporte', inline: true },
                { name: '📊 Ver Tickets', value: 'Lista todos los tickets activos', inline: true },
                { name: '⚙️ Configuración', value: 'Configura el sistema de tickets', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('tickets_create')
                    .setLabel('Crear Ticket')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('tickets_list')
                    .setLabel('Ver Tickets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('tickets_config')
                    .setLabel('Configuración')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Volver')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('↩️')
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    async showModerationPanel(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Panel de Moderación')
            .setDescription('Herramientas de moderación del servidor')
            .setColor('#ff0000')
            .addFields(
                { name: '🔨 Sanciones', value: 'Gestiona advertencias, expulsiones y baneos', inline: true },
                { name: '📝 Registros', value: 'Ver registros de moderación', inline: true },
                { name: '🔒 Bloqueos', value: 'Gestiona bloqueos de canales', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mod_sanctions')
                    .setLabel('Sanciones')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('mod_logs')
                    .setLabel('Registros')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('mod_lockdown')
                    .setLabel('Bloqueos')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Volver')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('↩️')
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }

    async showConfigPanel(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Panel de Configuración')
            .setDescription('Configura las funciones del bot')
            .setColor('#808080')
            .addFields(
                { name: '🎮 General', value: 'Configuración general del bot', inline: true },
                { name: '📢 Anuncios', value: 'Configura canales de anuncios', inline: true },
                { name: '👋 Bienvenidas', value: 'Configura mensajes de bienvenida', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('config_general')
                    .setLabel('General')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎮'),
                new ButtonBuilder()
                    .setCustomId('config_announcements')
                    .setLabel('Anuncios')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📢'),
                new ButtonBuilder()
                    .setCustomId('config_welcome')
                    .setLabel('Bienvenidas')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👋'),
                new ButtonBuilder()
                    .setCustomId('panel_back')
                    .setLabel('Volver')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('↩️')
            );

        await interaction.update({
            embeds: [embed],
            components: [row]
        });
    }
}

module.exports = PanelManager;