const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { config } = require('dotenv');
const winston = require('winston');

// Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Configuración del cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ]
});

// Colecciones para almacenar comandos y eventos
client.commands = new Collection();
client.events = new Collection();

// Cargar variables de entorno
config();

// Evento ready
client.once('ready', () => {
  logger.info(`Bot conectado como ${client.user.tag}`);
});

// Manejo de errores
client.on('error', error => {
  logger.error('Error en el cliente de Discord:', error);
});

process.on('unhandledRejection', error => {
  logger.error('Error no manejado:', error);
});

// Conectar el bot
client.login(process.env.TOKEN).catch(error => {
  logger.error('Error al iniciar sesión:', error);
});