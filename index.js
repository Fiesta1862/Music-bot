const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Collection } = require('discord.js');
const { LavalinkManager } = require('devcodes-lavalink');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();

// Initialize Lavalink Manager
const lavalink = new LavalinkManager({
  nodes: [{
    host: process.env.LAVALINK_HOST || 'localhost',
    port: parseInt(process.env.LAVALINK_PORT) || 2333,
    password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
  }],
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
  persistencePath: './players.json', // Auto-resume after restart
});

// Load commands
const fs = require('fs');
const commandsPath = './commands';
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
  console.log(`🎵 ${client.user.tag} is online!`);
  await lavalink.init(client.user.id);
  client.user.setActivity('/play', { type: ActivityType.Listening });
});

// Forward raw voice packets to Lavalink
client.on('raw', (packet) => {
  lavalink.handleRawPacket(packet);
});

// Slash command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction, lavalink);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ Error executing command!', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);