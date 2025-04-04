const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

class TicketManager {
    constructor(client) {
        this.client = client;
        this.tickets = new Map();
    }

    async createTicketPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Sistema de Tickets')
            .setDescription('Haz clic en el botón de abajo para crear un ticket de soporte.')
            .setColor('#0099ff')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Crear Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

        return channel.send({ embeds: [embed], components: [row] });
    }

    async createTicket(interaction) {
        const guild = interaction.guild;
        const user = interaction.user;

        // Verificar si el usuario ya tiene un ticket abierto
        if (this.tickets.has(user.id)) {
            return interaction.reply({
                content: '❌ Ya tienes un ticket abierto.',
                ephemeral: true
            });
        }

        // Crear el canal del ticket
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: 0,
            parent: process.env.TICKET_CATEGORY,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                },
                {
                    id: this.client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ]
        });

        // Crear el mensaje inicial del ticket
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Creado')
            .setDescription(`Bienvenido ${user}, el equipo de soporte te atenderá pronto.\nPor favor, describe tu problema o consulta.`)
            .setColor('#00ff00')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        this.tickets.set(user.id, ticketChannel.id);

        return interaction.reply({
            content: `✅ Tu ticket ha sido creado: ${ticketChannel}`,
            ephemeral: true
        });
    }

    async closeTicket(interaction) {
        const channel = interaction.channel;
        const user = interaction.user;

        // Verificar si es un canal de ticket
        if (!channel.name.startsWith('ticket-')) {
            return interaction.reply({
                content: '❌ Este comando solo puede usarse en canales de ticket.',
                ephemeral: true
            });
        }

        // Confirmar cierre
        const embed = new EmbedBuilder()
            .setTitle('🔒 Cerrar Ticket')
            .setDescription('¿Estás seguro de que quieres cerrar este ticket?')
            .setColor('#ff0000')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Confirmar')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async handleTicketClose(interaction) {
        const channel = interaction.channel;
        const userId = this.tickets.findKey(channelId => channelId === channel.id);

        if (userId) {
            this.tickets.delete(userId);
        }

        await channel.delete();
    }
}

module.exports = TicketManager;