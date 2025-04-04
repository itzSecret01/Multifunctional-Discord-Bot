const { EmbedBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

class VerificationManager {
    constructor(client) {
        this.client = client;
        this.verificationSettings = new Map();
        this.defaultSettings = {
            enabled: false,
            verificationLevel: 1,
            verificationChannel: null,
            verifiedRole: null,
            welcomeChannel: null,
            customMessage: '¡Bienvenido! Por favor, verifica tu cuenta para acceder al servidor.',
            buttonStyle: ButtonStyle.Primary,
            buttonEmoji: '✅',
            buttonLabel: 'Verificar',
            autoKick: false,
            autoKickTimeout: 24, // horas
            verificationTypes: [
                {
                    level: 1,
                    name: 'Básico',
                    description: 'Verificación por botón',
                    requirements: ['BUTTON_CLICK']
                },
                {
                    level: 2,
                    name: 'Captcha',
                    description: 'Verificación con captcha',
                    requirements: ['CAPTCHA']
                },
                {
                    level: 3,
                    name: 'Moderado',
                    description: 'Verificación con preguntas',
                    requirements: ['QUESTIONS', 'ACCOUNT_AGE']
                },
                {
                    level: 4,
                    name: 'Estricto',
                    description: 'Verificación completa',
                    requirements: ['CAPTCHA', 'QUESTIONS', 'ACCOUNT_AGE', 'EMAIL']
                }
            ],
            questions: [
                {
                    question: '¿Has leído las reglas del servidor?',
                    correctAnswer: 'sí'
                },
                {
                    question: '¿Aceptas seguir las normas de la comunidad?',
                    correctAnswer: 'sí'
                }
            ],
            accountAgeDays: 7,
            emailDomain: null,
            customCaptcha: {
                enabled: false,
                length: 6,
                expires: 300, // segundos
                caseSensitive: false
            }
        };
    }

    async setup(guild, settings = {}) {
        const guildSettings = this.verificationSettings.get(guild.id) || { ...this.defaultSettings };
        Object.assign(guildSettings, settings);

        if (!guildSettings.verificationChannel) {
            const channel = await guild.channels.create({
                name: 'verificación',
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.SendMessages],
                        allow: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: this.client.user.id,
                        allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                    }
                ]
            });
            guildSettings.verificationChannel = channel.id;
        }

        this.verificationSettings.set(guild.id, guildSettings);
        await this.createVerificationMessage(guild);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Sistema de Verificación Configurado')
            .setDescription(`Configuración actualizada:\n${Object.entries(settings)
                .map(([key, value]) => `**${key}:** ${value}`)
                .join('\n')}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async createVerificationMessage(guild) {
        const settings = this.verificationSettings.get(guild.id);
        if (!settings || !settings.enabled) return;

        const channel = guild.channels.cache.get(settings.verificationChannel);
        if (!channel) return;

        const verType = settings.verificationTypes.find(t => t.level === settings.verificationLevel);

        const embed = new EmbedBuilder()
            .setTitle('🔐 Verificación del Servidor')
            .setDescription(`${settings.customMessage}\n\n**Nivel de Verificación:** ${verType.name}\n**Requisitos:**\n${verType.requirements.map(req => `• ${req}`).join('\n')}`)
            .setColor('#0099ff')
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId('verify_user')
            .setLabel(settings.buttonLabel)
            .setStyle(settings.buttonStyle)
            .setEmoji(settings.buttonEmoji);

        const row = new ActionRowBuilder().addComponents(button);

        // Limpiar mensajes anteriores
        await channel.bulkDelete(100).catch(() => {});
        await channel.send({ embeds: [embed], components: [row] });
    }

    async handleVerification(interaction) {
        const settings = this.verificationSettings.get(interaction.guild.id);
        if (!settings || !settings.enabled) return;

        const verType = settings.verificationTypes.find(t => t.level === settings.verificationLevel);
        const member = interaction.member;

        // Verificar requisitos según el nivel
        if (verType.requirements.includes('ACCOUNT_AGE')) {
            const accountAge = Date.now() - member.user.createdTimestamp;
            const minAge = settings.accountAgeDays * 24 * 60 * 60 * 1000;
            if (accountAge < minAge) {
                return interaction.reply({
                    content: `❌ Tu cuenta debe tener al menos ${settings.accountAgeDays} días de antigüedad.`,
                    ephemeral: true
                });
            }
        }

        if (verType.requirements.includes('CAPTCHA')) {
            // Implementar verificación por captcha
            const captcha = await this.generateCaptcha(settings.customCaptcha);
            // ... lógica del captcha
        }

        if (verType.requirements.includes('QUESTIONS')) {
            // Implementar verificación por preguntas
            // ... lógica de preguntas
        }

        // Asignar rol verificado
        if (settings.verifiedRole) {
            await member.roles.add(settings.verifiedRole);
        }

        // Enviar mensaje de bienvenida
        if (settings.welcomeChannel) {
            const welcomeChannel = interaction.guild.channels.cache.get(settings.welcomeChannel);
            if (welcomeChannel) {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('👋 ¡Nuevo Miembro Verificado!')
                    .setDescription(`¡Bienvenido ${member} a nuestro servidor!`)
                    .setColor('#00ff00')
                    .setTimestamp();
                await welcomeChannel.send({ embeds: [welcomeEmbed] });
            }
        }

        return interaction.reply({
            content: '✅ ¡Has sido verificado exitosamente!',
            ephemeral: true
        });
    }

    async generateCaptcha(settings) {
        // Implementar generación de captcha
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let captcha = '';
        for (let i = 0; i < settings.length; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return captcha;
    }

    async checkUnverifiedMembers(guild) {
        const settings = this.verificationSettings.get(guild.id);
        if (!settings || !settings.autoKick) return;

        const verifiedRole = guild.roles.cache.get(settings.verifiedRole);
        if (!verifiedRole) return;

        const timeout = settings.autoKickTimeout * 60 * 60 * 1000;
        const members = await guild.members.fetch();

        for (const [, member] of members) {
            if (!member.roles.cache.has(verifiedRole.id)) {
                const joinedAt = member.joinedTimestamp;
                if (Date.now() - joinedAt > timeout) {
                    await member.kick('No verificado dentro del tiempo límite').catch(() => {});
                }
            }
        }
    }
}

module.exports = VerificationManager;