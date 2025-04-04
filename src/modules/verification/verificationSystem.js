const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class VerificationSystem {
    constructor(client) {
        this.client = client;
        this.verificationLevels = new Map();
        this.pendingVerifications = new Map();
        this.initializeSystem();
    }

    initializeSystem() {
        this.client.on('guildMemberAdd', async (member) => {
            const config = await this.client.configManager.getConfig(member.guild.id);
            if (!config?.verification?.enabled) return;

            await this.startVerification(member);
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.customId.startsWith('verify_')) {
                await this.handleVerificationButton(interaction);
            } else if (interaction.customId.startsWith('captcha_')) {
                await this.handleCaptchaResponse(interaction);
            }
        });
    }

    async startVerification(member) {
        const config = await this.client.configManager.getConfig(member.guild.id);
        const level = config.verification.level || 1;

        const verificationData = {
            userId: member.id,
            guildId: member.guild.id,
            level,
            attempts: 0,
            maxAttempts: 3,
            timestamp: Date.now()
        };

        this.pendingVerifications.set(member.id, verificationData);

        const embed = new EmbedBuilder()
            .setTitle('🔒 Verificación Requerida')
            .setDescription(`Bienvenido a ${member.guild.name}!\nPara acceder al servidor, necesitas completar el proceso de verificación.`)
            .setColor('#0099ff')
            .addFields([
                { name: 'Nivel de Verificación', value: `Nivel ${level}`, inline: true },
                { name: 'Tiempo Límite', value: '10 minutos', inline: true }
            ]);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_${member.id}`)
                    .setLabel('Comenzar Verificación')
                    .setStyle(ButtonStyle.Primary)
            );

        try {
            const dm = await member.createDM();
            await dm.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`No se pudo enviar DM a ${member.user.tag}`);
            // Intentar enviar en un canal de verificación si existe
            const verificationChannel = member.guild.channels.cache.get(config.verification.channel);
            if (verificationChannel) {
                await verificationChannel.send({ content: `${member}, por favor verifica tu cuenta:`, embeds: [embed], components: [row] });
            }
        }

        // Establecer timeout para la verificación
        setTimeout(() => this.handleVerificationTimeout(member), 600000); // 10 minutos
    }

    async handleVerificationButton(interaction) {
        const userId = interaction.customId.split('_')[1];
        if (interaction.user.id !== userId) {
            return interaction.reply({ content: 'Esta verificación no es para ti.', ephemeral: true });
        }

        const verificationData = this.pendingVerifications.get(userId);
        if (!verificationData) {
            return interaction.reply({ content: 'Esta verificación ha expirado.', ephemeral: true });
        }

        await this.sendCaptchaChallenge(interaction, verificationData);
    }

    async sendCaptchaChallenge(interaction, verificationData) {
        const captcha = this.generateCaptcha();
        verificationData.currentCaptcha = captcha.code;

        const embed = new EmbedBuilder()
            .setTitle('🔒 Verificación - Captcha')
            .setDescription('Por favor, selecciona la opción correcta:')
            .setImage(captcha.image)
            .setColor('#0099ff');

        const row = new ActionRowBuilder()
            .addComponents(
                ...captcha.options.map(option => 
                    new ButtonBuilder()
                        .setCustomId(`captcha_${verificationData.userId}_${option}`)
                        .setLabel(option)
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async handleCaptchaResponse(interaction) {
        const [, userId, response] = interaction.customId.split('_');
        const verificationData = this.pendingVerifications.get(userId);

        if (!verificationData) {
            return interaction.reply({ content: 'Esta verificación ha expirado.', ephemeral: true });
        }

        if (response === verificationData.currentCaptcha) {
            await this.completeVerification(interaction, verificationData);
        } else {
            verificationData.attempts++;
            if (verificationData.attempts >= verificationData.maxAttempts) {
                await this.failVerification(interaction, verificationData);
            } else {
                await this.sendCaptchaChallenge(interaction, verificationData);
            }
        }
    }

    async completeVerification(interaction, verificationData) {
        const guild = this.client.guilds.cache.get(verificationData.guildId);
        const member = await guild.members.fetch(verificationData.userId);
        const config = await this.client.configManager.getConfig(guild.id);

        // Asignar rol verificado
        if (config.verification.roleId) {
            await member.roles.add(config.verification.roleId);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Verificación Completada')
            .setDescription('¡Has sido verificado exitosamente!')
            .setColor('#00ff00');

        await interaction.update({ embeds: [embed], components: [] });
        this.pendingVerifications.delete(verificationData.userId);

        // Registrar la verificación
        await this.client.moderationLog.logModAction(guild, 'verification', {
            target: member.user,
            moderator: this.client.user,
            action: 'Verificación completada'
        });
    }

    async failVerification(interaction, verificationData) {
        const guild = this.client.guilds.cache.get(verificationData.guildId);
        const member = await guild.members.fetch(verificationData.userId);

        const embed = new EmbedBuilder()
            .setTitle('❌ Verificación Fallida')
            .setDescription('Has excedido el número máximo de intentos.')
            .setColor('#ff0000');

        await interaction.update({ embeds: [embed], components: [] });
        this.pendingVerifications.delete(verificationData.userId);

        // Registrar el fallo
        await this.client.moderationLog.logModAction(guild, 'verification', {
            target: member.user,
            moderator: this.client.user,
            action: 'Verificación fallida'
        });

        // Opcional: Kickear al usuario
        const config = await this.client.configManager.getConfig(guild.id);
        if (config.verification.kickOnFail) {
            await member.kick('Falló la verificación');
        }
    }

    async handleVerificationTimeout(member) {
        const verificationData = this.pendingVerifications.get(member.id);
        if (!verificationData) return;

        this.pendingVerifications.delete(member.id);

        const config = await this.client.configManager.getConfig(member.guild.id);
        if (config.verification.kickOnTimeout) {
            await member.kick('Tiempo de verificación expirado');
        }

        // Registrar el timeout
        await this.client.moderationLog.logModAction(member.guild, 'verification', {
            target: member.user,
            moderator: this.client.user,
            action: 'Verificación expirada'
        });
    }

    generateCaptcha() {
        // Generar un código aleatorio de 6 caracteres
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Crear opciones falsas
        const options = [code];
        for (let i = 0; i < 3; i++) {
            options.push(Math.random().toString(36).substring(2, 8).toUpperCase());
        }

        // Mezclar las opciones
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        // En una implementación real, aquí se generaría una imagen con el código
        const image = `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="black">${code}</text>
            </svg>`
        )}`;

        return { code, options, image };
    }
}

module.exports = VerificationSystem;