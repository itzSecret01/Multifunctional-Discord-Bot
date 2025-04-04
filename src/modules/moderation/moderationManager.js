const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

class ModerationManager {
    constructor(client) {
        this.client = client;
        this.warns = new Map();
        this.raidProtection = {
            enabled: false,
            joinThreshold: 5,
            timeWindow: 10000,
            recentJoins: []
        };
        this.spamProtection = {
            enabled: true,
            messageThreshold: 5,
            timeWindow: 5000,
            userMessages: new Map()
        };
        this.contentFilter = {
            enabled: true,
            bannedWords: new Set(),
            capsThreshold: 0.7,
            urlWhitelist: new Set()
        };
        this.initializeAutoMod();
    }

    async ban(guild, user, moderator, reason) {
        try {
            await guild.members.ban(user, { reason: reason });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Usuario Baneado')
                .setDescription(`**Usuario:** ${user.tag}\n**ID:** ${user.id}\n**Razón:** ${reason}\n**Moderador:** ${moderator.tag}`)
                .setColor('#ff0000')
                .setTimestamp();

            return embed;
        } catch (error) {
            throw new Error(`Error al banear al usuario: ${error.message}`);
        }
    }

    async kick(guild, member, moderator, reason) {
        try {
            await member.kick(reason);

            const embed = new EmbedBuilder()
                .setTitle('👢 Usuario Expulsado')
                .setDescription(`**Usuario:** ${member.user.tag}\n**ID:** ${member.id}\n**Razón:** ${reason}\n**Moderador:** ${moderator.tag}`)
                .setColor('#ffa500')
                .setTimestamp();

            return embed;
        } catch (error) {
            throw new Error(`Error al expulsar al usuario: ${error.message}`);
        }
    }

    async warn(guild, user, moderator, reason) {
        if (!this.warns.has(guild.id)) {
            this.warns.set(guild.id, new Map());
        }

        const guildWarns = this.warns.get(guild.id);
        if (!guildWarns.has(user.id)) {
            guildWarns.set(user.id, []);
        }

        const userWarns = guildWarns.get(user.id);
        userWarns.push({
            reason: reason,
            moderator: moderator.id,
            timestamp: Date.now()
        });

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Usuario Advertido')
            .setDescription(`**Usuario:** ${user.tag}\n**ID:** ${user.id}\n**Razón:** ${reason}\n**Moderador:** ${moderator.tag}\n**Advertencias totales:** ${userWarns.length}`)
            .setColor('#ffff00')
            .setTimestamp();

        // Auto-moderación basada en número de advertencias
        if (userWarns.length >= 3) {
            const member = await guild.members.fetch(user.id);
            await this.kick(guild, member, this.client.user, 'Acumulación de 3 advertencias');
        }

        return embed;
    }

