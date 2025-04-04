const { EmbedBuilder } = require('discord.js');

class TemporaryRoles {
    constructor(client) {
        this.client = client;
        this.temporaryRoles = new Map();
        this.roleHierarchy = new Map();
        this.checkInterval = 60000; // Comprobar cada minuto
        this.initializeSystem();
    }

    initializeSystem() {
        // Comprobar roles temporales periódicamente
        setInterval(() => this.checkTemporaryRoles(), this.checkInterval);

        // Monitorear cambios en roles
        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            await this.handleRoleChanges(oldMember, newMember);
        });
    }

    async addTemporaryRole(member, role, duration, reason) {
        const expiresAt = Date.now() + duration;

        // Guardar información del rol temporal
        if (!this.temporaryRoles.has(member.guild.id)) {
            this.temporaryRoles.set(member.guild.id, new Map());
        }
        const guildTempRoles = this.temporaryRoles.get(member.guild.id);

        if (!guildTempRoles.has(member.id)) {
            guildTempRoles.set(member.id, new Map());
        }
        const memberTempRoles = guildTempRoles.get(member.id);

        memberTempRoles.set(role.id, {
            roleId: role.id,
            expiresAt,
            reason
        });

        // Añadir el rol al miembro
        await member.roles.add(role, reason);

        // Registrar la acción
        await this.client.moderationLog.logModAction(member.guild, 'temp_role_add', {
            target: member.user,
            moderator: this.client.user,
            role: role,
            duration: this.formatDuration(duration),
            reason: reason
        });

        return {
            success: true,
            expiresAt
        };
    }

    async removeTemporaryRole(member, roleId, reason = 'Rol temporal expirado') {
        const guildTempRoles = this.temporaryRoles.get(member.guild.id);
        if (!guildTempRoles) return false;

        const memberTempRoles = guildTempRoles.get(member.id);
        if (!memberTempRoles || !memberTempRoles.has(roleId)) return false;

        // Eliminar el rol
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
            await member.roles.remove(role, reason);

            // Registrar la acción
            await this.client.moderationLog.logModAction(member.guild, 'temp_role_remove', {
                target: member.user,
                moderator: this.client.user,
                role: role,
                reason: reason
            });
        }

        // Limpiar datos
        memberTempRoles.delete(roleId);
        if (memberTempRoles.size === 0) {
            guildTempRoles.delete(member.id);
        }
        if (guildTempRoles.size === 0) {
            this.temporaryRoles.delete(member.guild.id);
        }

        return true;
    }

    async checkTemporaryRoles() {
        const now = Date.now();

        for (const [guildId, guildTempRoles] of this.temporaryRoles.entries()) {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) continue;

            for (const [memberId, memberTempRoles] of guildTempRoles.entries()) {
                const member = await guild.members.fetch(memberId).catch(() => null);
                if (!member) continue;

                for (const [roleId, roleData] of memberTempRoles.entries()) {
                    if (now >= roleData.expiresAt) {
                        await this.removeTemporaryRole(member, roleId);
                    }
                }
            }
        }
    }

    async handleRoleChanges(oldMember, newMember) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        // Verificar jerarquía de roles para roles añadidos
        for (const role of addedRoles.values()) {
            await this.enforceRoleHierarchy(newMember, role);
        }

        // Actualizar roles temporales si se eliminaron manualmente
        for (const role of removedRoles.values()) {
            const guildTempRoles = this.temporaryRoles.get(newMember.guild.id);
            if (guildTempRoles?.get(newMember.id)?.has(role.id)) {
                guildTempRoles.get(newMember.id).delete(role.id);
            }
        }
    }

    async enforceRoleHierarchy(member, addedRole) {
        const hierarchy = this.roleHierarchy.get(member.guild.id);
        if (!hierarchy) return;

        const incompatibleRoles = hierarchy.get(addedRole.id);
        if (!incompatibleRoles) return;

        // Remover roles incompatibles
        for (const roleId of incompatibleRoles) {
            if (member.roles.cache.has(roleId)) {
                const role = member.guild.roles.cache.get(roleId);
                if (role) {
                    await member.roles.remove(role, 'Rol incompatible según jerarquía');
                    
                    // Registrar la acción
                    await this.client.moderationLog.logModAction(member.guild, 'role_hierarchy', {
                        target: member.user,
                        moderator: this.client.user,
                        addedRole: addedRole,
                        removedRole: role,
                        reason: 'Conflicto de jerarquía de roles'
                    });
                }
            }
        }
    }

    setRoleHierarchy(guild, roleId, incompatibleRoles) {
        if (!this.roleHierarchy.has(guild.id)) {
            this.roleHierarchy.set(guild.id, new Map());
        }

        this.roleHierarchy.get(guild.id).set(roleId, new Set(incompatibleRoles));
    }

    async getTemporaryRoleInfo(member, roleId) {
        const guildTempRoles = this.temporaryRoles.get(member.guild.id);
        if (!guildTempRoles) return null;

        const memberTempRoles = guildTempRoles.get(member.id);
        if (!memberTempRoles) return null;

        const roleData = memberTempRoles.get(roleId);
        if (!roleData) return null;

        return {
            expiresAt: roleData.expiresAt,
            reason: roleData.reason,
            timeRemaining: roleData.expiresAt - Date.now()
        };
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }
}

module.exports = TemporaryRoles;