const { Client, GatewayIntentBits, Collection, ActivityType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ] 
});

// Command collection
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands from commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command ${file} is missing required properties`);
    }
}

// Event: Ready
client.once('ready', () => {
    console.log(`🎵 ${client.user.tag} is online!`);
    console.log(`📝 Loaded ${client.commands.size} commands`);
    
    // Set bot activity
    client.user.setActivity({
        name: process.env.ACTIVITY || '/music play',
        type: ActivityType.Listening
    });
});

// Event: Interaction Create (Slash Commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    // Cooldown system (optional)
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }
    
    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;
    
    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({
                content: `⏰ Please wait ${timeLeft.toFixed(1)} more seconds before using \`/${command.data.name}\``,
                ephemeral: true
            });
        }
    }
    
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    
    // Execute command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${command.data.name}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Command Error')
            .setDescription('There was an error executing this command!')
            .addFields(
                { name: 'Error', value: `\`${error.message}\``, inline: false }
            )
            .setTimestamp();
        
        await interaction.reply({
            embeds: [errorEmbed],
            ephemeral: true
        }).catch(() => {
            interaction.editReply({
                content: '❌ There was an error executing this command!',
                ephemeral: true
            });
        });
    }
});

// Event: Voice State Update (auto-leave when alone)
client.on('voiceStateUpdate', (oldState, newState) => {
    // Check if bot is in a voice channel
    if (oldState.member.id === client.user.id) {
        // Bot left voice channel
        if (!newState.channelId) {
            const queue = queues?.get(oldState.guild.id);
            if (queue) {
                queue.songs = [];
                queue.currentSong = null;
                if (queue.player) queue.player.stop();
                queues.delete(oldState.guild.id);
            }
        }
    } else {
        // Check if bot is alone in voice channel
        const botVoiceState = newState.guild.members.me.voice;
        if (botVoiceState.channelId) {
            const channel = botVoiceState.channel;
            const members = channel.members.filter(m => !m.user.bot);
            
            if (members.size === 0) {
                // Bot is alone, leave after 30 seconds
                setTimeout(() => {
                    const currentMembers = channel.members.filter(m => !m.user.bot);
                    if (currentMembers.size === 0) {
                        const queue = queues?.get(newState.guild.id);
                        if (queue && queue.connection) {
                            queue.connection.destroy();
                            queues.delete(newState.guild.id);
                            console.log(`Left voice channel in ${newState.guild.name} - alone`);
                        }
                    }
                }, 30000);
            }
        }
    }
});

// Global queue access for voiceStateUpdate
global.queues = new Map();

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login:', error);
});

// Export queues for use in music commands
module.exports = { queues };