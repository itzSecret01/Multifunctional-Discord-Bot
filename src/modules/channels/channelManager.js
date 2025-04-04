const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

class ChannelManager {
    constructor(client) {
        this.client = client;
        this.channelSettings = new Map();
        this.defaultSettings = {
            autoClean: {
                enabled: false,
                interval: 24 * 60 * 60 * 1000, // 24 horas
                categories: [],
                excludedChannels: [],
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
                maxMessages: 1000,
                preservePinned: true,
                preserveFiles: true,
                logDeletions: true,
                logChannel: null
            },
            ticketCleanup: {
                enabled: true,
                closeAfterInactivity: 48 * 60 * 60 * 1000, // 48 horas
                deleteAfterClose: 24 * 60 * 60 * 1000, // 24 horas
                maxTicketsPerUser: 3,
                archiveCategory: null,
                transcriptChannel: null
            },
            channelArchive: {
                enabled: false,
                archiveCategory: null,
                archiveAfterDays: 30,
                deleteAfterArchive: false,
                compressTranscripts: true
            },
            channelLimits: {
                maxChannelsPerCategory: 50,
                maxTextChannels: 200,
                maxVoiceChannels: 100,
                maxCategories: 50
            },
            channelTemplates: new Map(),
            channelBackups: new Map(),
            channelStats: {
                enabled: false,
                updateInterval: 5 * 60 * 1000, // 5 minutos
                format: {
                    members: '👥 Miembros: {count}',
                    bots: '🤖 Bots: {count}',
                    channels: '📚 Canales: {count}',
                    roles: '🎭 Roles: {count}'
                }
            }
        };
    }

