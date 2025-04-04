const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Sistema avanzado de advertencias para moderación')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade una advertencia a un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a advertir')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón de la advertencia')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addIntegerOption(option =>
                    option.setName('duracion')
                        .setDescription('Duración en días (0 = permanente)')
                        .setMinValue(0)
                        .setMaxValue(365))
                .addBooleanOption(option =>
                    option.setName('notificar')
                        .setDescription('Enviar DM al usuario')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina una advertencia específica')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario objetivo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('warn_id')
                        .setDescription('ID de la advertencia')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón para eliminar la advertencia')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Muestra las advertencias de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a consultar')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('detallado')
                        .setDescription('Mostrar información detallada')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Limpia todas las advertencias de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario objetivo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón para limpiar las advertencias')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configura el sistema de advertencias')
                .addIntegerOption(option =>
                    option.setName('max_warns')
                        .setDescription('Máximo de advertencias antes de acción automática')
                        .setMinValue(1)
                        .setMaxValue(50))
                .addStringOption(option =>
                    option.setName('accion')
                        .setDescription('Acción al alcanzar máximo de advertencias')
                        .addChoices(
                            { name: 'Ninguna', value: 'none' },
                            { name: 'Silenciar', value: 'mute' },
                            { name: 'Expulsar', value: 'kick' },
                            { name: 'Banear', value: 'ban' }
                        ))
                .addIntegerOption(option =>
                    option.setName('duracion_mute')
                        .setDescription('Duración del silencio en horas')
                        .setMinValue(1)
                        .setMaxValue(720))
                .addBooleanOption(option =>
                    option.setName('notificacion_dm')
                        .setDescription('Notificar por DM por defecto')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('canal_logs')
                        .setDescription('Canal para logs de advertencias')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, handler) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await handleWarnAdd(interaction, handler);
                break;
            case 'remove':
                await handleWarnRemove(interaction, handler);
                break;
            case 'list':
                await handleWarnList(interaction, handler);
                break;
            case 'clear':
                await handleWarnClear(interaction, handler);
                break;
            case 'config':
                await handleWarnConfig(interaction, handler);
                break;
        }
    }
};

async function handleWarnAdd(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');
    const duration = interaction.options.getInteger('duracion') ?? 0;
    const notify = interaction.options.getBoolean('notificar') ?? true;

    await interaction.deferReply();

    try {
        const warning = await handler.client.moderationManager.addWarning(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            reason: reason,
            duration: duration * 86400000, // Convertir días a milisegundos
            notify: notify
        });

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Advertencia Añadida')
            .setDescription(`Se ha advertido a ${user.toString()}`)
            .addFields(
                { name: 'Razón', value: reason },
                { name: 'ID de Advertencia', value: warning.id },
                { name: 'Duración', value: duration > 0 ? `${duration} días` : 'Permanente' },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#ff9900')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al añadir advertencia: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleWarnRemove(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const warnId = interaction.options.getString('warn_id');
    const reason = interaction.options.getString('razon') ?? 'No especificada';

    await interaction.deferReply();

    try {
        await handler.client.moderationManager.removeWarning(interaction.guild, {
            targetId: user.id,
            warnId: warnId,
            moderatorId: interaction.user.id,
            reason: reason
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Advertencia Eliminada')
            .setDescription(`Se ha eliminado la advertencia de ${user.toString()}`)
            .addFields(
                { name: 'ID de Advertencia', value: warnId },
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al eliminar advertencia: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleWarnList(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const detailed = interaction.options.getBoolean('detallado') ?? false;

    await interaction.deferReply();

    try {
        const warnings = await handler.client.moderationManager.getWarnings(interaction.guild, user.id);

        if (warnings.length === 0) {
            return interaction.editReply({
                content: `✨ ${user.toString()} no tiene advertencias.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Advertencias de ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor('#0099ff')
            .setTimestamp();

        if (detailed) {
            const warningFields = warnings.map(warn => ({
                name: `ID: ${warn.id}`,
                value: `**Razón:** ${warn.reason}\n**Moderador:** <@${warn.moderatorId}>\n**Fecha:** <t:${Math.floor(warn.timestamp / 1000)}:R>\n**Estado:** ${warn.active ? '🟢 Activa' : '🔴 Inactiva'}`
            }));
            embed.addFields(warningFields);
        } else {
            embed.setDescription(warnings
                .map(warn => `• **${warn.id}** - ${warn.reason} (${warn.active ? '🟢' : '🔴'})`)
                .join('\n'));
        }

        embed.setFooter({ text: `Total: ${warnings.length} advertencia(s)` });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al obtener advertencias: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleWarnClear(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') ?? 'No especificada';

    await interaction.deferReply();

    try {
        const count = await handler.client.moderationManager.clearWarnings(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            reason: reason
        });

        const embed = new EmbedBuilder()
            .setTitle('🧹 Advertencias Limpiadas')
            .setDescription(`Se han eliminado todas las advertencias de ${user.toString()}`)
            .addFields(
                { name: 'Cantidad', value: `${count} advertencia(s)` },
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al limpiar advertencias: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleWarnConfig(interaction, handler) {
    const maxWarns = interaction.options.getInteger('max_warns');
    const action = interaction.options.getString('accion');
    const muteDuration = interaction.options.getInteger('duracion_mute');
    const dmNotification = interaction.options.getBoolean('notificacion_dm');
    const logChannel = interaction.options.getChannel('canal_logs');

    await interaction.deferReply();

    try {
        const config = {
            warnings: {
                maxWarnings: maxWarns,
                autoAction: action,
                muteDuration: muteDuration ? muteDuration * 3600000 : undefined,
                defaultDmNotification: dmNotification,
                logChannel: logChannel ? logChannel.id : undefined
            }
        };

        const embed = await handler.client.moderationManager.setup(interaction.guild, config);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al configurar sistema de advertencias: ${error.message}`,
            ephemeral: true
        });
    }
}