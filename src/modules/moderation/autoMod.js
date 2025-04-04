const { EmbedBuilder } = require('discord.js');

class AutoMod {
    constructor(client) {
        this.client = client;
        this.spamMap = new Map();
        this.raidMap = new Map();
        this.mentionMap = new Map();
        this.capsMap = new Map();
        this.linkPatterns = {
            invites: /discord\.gg\/[a-zA-Z0-9]+/,
            malicious: /(?:https?:\/\/)?(?:[\w-]+\.)+(?:ru|cn|tk|ga|ml|cf|gq|pw|top)(?:\/[^\s]*)?/i,
            phishing: /(?:steam|discord|nitro|free|giveaway|gift)[\w-]*\.(?:com|net|org|ru|cn|tk|ga|ml|cf|gq|pw|top)/i
        };
        this.initializeAutoMod();
    }

    async initializeAutoMod() {
        this.client.on('messageCreate', async message => {
            if (message.author.bot || !message.guild) return;

            const config = await this.getGuildConfig(message.guild.id);
            if (!config?.autoMod?.enabled) return;

            const member = message.member;
            if (this.isExempt(member, message.channel, config)) return;

            await Promise.all([
                this.handleSpam(message, config),
                this.handleMentions(message, config),
                this.handleCaps(message, config),
                this.handleLinks(message, config),
                this.handleBlacklistedWords(message, config)
            ]);
        });

        this.client.on('guildMemberAdd', async member => {
            const config = await this.getGuildConfig(member.guild.id);
            if (!config?.raidProtection?.enabled) return;

            await this.handleRaidProtection(member, config);
        });

        // Limpiar mapas periódicamente
        setInterval(() => {
            const now = Date.now();
            [this.spamMap, this.mentionMap, this.capsMap].forEach(map => {
                map.forEach((value, key) => {
                    if (now - value.timestamp > 60000) map.delete(key);
                });
            });
        }, 60000);
    }

    async handleSpam(message, config) {
        const { spamFilter, spamThreshold, spamInterval } = config.autoMod;
        if (!spamFilter) return;

        const key = `${message.author.id}-${message.guild.id}`;
        const userData = this.spamMap.get(key) || { messages: [], warnings: 0, timestamp: Date.now() };

        userData.messages.push({
            content: message.content,
            timestamp: Date.now()
        });

        // Limpiar mensajes antiguos
        userData.messages = userData.messages.filter(msg => 
            Date.now() - msg.timestamp < spamInterval
        );

        if (userData.messages.length >= spamThreshold) {
            await this.punishUser(message.member, 'spam', config);
            userData.messages = [];
            userData.warnings++;
        }

        this.spamMap.set(key, userData);
    }

