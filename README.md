# Bot de Discord Multifuncional

Un bot de Discord potente y versátil con múltiples funcionalidades para administrar y mejorar tu servidor.

## 🌟 Características

### Sistema de Tickets
- Creación automática de canales de tickets
- Botones interactivos para abrir/cerrar tickets
- Sistema de categorías para organizar tickets

### Moderación
- Comandos de moderación (ban, kick, warn)
- Sistema anti-raid
- Registro de acciones de moderación
- Sistema de advertencias con auto-moderación

### Auto-Roles
- Asignación automática de roles a nuevos miembros
- Sistema de roles por reacción
- Plantillas de roles personalizables

### Bienvenidas y Despedidas
- Mensajes personalizables
- Soporte para embeds
- Múltiples plantillas predefinidas
- Opción de mensajes privados de bienvenida

## 📋 Requisitos

- Node.js v16.9.0 o superior
- Discord.js v14.11.0
- MongoDB (para almacenamiento de datos)

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone [URL del repositorio]
cd bot-discord-multifuncional
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura el archivo .env:
```env
TOKEN=tu_token_aqui
MONGODB_URI=tu_uri_de_mongodb
PREFIX=!
OWNER_ID=tu_id_aqui
LOG_CHANNEL=id_del_canal_de_logs
```

4. Inicia el bot:
```bash
npm start
```

## 💡 Uso

### Configuración de Tickets
```
/tickets setup - Configura el sistema de tickets
/tickets category - Establece la categoría para tickets
/tickets close - Cierra un ticket
```

### Comandos de Moderación
```
/ban - Banea a un usuario
/kick - Expulsa a un usuario
/warn - Advierte a un usuario
/antiraid enable - Activa la protección anti-raid
```

### Gestión de Roles
```
/autorole set - Configura el rol automático
/reactionroles create - Crea un panel de roles por reacción
/roletemplate create - Crea una plantilla de roles
```

### Configuración de Bienvenidas
```
/welcome channel - Establece el canal de bienvenidas
/welcome message - Personaliza el mensaje de bienvenida
/welcome template - Selecciona una plantilla predefinida
```

## 🛠️ Personalización

Puedes personalizar el bot editando los siguientes archivos:
- `config.json` - Configuración general del bot
- `src/modules/welcome/templates.js` - Plantillas de bienvenida
- `src/modules/tickets/categories.js` - Categorías de tickets

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

## 🙏 Agradecimientos

- Discord.js por su excelente librería
- La comunidad de Discord por su apoyo y feedback"# Multifunctional-Discord-Bot" 