    enableRaidProtection(guild, settings = {}) {
        this.raidProtection.enabled = true;
        this.raidProtection.joinThreshold = settings.joinThreshold || 5;
        this.raidProtection.timeWindow = settings.timeWindow || 10000;
        this.raidProtection.recentJoins = [];

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Protección Anti-Raid Activada')
            .setDescription(`Configuración:\n- Umbral de uniones: ${this.raidProtection.joinThreshold} usuarios\n- Ventana de tiempo: ${this.raidProtection.timeWindow / 1000} segundos`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async handleNewMember(member) {
        if (!this.raidProtection.enabled) return;

        const now = Date.now();
        this.raidProtection.recentJoins = this.raidProtection.recentJoins
            .filter(join => now - join.timestamp < this.raidProtection.timeWindow);

        this.raidProtection.recentJoins.push({
            userId: member.id,
            timestamp: now
        });

        if (this.raidProtection.recentJoins.length >= this.raidProtection.joinThreshold) {
            // Activar modo anti-raid
            await member.guild.setVerificationLevel(4); // Más alto nivel de verificación

            const embed = new EmbedBuilder()
                .setTitle('🚨 Posible Raid Detectado')
                .setDescription(`Se han detectado ${this.raidProtection.recentJoins.length} uniones en ${this.raidProtection.timeWindow / 1000} segundos.\nSe ha aumentado el nivel de verificación del servidor.`)
                .setColor('#ff0000')
                .setTimestamp();

            // Notificar a los moderadores
            const logChannel = member.guild.channels.cache.get(process.env.LOG_CHANNEL);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }
    }

    async handleMessage(message) {
        if (!message.guild || message.author.bot) return;

        const violations = [];

        // Verificar spam
        if (this.spamProtection.enabled && await this.isSpamming(message)) {
            violations.push('spam');
        }

        // Verificar contenido inapropiado
        if (this.contentFilter.enabled) {
            if (this.containsBannedWords(message.content)) {
                violations.push('banned_words');
            }
            if (this.hasExcessiveCaps(message.content)) {
                violations.push('excessive_caps');
            }
            if (await this.hasSuspiciousLinks(message.content)) {
                violations.push('suspicious_link');
            }
        }

        if (violations.length > 0) {
            await this.handleViolations(message, violations);
        }
    }

    async isSpamming(message) {
        const { userMessages, timeWindow, messageThreshold } = this.spamProtection;
        const userId = message.author.id;
        const now = Date.now();

        if (!userMessages.has(userId)) {
            userMessages.set(userId, []);
        }

        const messages = userMessages.get(userId);
        messages.push({ timestamp: now, content: message.content });

        // Limpiar mensajes antiguos
        const recentMessages = messages.filter(msg => now - msg.timestamp < timeWindow);
        userMessages.set(userId, recentMessages);

        return recentMessages.length >= messageThreshold;
    }

    containsBannedWords(content) {
        return Array.from(this.contentFilter.bannedWords)
            .some(word => content.toLowerCase().includes(word.toLowerCase()));
    }

    hasExcessiveCaps(content) {
        if (content.length < 8) return false;
        const upperCount = content.replace(/[^A-Z]/g, '').length;
        const totalChars = content.replace(/[^A-Za-z]/g, '').length;
        return totalChars > 0 && (upperCount / totalChars) > this.contentFilter.capsThreshold;
    }

    async hasSuspiciousLinks(content) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlRegex);
        if (!urls) return false;

        return urls.some(url => !this.contentFilter.urlWhitelist.has(url));
    }

    async handleViolations(message, violations) {
        // Eliminar el mensaje
        await message.delete().catch(() => {});

        // Aplicar sanciones según el tipo y número de violaciones
        let action = 'Mensaje eliminado';
        if (violations.includes('spam') || violations.length >= 2) {
            const duration = 5 * 60 * 1000; // 5 minutos
            await message.member.timeout(duration, 'Violaciones múltiples de AutoMod');
            action += ' + Timeout por 5 minutos';
        }

        // Registrar la acción
        const embed = new EmbedBuilder()
            .setTitle('🤖 Violación de AutoMod Detectada')
            .setColor('#ff0000')
            .setDescription(`**Usuario:** ${message.author.toString()}\n**Canal:** ${message.channel.toString()}\n**Violaciones:** ${violations.join(', ')}\n**Acción:** ${action}`)
            .setTimestamp();

        // Notificar en el canal de logs
        const config = await this.client.configManager.getConfig(message.guild.id);
        const logChannel = message.guild.channels.cache.get(config?.logging?.channel);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    }

    initializeAutoMod() {
        this.client.on('messageCreate', (message) => this.handleMessage(message));
    }

    // Métodos de configuración del AutoMod
    setSpamThreshold(threshold, timeWindow) {
        this.spamProtection.messageThreshold = threshold;
        this.spamProtection.timeWindow = timeWindow;
    }

    addBannedWord(word) {
        this.contentFilter.bannedWords.add(word.toLowerCase());
    }

    removeBannedWord(word) {
        this.contentFilter.bannedWords.delete(word.toLowerCase());
    }

    addUrlWhitelist(url) {
        this.contentFilter.urlWhitelist.add(url);
    }

    removeUrlWhitelist(url) {
        this.contentFilter.urlWhitelist.delete(url);
    }

    async clearWarns(guild, user, moderator) {
        if (!this.warns.has(guild.id) || !this.warns.get(guild.id).has(user.id)) {
            throw new Error('El usuario no tiene advertencias.');
        }

        this.warns.get(guild.id).delete(user.id);

        const embed = new EmbedBuilder()
            .setTitle('🧹 Advertencias Limpiadas')
            .setDescription(`**Usuario:** ${user.tag}\n**ID:** ${user.id}\n**Moderador:** ${moderator.tag}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }
}

module.exports = ModerationManager;