const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class RoleManager {
    constructor(client) {
        this.client = client;
        this.autoRoles = new Map();
        this.reactionRoles = new Map();
    }

    async setAutoRole(guild, role) {
        this.autoRoles.set(guild.id, role.id);

        const embed = new EmbedBuilder()
            .setTitle('✨ Auto-Rol Configurado')
            .setDescription(`El rol ${role} será asignado automáticamente a los nuevos miembros.`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }

    async handleNewMember(member) {
        const autoRoleId = this.autoRoles.get(member.guild.id);
        if (!autoRoleId) return;

        try {
            const role = await member.guild.roles.fetch(autoRoleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Auto-rol asignado a ${member.user.tag}`);
            }
        } catch (error) {
            console.error(`Error al asignar auto-rol: ${error.message}`);
        }
    }

    async createReactionRolePanel(channel, roles) {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Roles por Reacción')
            .setDescription('Haz clic en los botones para obtener o remover roles.')
            .setColor('#0099ff')
            .setTimestamp();

        const rows = [];
        let currentRow = new ActionRowBuilder();
        let buttonCount = 0;

        for (const [roleId, roleData] of roles) {
            const role = await channel.guild.roles.fetch(roleId);
            if (!role) continue;

            const button = new ButtonBuilder()
                .setCustomId(`role_${roleId}`)
                .setLabel(roleData.label || role.name)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(roleData.emoji || '🎭');

            currentRow.addComponents(button);
            buttonCount++;

            if (buttonCount === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
                buttonCount = 0;
            }
        }

        if (buttonCount > 0) {
            rows.push(currentRow);
        }

        const message = await channel.send({
            embeds: [embed],
            components: rows
        });

        this.reactionRoles.set(message.id, roles);
        return message;
    }

    async handleRoleButton(interaction) {
        const roleId = interaction.customId.replace('role_', '');
        const member = interaction.member;
        const role = await interaction.guild.roles.fetch(roleId);

        if (!role) {
            return interaction.reply({
                content: '❌ Este rol ya no existe.',
                ephemeral: true
            });
        }

        try {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(role);
                await interaction.reply({
                    content: `✅ Se te ha removido el rol ${role.name}`,
                    ephemeral: true
                });
            } else {
                await member.roles.add(role);
                await interaction.reply({
                    content: `✅ Se te ha asignado el rol ${role.name}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            await interaction.reply({
                content: `❌ Error al gestionar el rol: ${error.message}`,
                ephemeral: true
            });
        }
    }

    async createRoleTemplate(guild, name, roles, color = '#ffffff') {
        const template = {
            name,
            roles: roles.map(role => ({
                name: role.name,
                color: role.color,
                permissions: role.permissions.toArray(),
                hoist: role.hoist,
                mentionable: role.mentionable
            })),
            timestamp: Date.now()
        };

        const embed = new EmbedBuilder()
            .setTitle('📋 Plantilla de Roles Creada')
            .setDescription(`Nombre: ${name}\nRoles incluidos: ${roles.length}\nUsa !aplicarplantilla ${name} para aplicar esta plantilla.`)
            .setColor(color)
            .setTimestamp();

        return { template, embed };
    }

    async applyRoleTemplate(guild, template) {
        const createdRoles = [];

        for (const roleData of template.roles) {
            try {
                const role = await guild.roles.create({
                    name: roleData.name,
                    color: roleData.color,
                    permissions: roleData.permissions,
                    hoist: roleData.hoist,
                    mentionable: roleData.mentionable
                });
                createdRoles.push(role);
            } catch (error) {
                console.error(`Error al crear rol ${roleData.name}: ${error.message}`);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Plantilla de Roles Aplicada')
            .setDescription(`Se han creado ${createdRoles.length} roles de la plantilla ${template.name}`)
            .setColor('#00ff00')
            .setTimestamp();

        return embed;
    }
}

module.exports = RoleManager;