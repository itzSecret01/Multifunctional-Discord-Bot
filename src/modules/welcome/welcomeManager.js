yconst { EmbedBuilder, AttachmentBuilder } = require('discord.js');

class WelcomeManager {
    constructor(client) {
        this.client = client;
        this.welcomeSettings = new Map();
        this.leaveSettings = new Map();
    }

    async setWelcomeChannel(guild, channel, settings = {}) {
        this.welcomeSettings.set(guild.id, {
            channelId: channel.id,
            message: settings.message || '¡Bienvenido {user} a {server}! 🎉',
            embedColor: settings.embedColor || '#00ff00',
            showMemberCount: settings.showMemberCount ?? true,
            dmWelcome: settings.dmWelcome ?? false,
            dmMessage: settings.dmMessage || '¡Bienvenido a {server}! Esperamos que disfrutes tu estancia.',
            template: settings.template || 'default'
        });

        const embed = new EmbedBuilder()
            .setTitle('✨ Canal de Bienvenidas Configurado')
            .setDescription(`Las bienvenidas serán enviadas en ${channel}\nMensaje: ${settings.message || '¡Bienvenido {user} a {server}! 🎉'}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async setLeaveChannel(guild, channel, settings = {}) {
        this.leaveSettings.set(guild.id, {
            channelId: channel.id,
            message: settings.message || '¡Adiós {user}! Esperamos verte pronto de nuevo 👋',
            embedColor: settings.embedColor || '#ff0000',
            showMemberCount: settings.showMemberCount ?? true,
            template: settings.template || 'default'
        });

        const embed = new EmbedBuilder()
            .setTitle('👋 Canal de Despedidas Configurado')
            .setDescription(`Las despedidas serán enviadas en ${channel}\nMensaje: ${settings.message || '¡Adiós {user}! Esperamos verte pronto de nuevo 👋'}`)
            .setColor('#ff0000')
            .setTimestamp();

        return embed;
    }

    async handleWelcome(member) {
        const settings = this.welcomeSettings.get(member.guild.id);
        if (!settings) return;

        const channel = await member.guild.channels.fetch(settings.channelId);
        if (!channel) return;

        const welcomeMessage = this.formatMessage(settings.message, {
            user: member.user.tag,
            mention: member.toString(),
            server: member.guild.name,
            memberCount: member.guild.memberCount
        });

        const embed = new EmbedBuilder()
            .setTitle('¡Nuevo Miembro!')
            .setDescription(welcomeMessage)
            .setColor(settings.embedColor)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (settings.showMemberCount) {
            embed.setFooter({
                text: `Miembro #${member.guild.memberCount}`
            });
        }

        await channel.send({ embeds: [embed] });

        // Mensaje privado de bienvenida
        if (settings.dmWelcome) {
            const dmMessage = this.formatMessage(settings.dmMessage, {
                user: member.user.tag,
                server: member.guild.name
            });

            try {
                await member.send(dmMessage);
            } catch (error) {
                console.error(`No se pudo enviar DM a ${member.user.tag}: ${error.message}`);
            }
        }
    }

    async handleLeave(member) {
        const settings = this.leaveSettings.get(member.guild.id);
        if (!settings) return;

        const channel = await member.guild.channels.fetch(settings.channelId);
        if (!channel) return;

        const leaveMessage = this.formatMessage(settings.message, {
            user: member.user.tag,
            server: member.guild.name,
            memberCount: member.guild.memberCount
        });

        const embed = new EmbedBuilder()
            .setTitle('¡Un Miembro se ha Ido!')
            .setDescription(leaveMessage)
            .setColor(settings.embedColor)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (settings.showMemberCount) {
            embed.setFooter({
                text: `Quedamos ${member.guild.memberCount} miembros`
            });
        }

        await channel.send({ embeds: [embed] });
    }

    formatMessage(message, data) {
        return message
            .replace(/{user}/g, data.user)
            .replace(/{mention}/g, data.mention || data.user)
            .replace(/{server}/g, data.server)
            .replace(/{memberCount}/g, data.memberCount);
    }

    getWelcomeTemplates() {
        return {
            default: {
                message: '¡Bienvenido {user} a {server}! 🎉',
                embedColor: '#00ff00',
                showMemberCount: true
            },
            formal: {
                message: 'Bienvenido/a {mention} a la comunidad de {server}.\nEsperamos que disfrutes tu estancia con nosotros.',
                embedColor: '#0099ff',
                showMemberCount: true
            },
            gaming: {
                message: '🎮 ¡Un nuevo jugador ha entrado al servidor! Bienvenido {mention} a {server}',
                embedColor: '#9b59b6',
                showMemberCount: true
            },
            minimal: {
                message: '👋 {user}',
                embedColor: '#2ecc71',
                showMemberCount: false
            }
        };
    }

    getLeaveTemplates() {
        return {
            default: {
                message: '¡Adiós {user}! Esperamos verte pronto de nuevo 👋',
                embedColor: '#ff0000',
                showMemberCount: true
            },
            formal: {
                message: '{user} ha abandonado el servidor. ¡Hasta la próxima!',
                embedColor: '#e74c3c',
                showMemberCount: true
            },
            minimal: {
                message: '👋 {user}',
                embedColor: '#95a5a6',
                showMemberCount: false
            }
        };
    }
}

module.exports = WelcomeManager;