    async handleMentions(message, config) {
        const { maxMentions } = config.autoMod;
        if (!maxMentions) return;

        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount > maxMentions) {
            await message.delete();
            await this.punishUser(message.member, 'mass_mentions', config);
        }
    }

    async handleCaps(message, config) {
        const { capsFilter, maxCapsPercentage } = config.autoMod;
        if (!capsFilter || message.content.length < 8) return;

        const capsCount = message.content.replace(/[^A-Z]/g, '').length;
        const capsPercentage = (capsCount / message.content.length) * 100;

        if (capsPercentage > maxCapsPercentage) {
            await message.delete();
            await this.punishUser(message.member, 'excessive_caps', config);
        }
    }

    async handleLinks(message, config) {
        const { inviteFilter, linkFilter } = config.autoMod;

        if (inviteFilter && this.linkPatterns.invites.test(message.content)) {
            await message.delete();
            await this.punishUser(message.member, 'invite_link', config);
            return;
        }

        if (linkFilter) {
            if (this.linkPatterns.malicious.test(message.content) ||
                this.linkPatterns.phishing.test(message.content)) {
                await message.delete();
                await this.punishUser(message.member, 'malicious_link', config);
            }
        }
    }

    async handleBlacklistedWords(message, config) {
        const { wordBlacklist } = config.autoMod;
        if (!wordBlacklist?.length) return;

        const content = message.content.toLowerCase();
        const hasBlacklistedWord = wordBlacklist.some(word =>
            content.includes(word.toLowerCase())
        );

        if (hasBlacklistedWord) {
            await message.delete();
            await this.punishUser(message.member, 'blacklisted_word', config);
        }
    }

    async handleRaidProtection(member, config) {
        const { joinThreshold, joinInterval, action } = config.raidProtection;
        const guildId = member.guild.id;

        const raidData = this.raidMap.get(guildId) || {
            joins: [],
            isLockdown: false
        };

        raidData.joins.push(Date.now());
        raidData.joins = raidData.joins.filter(timestamp =>
            Date.now() - timestamp < joinInterval
        );

        if (raidData.joins.length >= joinThreshold && !raidData.isLockdown) {
            raidData.isLockdown = true;
            await this.handleRaidAction(member.guild, action, config);

            // Desactivar lockdown después del tiempo especificado
            setTimeout(async () => {
                raidData.isLockdown = false;
                await this.disableLockdown(member.guild);
            }, config.raidProtection.lockdownDuration);
        }

        this.raidMap.set(guildId, raidData);
    }

    async handleRaidAction(guild, action, config) {
        const logChannel = guild.channels.cache.get(config.logChannel);
        const embed = new EmbedBuilder()
            .setTitle('🚨 Detección de Raid')
            .setDescription(`Se ha detectado actividad sospechosa de raid.\nAcción tomada: ${action}`)
            .setColor('#ff0000')
            .setTimestamp();

        switch (action) {
            case 'lockdown':
                await this.enableLockdown(guild);
                break;
            case 'verification':
                await this.enableVerification(guild);
                break;
        }

        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    }

    async enableLockdown(guild) {
        const channels = guild.channels.cache.filter(channel =>
            channel.type === 0 && channel.permissionsFor(guild.roles.everyone).has('SendMessages')
        );

        for (const channel of channels.values()) {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: false
            });
        }
    }

    async disableLockdown(guild) {
        const channels = guild.channels.cache.filter(channel =>
            channel.type === 0 && !channel.permissionsFor(guild.roles.everyone).has('SendMessages')
        );

        for (const channel of channels.values()) {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: null
            });
        }

        const logChannel = guild.channels.cache.get(config.logChannel);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('🔓 Lockdown Finalizado')
                .setDescription('El modo lockdown ha sido desactivado.')
                .setColor('#00ff00')
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }
    }

    async enableVerification(guild) {
        const config = await this.getGuildConfig(guild.id);
        if (!config.verification?.enabled) return;

        const verificationRole = guild.roles.cache.get(config.verification.role);
        if (!verificationRole) return;

        await guild.members.fetch();
        const recentMembers = guild.members.cache.filter(member =>
            Date.now() - member.joinedTimestamp < 3600000 && !member.user.bot
        );

        for (const member of recentMembers.values()) {
            await member.roles.remove(verificationRole).catch(() => {});
        }
    }

    async punishUser(member, violation, config) {
        const punishments = config.autoMod.punishments;
        const userData = this.spamMap.get(`${member.id}-${member.guild.id}`) || { warnings: 0 };

        userData.warnings++;
        this.spamMap.set(`${member.id}-${member.guild.id}`, userData);

        const punishment = punishments.find(p => p.threshold <= userData.warnings);
        if (!punishment) return;

        const reason = `[AutoMod] Violación: ${violation} (Advertencia #${userData.warnings})`;

        switch (punishment.type) {
            case 'warn':
                await this.client.moderationManager.addWarning(member.guild, {
                    targetId: member.id,
                    moderatorId: this.client.user.id,
                    reason: reason
                });
                break;

            case 'mute':
                await this.client.moderationManager.muteUser(member.guild, {
                    targetId: member.id,
                    moderatorId: this.client.user.id,
                    duration: punishment.duration,
                    reason: reason
                });
                break;

            case 'kick':
                await member.kick(reason);
                break;

            case 'ban':
                await member.ban({ reason: reason });
                break;
        }

        this.logViolation(member, violation, punishment, config);
    }

    async logViolation(member, violation, punishment, config) {
        const logChannel = member.guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Violación de AutoMod')
            .setDescription(`Se ha detectado una violación de ${violation}`)
            .addFields(
                { name: 'Usuario', value: member.toString() },
                { name: 'ID', value: member.id },
                { name: 'Acción Tomada', value: `${punishment.type} (${punishment.duration ? formatDuration(punishment.duration) : 'N/A'})` }
            )
            .setColor('#ff0000')
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    }

    isExempt(member, channel, config) {
        const { exemptRoles, exemptChannels } = config.autoMod;

        if (exemptChannels?.includes(channel.id)) return true;
        if (member.permissions.has('ManageMessages')) return true;
        return exemptRoles?.some(roleId => member.roles.cache.has(roleId)) ?? false;
    }

    async getGuildConfig(guildId) {
        return this.client.configManager.getConfig(guildId);
    }
}

module.exports = AutoMod;

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}