const { EmbedBuilder } = require('discord.js');

class ModerationLog {
    constructor(client) {
        this.client = client;
        this.logCache = new Map();
        this.maxCacheSize = 1000;
        this.initializeLogSystem();
    }

    async initializeLogSystem() {
        // Eventos de moderación
        this.client.on('guildBanAdd', async (ban) => {
            await this.logModAction(ban.guild, 'ban', {
                target: ban.user,
                reason: ban.reason,
                moderator: await this.fetchAuditLogExecutor(ban.guild, 'MEMBER_BAN_ADD')
            });
        });

        this.client.on('guildBanRemove', async (unban) => {
            await this.logModAction(unban.guild, 'unban', {
                target: unban.user,
                moderator: await this.fetchAuditLogExecutor(unban.guild, 'MEMBER_BAN_REMOVE')
            });
        });

        this.client.on('guildMemberRemove', async (member) => {
            const auditLogs = await member.guild.fetchAuditLogs({
                type: 'MEMBER_KICK',
                limit: 1
            }).catch(() => null);

            if (auditLogs && auditLogs.entries.first()?.target.id === member.id) {
                const entry = auditLogs.entries.first();
                await this.logModAction(member.guild, 'kick', {
                    target: member.user,
                    reason: entry.reason,
                    moderator: entry.executor
                });
            }
        });

        // Eventos de mensajes
        this.client.on('messageDelete', async (message) => {
            if (!message.guild || message.author?.bot) return;

            const auditLogs = await message.guild.fetchAuditLogs({
                type: 'MESSAGE_DELETE',
                limit: 1
            }).catch(() => null);

            if (auditLogs) {
                const entry = auditLogs.entries.first();
                if (entry?.target.id === message.author.id) {
                    await this.logModAction(message.guild, 'message_delete', {
                        target: message.author,
                        channel: message.channel,
                        content: message.content,
                        moderator: entry.executor
                    });
                }
            }
        });

        // Eventos de roles
        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {
                const auditLogs = await newMember.guild.fetchAuditLogs({
                    type: 'MEMBER_ROLE_UPDATE',
                    limit: 1
                }).catch(() => null);

                if (auditLogs) {
                    const entry = auditLogs.entries.first();
                    if (entry?.target.id === newMember.id) {
                        await this.logModAction(newMember.guild, 'role_update', {
                            target: newMember.user,
                            moderator: entry.executor,
                            addedRoles: Array.from(addedRoles.values()),
                            removedRoles: Array.from(removedRoles.values())
                        });
                    }
                }
            }
        });
    }

    async logModAction(guild, actionType, data) {
        const config = await this.client.configManager.getConfig(guild.id);
        if (!config?.logging?.enabled || !config.logging.events[actionType]) return;

        const logChannel = guild.channels.cache.get(config.logging.channel);
        if (!logChannel) return;

        const embed = this.createLogEmbed(actionType, data);
        const logEntry = {
            type: actionType,
            targetId: data.target.id,
            moderatorId: data.moderator?.id,
            reason: data.reason,
            timestamp: Date.now()
        };

        // Almacenar en caché
        const guildLogs = this.logCache.get(guild.id) || [];
        guildLogs.unshift(logEntry);
        if (guildLogs.length > this.maxCacheSize) guildLogs.pop();
        this.logCache.set(guild.id, guildLogs);

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    createLogEmbed(actionType, data) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: `ID: ${data.target.id}` });

        switch (actionType) {
            case 'warn':
                embed.setTitle('⚠️ Advertencia')
                    .setColor('#ffa500')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'ID de Advertencia', value: data.warnId || 'N/A' },
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'mute':
                embed.setTitle('🔇 Usuario Silenciado')
                    .setColor('#ff9900')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'Duración', value: data.duration ? this.formatDuration(data.duration) : 'Permanente' },
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'unmute':
                embed.setTitle('🔊 Silencio Removido')
                    .setColor('#00ff00')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'kick':
                embed.setTitle('👢 Usuario Expulsado')
                    .setColor('#ff0000')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'ban':
                embed.setTitle('🔨 Usuario Baneado')
                    .setColor('#ff0000')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'Duración', value: data.duration ? this.formatDuration(data.duration) : 'Permanente' },
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'unban':
                embed.setTitle('🔓 Usuario Desbaneado')
                    .setColor('#00ff00')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Razón:** ${data.reason || 'No especificada'}`)
                    .addFields([
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'message_delete':
                embed.setTitle('🗑️ Mensaje Eliminado')
                    .setColor('#ff9900')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Canal:** ${data.channel.toString()}`)
                    .addFields([
                        { name: 'Contenido', value: data.content || '*No hay contenido disponible*' },
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'role_update':
                const roleChanges = [];
                if (data.addedRoles.length > 0) {
                    roleChanges.push(`**Roles Añadidos:** ${data.addedRoles.map(r => r.toString()).join(', ')}`);
                }
                if (data.removedRoles.length > 0) {
                    roleChanges.push(`**Roles Removidos:** ${data.removedRoles.map(r => r.toString()).join(', ')}`);
                }

                embed.setTitle('👥 Roles Actualizados')
                    .setColor('#0099ff')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n${roleChanges.join('\n')}`)
                    .addFields([
                        { name: 'Moderador', value: data.moderator?.toString() || 'Sistema' }
                    ]);
                break;

            case 'automod':
                embed.setTitle('🤖 Acción de AutoMod')
                    .setColor('#ff0000')
                    .setDescription(`**Usuario:** ${data.target.toString()}\n**Violación:** ${data.violation}`)
                    .addFields([
                        { name: 'Acción Tomada', value: data.action },
                        { name: 'Detalles', value: data.details || 'No disponible' }
                    ]);
                break;
        }

        return embed;
    }

    async fetchAuditLogExecutor(guild, actionType) {
        try {
            const auditLogs = await guild.fetchAuditLogs({ type: actionType, limit: 1 });
            return auditLogs.entries.first()?.executor;
        } catch {
            return null;
        }
    }

    async getModLogs(guild, options = {}) {
        const logs = this.logCache.get(guild.id) || [];
        let filteredLogs = [...logs];

        if (options.targetId) {
            filteredLogs = filteredLogs.filter(log => log.targetId === options.targetId);
        }

        if (options.moderatorId) {
            filteredLogs = filteredLogs.filter(log => log.moderatorId === options.moderatorId);
        }

        if (options.actionType) {
            filteredLogs = filteredLogs.filter(log => log.type === options.actionType);
        }

        if (options.startTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startTime);
        }

        if (options.endTime) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endTime);
        }

        return filteredLogs;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }
}

module.exports = ModerationLog;