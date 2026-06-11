const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command) {
        commands.push(command.data.toJSON());
        console.log(`📝 Loaded command for deployment: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command ${file} is missing 'data' property`);
    }
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`🔄 Started refreshing ${commands.length} application commands...`);
        
        let data;
        
        // Check if GUILD_ID is provided (for testing)
        if (process.env.GUILD_ID && process.env.GUILD_ID !== 'YOUR_GUILD_ID_HERE') {
            // Guild commands (instant update, good for testing)
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} guild commands to ${process.env.GUILD_ID}`);
        } else {
            // Global commands (takes up to 1 hour to propagate)
            data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Deployed ${data.length} global commands`);
        }
        
        console.log('📋 Commands deployed:');
        data.forEach(cmd => {
            console.log(`   - /${cmd.name}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to deploy commands:', error);
        console.error(error);
    }
})();