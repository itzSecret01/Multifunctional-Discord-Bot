const PanelManager = require('./panelManager');

module.exports = (client) => {
    const panelManager = new PanelManager(client);

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        // Verificar si es una interacción del panel
        if (interaction.customId.startsWith('panel_') || 
            interaction.customId.startsWith('roles_') || 
            interaction.customId.startsWith('tickets_') || 
            interaction.customId.startsWith('mod_') || 
            interaction.customId.startsWith('config_')) {
            
            try {
                // Verificar permisos
                if (!interaction.member.permissions.has('Administrator')) {
                    return interaction.reply({
                        content: '❌ No tienes permisos para usar el panel de control',
                        ephemeral: true
                    });
                }

                // Si es el botón de volver, mostrar el panel principal
                if (interaction.customId === 'panel_back') {
                    const command = client.commands.get('panel');
                    if (command) {
                        await command.execute(interaction);
                        return;
                    }
                }

                // Manejar la interacción del panel
                await panelManager.handlePanelInteraction(interaction);
            } catch (error) {
                console.error('Error en el panel:', error);
                await interaction.reply({
                    content: '❌ Ha ocurrido un error al procesar tu solicitud',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    });

    return panelManager;
};