const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Sistema avanzado de sanciones temporales')
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Silencia temporalmente a un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a silenciar')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duracion')
                        .setDescription('Duración del silencio')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320)) // 28 días
                .addStringOption(option =>
                    option.setName('unidad')
                        .setDescription('Unidad de tiempo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Minutos', value: 'minutes' },
                            { name: 'Horas', value: 'hours' },
                            { name: 'Días', value: 'days' },
                            { name: 'Semanas', value: 'weeks' }
                        ))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón del silencio')
                        .setRequired(false)
                        .setMaxLength(1000))
                .addBooleanOption(option =>
                    option.setName('notificar')
                        .setDescription('Enviar DM al usuario')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Remueve el silencio de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a remover silencio')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón para remover el silencio')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulsa a un usuario del servidor')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a expulsar')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón de la expulsión')
                        .setRequired(false)
                        .setMaxLength(1000))
                .addBooleanOption(option =>
                    option.setName('notificar')
                        .setDescription('Enviar DM al usuario')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Banea a un usuario del servidor')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a banear')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duracion')
                        .setDescription('Duración del baneo en días (0 = permanente)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(365))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón del baneo')
                        .setRequired(false)
                        .setMaxLength(1000))
                .addIntegerOption(option =>
                    option.setName('eliminar_mensajes')
                        .setDescription('Eliminar mensajes de los últimos X días')
                        .setMinValue(0)
                        .setMaxValue(7))
                .addBooleanOption(option =>
                    option.setName('notificar')
                        .setDescription('Enviar DM al usuario')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Desbanea a un usuario')
                .addStringOption(option =>
                    option.setName('usuario_id')
                        .setDescription('ID del usuario a desbanear')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón del desbaneo')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configura el sistema de sanciones')
                .addChannelOption(option =>
                    option.setName('canal_logs')
                        .setDescription('Canal para logs de sanciones')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('notificacion_dm')
                        .setDescription('Notificar por DM por defecto')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('rol_mute')
                        .setDescription('Rol para usuarios silenciados')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('preservar_roles')
                        .setDescription('Preservar roles al silenciar')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, handler) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'mute':
                await handleMute(interaction, handler);
                break;
            case 'unmute':
                await handleUnmute(interaction, handler);
                break;
            case 'kick':
                await handleKick(interaction, handler);
                break;
            case 'ban':
                await handleBan(interaction, handler);
                break;
            case 'unban':
                await handleUnban(interaction, handler);
                break;
            case 'config':
                await handleConfig(interaction, handler);
                break;
        }
    }
};

async function handleMute(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const duration = interaction.options.getInteger('duracion');
    const unit = interaction.options.getString('unidad');
    const reason = interaction.options.getString('razon') ?? 'No especificada';
    const notify = interaction.options.getBoolean('notificar') ?? true;

    await interaction.deferReply();

    try {
        const durationMs = calculateDuration(duration, unit);
        const result = await handler.client.moderationManager.muteUser(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            duration: durationMs,
            reason: reason,
            notify: notify
        });

        const embed = new EmbedBuilder()
            .setTitle('🔇 Usuario Silenciado')
            .setDescription(`Se ha silenciado a ${user.toString()}`)
            .addFields(
                { name: 'Duración', value: formatDuration(durationMs) },
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#ff9900')
            .setTimestamp();

        if (result.expireTime) {
            embed.addFields({
                name: 'Expira',
                value: `<t:${Math.floor(result.expireTime / 1000)}:R>`
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al silenciar usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleUnmute(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') ?? 'No especificada';

    await interaction.deferReply();

    try {
        await handler.client.moderationManager.unmuteUser(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            reason: reason
        });

        const embed = new EmbedBuilder()
            .setTitle('🔊 Silencio Removido')
            .setDescription(`Se ha removido el silencio de ${user.toString()}`)
            .addFields(
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al remover silencio: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleKick(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') ?? 'No especificada';
    const notify = interaction.options.getBoolean('notificar') ?? true;

    await interaction.deferReply();

    try {
        await handler.client.moderationManager.kickUser(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            reason: reason,
            notify: notify
        });

        const embed = new EmbedBuilder()
            .setTitle('👢 Usuario Expulsado')
            .setDescription(`Se ha expulsado a ${user.toString()}`)
            .addFields(
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#ff0000')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al expulsar usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleBan(interaction, handler) {
    const user = interaction.options.getUser('usuario');
    const duration = interaction.options.getInteger('duracion') ?? 0;
    const reason = interaction.options.getString('razon') ?? 'No especificada';
    const deleteMessageDays = interaction.options.getInteger('eliminar_mensajes') ?? 0;
    const notify = interaction.options.getBoolean('notificar') ?? true;

    await interaction.deferReply();

    try {
        const result = await handler.client.moderationManager.banUser(interaction.guild, {
            targetId: user.id,
            moderatorId: interaction.user.id,
            duration: duration * 86400000, // Convertir días a milisegundos
            reason: reason,
            deleteMessageDays: deleteMessageDays,
            notify: notify
        });

        const embed = new EmbedBuilder()
            .setTitle('🔨 Usuario Baneado')
            .setDescription(`Se ha baneado a ${user.toString()}`)
            .addFields(
                { name: 'Duración', value: duration > 0 ? `${duration} días` : 'Permanente' },
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() },
                { name: 'Mensajes Eliminados', value: `Últimos ${deleteMessageDays} días` }
            )
            .setColor('#ff0000')
            .setTimestamp();

        if (result.expireTime) {
            embed.addFields({
                name: 'Expira',
                value: `<t:${Math.floor(result.expireTime / 1000)}:R>`
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al banear usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleUnban(interaction, handler) {
    const userId = interaction.options.getString('usuario_id');
    const reason = interaction.options.getString('razon') ?? 'No especificada';

    await interaction.deferReply();

    try {
        await handler.client.moderationManager.unbanUser(interaction.guild, {
            targetId: userId,
            moderatorId: interaction.user.id,
            reason: reason
        });

        const embed = new EmbedBuilder()
            .setTitle('🔓 Usuario Desbaneado')
            .setDescription(`Se ha desbaneado al usuario con ID: ${userId}`)
            .addFields(
                { name: 'Razón', value: reason },
                { name: 'Moderador', value: interaction.user.toString() }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al desbanear usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleConfig(interaction, handler) {
    const logChannel = interaction.options.getChannel('canal_logs');
    const dmNotification = interaction.options.getBoolean('notificacion_dm');
    const muteRole = interaction.options.getRole('rol_mute');
    const preserveRoles = interaction.options.getBoolean('preservar_roles');

    await interaction.deferReply();

    try {
        const config = {
            moderation: {
                logChannel: logChannel ? logChannel.id : undefined,
                defaultDmNotification: dmNotification,
                muteRole: muteRole ? muteRole.id : undefined,
                preserveRoles: preserveRoles
            }
        };

        const embed = await handler.client.moderationManager.setup(interaction.guild, config);
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        await interaction.editReply({
            content: `❌ Error al configurar sistema de sanciones: ${error.message}`,
            ephemeral: true
        });
    }
}

function calculateDuration(amount, unit) {
    const multipliers = {
        minutes: 60000,
        hours: 3600000,
        days: 86400000,
        weeks: 604800000
    };

    return amount * multipliers[unit];
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (weeks > 0) return `${weeks} semana(s)`;
    if (days > 0) return `${days} día(s)`;
    if (hours > 0) return `${hours} hora(s)`;
    if (minutes > 0) return `${minutes} minuto(s)`;
    return `${seconds} segundo(s)`;
}