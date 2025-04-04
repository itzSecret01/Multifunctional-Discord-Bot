const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Sistema de limpieza automática de canales')
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Limpia mensajes en un canal')
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('El canal a limpiar')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('cantidad')
                        .setDescription('Cantidad de mensajes a eliminar')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000))
                .addBooleanOption(option =>
                    option.setName('preservar_fijados')
                        .setDescription('Mantener mensajes fijados')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('preservar_archivos')
                        .setDescription('Mantener mensajes con archivos')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tickets')
                .setDescription('Limpia tickets inactivos')
                .addIntegerOption(option =>
                    option.setName('dias_inactividad')
                        .setDescription('Días de inactividad antes de limpiar')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(30)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configura la limpieza automática')
                .addBooleanOption(option =>
                    option.setName('activar')
                        .setDescription('Activa/desactiva la limpieza automática')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('intervalo')
                        .setDescription('Intervalo de limpieza en horas')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168))
                .addChannelOption(option =>
                    option.setName('canal_logs')
                        .setDescription('Canal para logs de limpieza')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, handler) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'channel':
                await handleChannelClean(interaction, handler);
                break;
            case 'tickets':
                await handleTicketsClean(interaction, handler);
                break;
            case 'config':
                await handleCleanConfig(interaction, handler);
                break;
        }
    }
};

async function handleChannelClean(interaction, handler) {
    const channel = interaction.options.getChannel('canal');
    const amount = interaction.options.getInteger('cantidad');
    const preservePinned = interaction.options.getBoolean('preservar_fijados') ?? true;
    const preserveFiles = interaction.options.getBoolean('preservar_archivos') ?? false;

    await interaction.deferReply();

    try {
        const deletedCount = await handler.client.channelManager.cleanChannel(channel, {
            limit: amount,
            preservePinned,
            preserveFiles
        });

        await interaction.editReply({
            content: `✅ Se han eliminado ${deletedCount} mensajes en ${channel}.`,
            ephemeral: true
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al limpiar el canal: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleTicketsClean(interaction, handler) {
    const inactiveDays = interaction.options.getInteger('dias_inactividad') ?? 7;

    await interaction.deferReply();

    try {
        const result = await handler.client.channelManager.cleanTicketChannels(interaction.guild);

        await interaction.editReply({
            content: `✅ Limpieza de tickets completada:\n- Tickets cerrados: ${result.closedCount}\n- Tickets eliminados: ${result.deletedCount}`,
            ephemeral: true
        });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al limpiar tickets: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleCleanConfig(interaction, handler) {
    const enabled = interaction.options.getBoolean('activar');
    const interval = interaction.options.getInteger('intervalo');
    const logChannel = interaction.options.getChannel('canal_logs');

    await interaction.deferReply();

    try {
        const config = {
            autoClean: {
                enabled: enabled,
                interval: interval ? interval * 3600000 : undefined,
                logChannel: logChannel ? logChannel.id : undefined
            }
        };

        const embed = await handler.client.channelManager.setup(interaction.guild, config);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al configurar la limpieza automática: ${error.message}`,
            ephemeral: true
        });
    }
}