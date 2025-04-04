const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commands = new Collection();
        this.cooldowns = new Collection();

        // Managers
        this.ticketManager = new (require('../modules/tickets/ticketManager'))(client);
        this.moderationManager = new (require('../modules/moderation/moderationManager'))(client);
        this.roleManager = new (require('../modules/roles/roleManager'))(client);
        this.welcomeManager = new (require('../modules/welcome/welcomeManager'))(client);
    }

    async loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFolders = readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const commandFiles = readdirSync(path.join(commandsPath, folder))
                .filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const command = require(path.join(commandsPath, folder, file));
                if (command.data && command.execute) {
                    this.commands.set(command.data.name, command);
                    console.log(`✅ Comando cargado: ${command.data.name}`);
                }
            }
        }
    }

    async handleCommand(interaction) {
        if (!interaction.isCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        // Verificar permisos
        if (command.permissions) {
            const authorPerms = interaction.channel.permissionsFor(interaction.member);
            if (!authorPerms || !command.permissions.every(perm => authorPerms.has(perm))) {
                return interaction.reply({
                    content: '❌ No tienes permisos para usar este comando.',
                    ephemeral: true
                });
            }
        }

        // Sistema de cooldown
        if (command.cooldown) {
            if (!this.cooldowns.has(command.data.name)) {
                this.cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = this.cooldowns.get(command.data.name);
            const cooldownAmount = (command.cooldown || 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return interaction.reply({
                        content: `🕒 Por favor espera ${timeLeft.toFixed(1)} segundos antes de usar el comando '${command.data.name}' de nuevo.`,
                        ephemeral: true
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        }

        try {
            await command.execute(interaction, this);
        } catch (error) {
            console.error(error);
            const errorMessage = {
                content: '❌ Ha ocurrido un error al ejecutar este comando.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    async handleButton(interaction) {
        if (!interaction.isButton()) return;

        try {
            const [action, ...args] = interaction.customId.split('_');

            switch (action) {
                case 'create':
                    if (args[0] === 'ticket') {
                        await this.ticketManager.createTicket(interaction);
                    }
                    break;

                case 'close':
                    if (args[0] === 'ticket') {
                        await this.ticketManager.closeTicket(interaction);
                    }
                    break;

                case 'confirm':
                    if (args[0] === 'close') {
                        await this.ticketManager.handleTicketClose(interaction);
                    }
                    break;

                case 'role':
                    await this.roleManager.handleRoleButton(interaction);
                    break;

                default:
                    console.log(`Botón no manejado: ${interaction.customId}`);
            }
        } catch (error) {
            console.error(`Error al manejar botón: ${error}`);
            await interaction.reply({
                content: '❌ Ha ocurrido un error al procesar esta acción.',
                ephemeral: true
            });
        }
    }

    async handleEvents() {
        // Evento guildMemberAdd
        this.client.on('guildMemberAdd', async member => {
            await this.welcomeManager.handleWelcome(member);
            await this.roleManager.handleNewMember(member);
            await this.moderationManager.handleNewMember(member);
        });

        // Evento guildMemberRemove
        this.client.on('guildMemberRemove', async member => {
            await this.welcomeManager.handleLeave(member);
        });

        // Evento interactionCreate
        this.client.on('interactionCreate', async interaction => {
            if (interaction.isCommand()) {
                await this.handleCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButton(interaction);
            }
        });
    }
}

module.exports = CommandHandler;