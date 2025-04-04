const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class ConfigManager {
    constructor(client) {
        this.client = client;
        this.guildConfigs = new Map();
        this.defaultConfig = {
            prefix: '!',
            language: 'es',
            deleteCommands: true,
            deleteResponseTimeout: 10000,
            modules: {
                moderation: {
                    enabled: true,
                    logChannel: null,
                    muteRole: null,
                    autoMod: {
                        enabled: true,
                        maxMentions: 5,
                        maxEmojis: 10,
                        maxLines: 10,
                        duplicateTimeout: 5,
                        inviteFilter: true,
                        linkFilter: false,
                        capsFilter: true,
                        maxCapsPercentage: 70,
                        spamFilter: true,
                        spamThreshold: 5,
                        spamInterval: 5000,
                        wordBlacklist: [],
                        exemptRoles: [],
                        exemptChannels: [],
                        punishments: [
                            { type: 'warn', threshold: 3 },
                            { type: 'mute', threshold: 5, duration: 3600000 },
                            { type: 'kick', threshold: 7 },
                            { type: 'ban', threshold: 10 }
                        ]
                    },
                    raidProtection: {
                        enabled: true,
                        joinThreshold: 10,
                        joinInterval: 10000,
                        action: 'lockdown',
                        lockdownDuration: 300000
                    }
                },
                tickets: {
                    enabled: true,
                    category: null,
                    supportRole: null,
                    transcriptChannel: null,
                    maxTickets: 3,
                    ticketTypes: [
                        { name: 'Soporte', emoji: '❓' },
                        { name: 'Reportes', emoji: '🚨' },
                        { name: 'Sugerencias', emoji: '💡' }
                    ],
                    closeTimeout: 172800000,
                    deleteTimeout: 86400000,
                    requireReason: true,
                    mentionStaff: true,
                    createThread: true,
                    nameFormat: 'ticket-{username}'
                },
                roles: {
                    enabled: true,
                    autoRoles: [],
                    joinRoles: [],
                    boostRoles: [],
                    levelRoles: [],
                    menuRoles: [],
                    reactionRoles: [],
                    roleHierarchy: [],
                    maxRolesPerUser: 10,
                    restrictedRoles: [],
                    selfAssignable: [],
                    roleCategories: [
                        { name: 'Colores', roles: [] },
                        { name: 'Acceso', roles: [] },
                        { name: 'Notificaciones', roles: [] }
                    ]
                },
                verification: {
                    enabled: true,
                    channel: null,
                    role: null,
                    type: 'button',
                    captcha: {
                        enabled: false,
                        length: 6,
                        timeout: 300000
                    },
                    requirements: {
                        accountAge: 604800000,
                        serverAge: 0,
                        avatar: false
                    },
                    autoKick: {
                        enabled: true,
                        timeout: 86400000
                    },
                    welcomeMessage: true
                },
                welcome: {
                    enabled: true,
                    channel: null,
                    dmWelcome: false,
                    embedColor: '#00ff00',
                    showMemberCount: true,
                    showAvatar: true,
                    showJoinDate: true,
                    customMessages: {
                        welcome: '¡Bienvenido {user} a {server}!',
                        dm: '¡Gracias por unirte a {server}!',
                        leave: 'Adiós {user}, ¡esperamos verte pronto!'
                    }
                },
                channels: {
                    enabled: true,
                    logChannel: null,
                    suggestionChannel: null,
                    reportChannel: null,
                    announcementChannel: null,
                    rulesChannel: null,
                    statsChannels: {
                        total: null,
                        members: null,
                        bots: null,
                        boosts: null
                    },
                    autoThreads: [],
                    slowmodeChannels: [],
                    archiveCategory: null,
                    autoArchive: true,
                    archiveAfter: 604800000
                },
                logging: {
                    enabled: true,
                    channel: null,
                    events: {
                        messageDelete: true,
                        messageEdit: true,
                        memberJoin: true,
                        memberLeave: true,
                        memberUpdate: true,
                        channelCreate: true,
                        channelDelete: true,
                        channelUpdate: true,
                        roleCreate: true,
                        roleDelete: true,
                        roleUpdate: true,
                        ban: true,
                        unban: true,
                        moderation: true,
                        voice: true
                    },
                    ignoredChannels: [],
                    ignoredUsers: [],
                    maxLogSize: 100
                }
            }
        };
    }

    async setup(guild, config = {}) {
        let guildConfig = this.guildConfigs.get(guild.id) || { ...this.defaultConfig };
        
        // Fusionar configuración recursivamente
        const mergeConfig = (target, source) => {
            for (const key in source) {
                if (source[key] !== null && typeof source[key] === 'object') {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    mergeConfig(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        };

        mergeConfig(guildConfig, config);
        this.guildConfigs.set(guild.id, guildConfig);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración del Servidor Actualizada')
            .setDescription(`Se han actualizado las siguientes configuraciones:\n${Object.keys(config)
                .map(key => `**${key}**`)
                .join('\n')}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    getConfig(guildId, path = '') {
        const config = this.guildConfigs.get(guildId) || this.defaultConfig;
        if (!path) return config;

        return path.split('.').reduce((obj, key) => 
            obj && obj[key] !== undefined ? obj[key] : null, config);
    }

    async updateConfig(guild, path, value) {
        let config = this.guildConfigs.get(guild.id);
        if (!config) {
            config = { ...this.defaultConfig };
            this.guildConfigs.set(guild.id, config);
        }

        const keys = path.split('.');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuración Actualizada')
            .setDescription(`Se ha actualizado la configuración:\n**${path}** = ${JSON.stringify(value)}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async resetConfig(guild, path = '') {
        if (!path) {
            this.guildConfigs.set(guild.id, { ...this.defaultConfig });
        } else {
            const config = this.guildConfigs.get(guild.id);
            const keys = path.split('.');
            let current = config;
            let defaultCurrent = this.defaultConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) break;
                current = current[keys[i]];
                defaultCurrent = defaultCurrent[keys[i]];
            }

            current[keys[keys.length - 1]] = defaultCurrent[keys[keys.length - 1]];
        }

        const embed = new EmbedBuilder()
            .setTitle('🔄 Configuración Restaurada')
            .setDescription(`Se ha restaurado la configuración${path ? ` de **${path}**` : ''} a sus valores predeterminados.`)
            .setColor('#ff9900')
            .setTimestamp();

        return embed;
    }

    async exportConfig(guild) {
        const config = this.guildConfigs.get(guild.id);
        if (!config) return null;

        return {
            guildId: guild.id,
            timestamp: Date.now(),
            config: config
        };
    }

    async importConfig(guild, importedConfig) {
        try {
            await this.setup(guild, importedConfig.config);

            const embed = new EmbedBuilder()
                .setTitle('📥 Configuración Importada')
                .setDescription(`Se ha importado la configuración correctamente.\nID del servidor original: ${importedConfig.guildId}\nFecha de exportación: ${new Date(importedConfig.timestamp).toLocaleString()}`)
                .setColor('#00ff00')
                .setTimestamp();

            return embed;
        } catch (error) {
            throw new Error(`Error al importar la configuración: ${error.message}`);
        }
    }

    async validateConfig(config) {
        // Implementar validación de configuración
        const errors = [];

        // Validar tipos de datos básicos
        if (typeof config.prefix !== 'string') errors.push('El prefijo debe ser una cadena de texto');
        if (typeof config.deleteCommands !== 'boolean') errors.push('deleteCommands debe ser un booleano');

        // Validar módulos
        if (!config.modules || typeof config.modules !== 'object') {
            errors.push('La configuración debe incluir un objeto de módulos');
        } else {
            // Validar cada módulo
            for (const [moduleName, moduleConfig] of Object.entries(config.modules)) {
                if (typeof moduleConfig.enabled !== 'boolean') {
                    errors.push(`El módulo ${moduleName} debe tener una propiedad 'enabled' booleana`);
                }

                // Validaciones específicas por módulo
                switch (moduleName) {
                    case 'moderation':
                        if (moduleConfig.autoMod && typeof moduleConfig.autoMod.enabled !== 'boolean') {
                            errors.push('La configuración de autoMod debe tener una propiedad enabled booleana');
                        }
                        break;
                    case 'tickets':
                        if (typeof moduleConfig.maxTickets !== 'number') {
                            errors.push('maxTickets debe ser un número');
                        }
                        break;
                    // Añadir más validaciones específicas según sea necesario
                }
            }
        }

        return errors;
    }

    getModuleStatus(guildId) {
        const config = this.getConfig(guildId);
        if (!config) return null;

        const status = {};
        for (const [moduleName, moduleConfig] of Object.entries(config.modules)) {
            status[moduleName] = {
                enabled: moduleConfig.enabled,
                features: Object.keys(moduleConfig).filter(key => 
                    typeof moduleConfig[key] === 'object' && 
                    moduleConfig[key] !== null &&
                    'enabled' in moduleConfig[key]
                ).map(feature => ({
                    name: feature,
                    enabled: moduleConfig[feature].enabled
                }))
            };
        }

        return status;
    }

    async createConfigBackup(guild) {
        const config = this.guildConfigs.get(guild.id);
        if (!config) return null;

        const backup = {
            timestamp: Date.now(),
            guildId: guild.id,
            guildName: guild.name,
            config: JSON.parse(JSON.stringify(config))
        };

        // Aquí podrías implementar el almacenamiento del backup
        return backup;
    }

    generateConfigEmbed(guild, module = '') {
        const config = this.getConfig(guild.id);
        if (!config) return null;

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ Configuración${module ? ` del Módulo ${module}` : ''}`)
            .setColor('#0099ff')
            .setTimestamp();

        if (module) {
            const moduleConfig = config.modules[module];
            if (!moduleConfig) return null;

            embed.setDescription(this.formatConfigObject(moduleConfig));
        } else {
            embed.setDescription('Configuración general del servidor')
                .addFields([
                    { name: 'Prefijo', value: config.prefix, inline: true },
                    { name: 'Idioma', value: config.language, inline: true },
                    { name: 'Módulos Activos', value: Object.entries(config.modules)
                        .filter(([, mod]) => mod.enabled)
                        .map(([name]) => `\`${name}\``)
                        .join(', ') }
                ]);
        }

        return embed;
    }

    formatConfigObject(obj, depth = 0) {
        if (depth > 2) return '[Objeto anidado]';

        let result = '';
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                result += `**${key}**:\n${this.formatConfigObject(value, depth + 1)}\n`;
            } else {
                result += `**${key}**: ${value}\n`;
            }
        }
        return result;
    }
}

module.exports = ConfigManager;