    async setup(guild, settings = {}) {
        const guildSettings = this.channelSettings.get(guild.id) || { ...this.defaultSettings };
        Object.assign(guildSettings, settings);

        // Configurar categoría de archivo si está habilitado
        if (guildSettings.channelArchive.enabled && !guildSettings.channelArchive.archiveCategory) {
            const category = await guild.channels.create({
                name: 'Archivo',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: this.client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]
                    }
                ]
            });
            guildSettings.channelArchive.archiveCategory = category.id;
        }

        this.channelSettings.set(guild.id, guildSettings);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Sistema de Gestión de Canales Configurado')
            .setDescription(`Configuración actualizada:\n${Object.entries(settings)
                .map(([key, value]) => `**${key}:** ${value}`)
                .join('\n')}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async cleanChannel(channel, options = {}) {
        const settings = this.channelSettings.get(channel.guild.id);
        if (!settings) return;

        const cleanOptions = {
            before: options.before || Date.now(),
            limit: options.limit || settings.autoClean.maxMessages,
            preservePinned: options.preservePinned ?? settings.autoClean.preservePinned,
            preserveFiles: options.preserveFiles ?? settings.autoClean.preserveFiles
        };

        let deletedCount = 0;
        let messages = await channel.messages.fetch({ limit: cleanOptions.limit });

        // Filtrar mensajes según las opciones
        messages = messages.filter(msg => {
            if (cleanOptions.preservePinned && msg.pinned) return false;
            if (cleanOptions.preserveFiles && msg.attachments.size > 0) return false;
            if (msg.createdTimestamp > cleanOptions.before) return false;
            return true;
        });

        try {
            await channel.bulkDelete(messages);
            deletedCount = messages.size;

            // Registrar la limpieza
            if (settings.autoClean.logDeletions && settings.autoClean.logChannel) {
                const logChannel = channel.guild.channels.cache.get(settings.autoClean.logChannel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🧹 Limpieza de Canal')
                        .setDescription(`Se han eliminado ${deletedCount} mensajes en ${channel}\n**Opciones:**\n- Preservar fijados: ${cleanOptions.preservePinned}\n- Preservar archivos: ${cleanOptions.preserveFiles}`)
                        .setColor('#ff9900')
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(`Error al limpiar canal ${channel.name}:`, error);
            throw new Error(`No se pudieron eliminar los mensajes: ${error.message}`);
        }

        return deletedCount;
    }

    async cleanTicketChannels(guild) {
        const settings = this.channelSettings.get(guild.id);
        if (!settings?.ticketCleanup.enabled) return;

        const ticketChannels = guild.channels.cache.filter(channel =>
            channel.name.toLowerCase().includes('ticket-'));

        let closedCount = 0;
        let deletedCount = 0;

        for (const [, channel] of ticketChannels) {
            try {
                const lastMessage = (await channel.messages.fetch({ limit: 1 })).first();
                if (!lastMessage) continue;

                const inactiveTime = Date.now() - lastMessage.createdTimestamp;

                if (inactiveTime > settings.ticketCleanup.closeAfterInactivity) {
                    // Cerrar ticket inactivo
                    await this.archiveTicket(channel);
                    closedCount++;

                    // Eliminar si ha pasado el tiempo después del cierre
                    if (inactiveTime > settings.ticketCleanup.deleteAfterClose) {
                        await channel.delete();
                        deletedCount++;
                    }
                }
            } catch (error) {
                console.error(`Error al procesar ticket ${channel.name}:`, error);
            }
        }

        return { closedCount, deletedCount };
    }

    async archiveTicket(channel) {
        const settings = this.channelSettings.get(channel.guild.id);
        if (!settings?.ticketCleanup.enabled) return;

        try {
            // Generar transcripción
            const messages = await channel.messages.fetch();
            const transcript = messages.map(msg => `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}`).join('\n');

            // Guardar transcripción
            if (settings.ticketCleanup.transcriptChannel) {
                const transcriptChannel = channel.guild.channels.cache.get(settings.ticketCleanup.transcriptChannel);
                if (transcriptChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`📜 Transcripción de ${channel.name}`)
                        .setDescription('Transcripción adjunta')
                        .setColor('#0099ff')
                        .setTimestamp();

                    await transcriptChannel.send({
                        embeds: [embed],
                        files: [{
                            attachment: Buffer.from(transcript),
                            name: `${channel.name}-transcript.txt`
                        }]
                    });
                }
            }

            // Mover a categoría de archivo
            if (settings.ticketCleanup.archiveCategory) {
                await channel.setParent(settings.ticketCleanup.archiveCategory, {
                    lockPermissions: false
                });
            }

            return true;
        } catch (error) {
            console.error(`Error al archivar ticket ${channel.name}:`, error);
            return false;
        }
    }

    async createChannelTemplate(guild, name, channel) {
        const template = {
            name: name,
            type: channel.type,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser,
            position: channel.position,
            permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            })),
            timestamp: Date.now()
        };

        const settings = this.channelSettings.get(guild.id);
        if (settings) {
            settings.channelTemplates.set(name, template);
            this.channelSettings.set(guild.id, settings);
        }

        return template;
    }

    async applyChannelTemplate(guild, templateName, options = {}) {
        const settings = this.channelSettings.get(guild.id);
        if (!settings) return null;

        const template = settings.channelTemplates.get(templateName);
        if (!template) return null;

        try {
            const channel = await guild.channels.create({
                name: options.name || template.name,
                type: template.type,
                topic: template.topic,
                nsfw: template.nsfw,
                bitrate: template.bitrate,
                userLimit: template.userLimit,
                rateLimitPerUser: template.rateLimitPerUser,
                position: options.position || template.position,
                permissionOverwrites: template.permissionOverwrites,
                parent: options.categoryId
            });

            return channel;
        } catch (error) {
            console.error(`Error al aplicar plantilla ${templateName}:`, error);
            return null;
        }
    }

    async updateChannelStats(guild) {
        const settings = this.channelSettings.get(guild.id);
        if (!settings?.channelStats.enabled) return;

        const stats = {
            members: guild.members.cache.filter(m => !m.user.bot).size,
            bots: guild.members.cache.filter(m => m.user.bot).size,
            channels: guild.channels.cache.size,
            roles: guild.roles.cache.size
        };

        const updateChannel = async (channelId, format, value) => {
            const channel = guild.channels.cache.get(channelId);
            if (channel) {
                const newName = format.replace('{count}', value);
                if (channel.name !== newName) {
                    await channel.setName(newName).catch(() => {});
                }
            }
        };

        // Actualizar canales de estadísticas
        for (const [stat, count] of Object.entries(stats)) {
            const format = settings.channelStats.format[stat];
            if (format) {
                const channelId = settings.channelStats[`${stat}Channel`];
                if (channelId) {
                    await updateChannel(channelId, format, count);
                }
            }
        }

        return stats;
    }

    async backupChannel(channel) {
        const settings = this.channelSettings.get(channel.guild.id);
        if (!settings) return;

        const backup = {
            name: channel.name,
            type: channel.type,
            topic: channel.topic,
            nsfw: channel.nsfw,
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rateLimitPerUser: channel.rateLimitPerUser,
            position: channel.position,
            permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.toArray(),
                deny: overwrite.deny.toArray()
            })),
            messages: [],
            timestamp: Date.now()
        };

        // Respaldar mensajes si es un canal de texto
        if (channel.isText()) {
            const messages = await channel.messages.fetch({ limit: 100 });
            backup.messages = messages.map(msg => ({
                content: msg.content,
                author: msg.author.id,
                timestamp: msg.createdTimestamp,
                attachments: msg.attachments.map(att => ({
                    url: att.url,
                    name: att.name
                })),
                embeds: msg.embeds
            }));
        }

        settings.channelBackups.set(channel.id, backup);
        this.channelSettings.set(channel.guild.id, settings);

        return backup;
    }

    async restoreChannel(guild, backupId) {
        const settings = this.channelSettings.get(guild.id);
        if (!settings) return null;

        const backup = settings.channelBackups.get(backupId);
        if (!backup) return null;

        try {
            const channel = await guild.channels.create({
                name: backup.name,
                type: backup.type,
                topic: backup.topic,
                nsfw: backup.nsfw,
                bitrate: backup.bitrate,
                userLimit: backup.userLimit,
                rateLimitPerUser: backup.rateLimitPerUser,
                position: backup.position,
                permissionOverwrites: backup.permissionOverwrites
            });

            // Restaurar mensajes si es un canal de texto
            if (channel.isText() && backup.messages.length > 0) {
                for (const msgData of backup.messages.reverse()) {
                    try {
                        await channel.send({
                            content: msgData.content,
                            embeds: msgData.embeds
                        });
                    } catch (error) {
                        console.error(`Error al restaurar mensaje:`, error);
                    }
                }
            }

            return channel;
        } catch (error) {
            console.error(`Error al restaurar canal desde backup:`, error);
            return null;
        }
    }
}

module.exports = ChannelManager;