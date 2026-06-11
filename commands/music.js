const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

// Queue storage
const queues = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('🎵 Music playback commands')
        .addSubcommand(sub => sub
            .setName('play')
            .setDescription('Play a song from YouTube')
            .addStringOption(opt => opt
                .setName('query')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('skip')
            .setDescription('Skip the currently playing song')
        )
        .addSubcommand(sub => sub
            .setName('stop')
            .setDescription('Stop music and clear the queue')
        )
        .addSubcommand(sub => sub
            .setName('queue')
            .setDescription('Show the current song queue')
        )
        .addSubcommand(sub => sub
            .setName('pause')
            .setDescription('Pause the current playback')
        )
        .addSubcommand(sub => sub
            .setName('resume')
            .setDescription('Resume paused playback')
        )
        .addSubcommand(sub => sub
            .setName('nowplaying')
            .setDescription('Show the currently playing song')
        )
        .addSubcommand(sub => sub
            .setName('clear')
            .setDescription('Clear the entire song queue')
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch(subcommand) {
            case 'play':
                await handlePlay(interaction);
                break;
            case 'skip':
                await handleSkip(interaction);
                break;
            case 'stop':
                await handleStop(interaction);
                break;
            case 'queue':
                await handleQueue(interaction);
                break;
            case 'pause':
                await handlePause(interaction);
                break;
            case 'resume':
                await handleResume(interaction);
                break;
            case 'nowplaying':
                await handleNowPlaying(interaction);
                break;
            case 'clear':
                await handleClear(interaction);
                break;
        }
    }
};

async function handlePlay(interaction) {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;
    
    // Check if user is in a voice channel
    if (!voiceChannel) {
        return interaction.reply({ 
            content: '❌ You need to be in a voice channel to play music!', 
            ephemeral: true 
        });
    }
    
    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        return interaction.reply({ 
            content: '❌ I need permissions to join and speak in your voice channel!', 
            ephemeral: true 
        });
    }
    
    await interaction.reply({ content: `🔍 Searching for: **${query}**...` });
    
    try {
        // Get song information
        let songInfo;
        let url = query;
        
        // Check if query is a URL or search term
        if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
            // Search for video
            const searchQuery = await ytdl.getInfo(`ytsearch:${query}`);
            url = searchQuery.videoDetails.video_url;
        }
        
        songInfo = await ytdl.getInfo(url);
        
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            duration: songInfo.videoDetails.lengthSeconds,
            thumbnail: songInfo.videoDetails.thumbnails[0]?.url || null,
            channel: songInfo.videoDetails.author.name,
            requestedBy: interaction.user.tag
        };
        
        // Get or create queue for this guild
        let queue = queues.get(interaction.guildId);
        if (!queue) {
            queue = {
                songs: [],
                player: createAudioPlayer(),
                connection: null,
                currentSong: null,
                volume: 100
            };
            queues.set(interaction.guildId, queue);
        }
        
        queue.songs.push(song);
        
        // Join voice channel if not already connected
        if (!queue.connection) {
            queue.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator
            });
            queue.connection.subscribe(queue.player);
            
            setupPlayerEvents(queue, interaction.guildId);
        }
        
        // If nothing is playing, start playing
        if (queue.songs.length === 1) {
            playNextSong(interaction.guildId);
        }
        
        // Create response embed
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Added to Queue')
            .setDescription(`**[${song.title}](${song.url})**`)
            .setThumbnail(song.thumbnail)
            .addFields(
                { name: 'Position', value: `${queue.songs.length}`, inline: true },
                { name: 'Duration', value: formatDuration(song.duration), inline: true },
                { name: 'Channel', value: song.channel, inline: true },
                { name: 'Requested by', value: song.requestedBy, inline: true }
            )
            .setFooter({ text: `Queue length: ${queue.songs.length} songs` });
        
        await interaction.editReply({ content: null, embeds: [embed] });
        
    } catch (error) {
        console.error('Play error:', error);
        await interaction.editReply({ 
            content: '❌ Failed to play that song. Please check the URL or try a different search term!' 
        });
    }
}

function playNextSong(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.songs.length === 0) return;
    
    const song = queue.songs[0];
    queue.currentSong = song;
    
    try {
        const stream = ytdl(song.url, { 
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
        
        const resource = createAudioResource(stream);
        queue.player.play(resource);
        
    } catch (error) {
        console.error('Playback error:', error);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playNextSong(guildId);
        }
    }
}

function setupPlayerEvents(queue, guildId) {
    queue.player.on(AudioPlayerStatus.Idle, () => {
        // Remove the song that just finished
        if (queue.songs.length > 0) {
            queue.songs.shift();
        }
        
        // Play next song if available
        if (queue.songs.length > 0) {
            playNextSong(guildId);
        } else {
            // Leave voice channel after 5 minutes of inactivity
            setTimeout(() => {
                const currentQueue = queues.get(guildId);
                if (currentQueue && currentQueue.songs.length === 0 && currentQueue.connection) {
                    currentQueue.connection.destroy();
                    queues.delete(guildId);
                }
            }, 300000);
        }
    });
    
    queue.player.on('error', error => {
        console.error('Player error:', error);
        if (queue.songs.length > 0) {
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playNextSong(guildId);
            }
        }
    });
}

async function handleSkip(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ 
            content: '❌ No music is currently playing!', 
            ephemeral: true 
        });
    }
    
    const skippedSong = queue.currentSong;
    queue.player.stop();
    
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⏭️ Skipped')
        .setDescription(`Skipped: **${skippedSong?.title || 'Unknown'}**`)
        .setFooter({ text: queue.songs.length > 1 ? `${queue.songs.length - 1} songs remaining in queue` : 'Queue is now empty' });
    
    await interaction.reply({ embeds: [embed] });
}

async function handleStop(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue) {
        return interaction.reply({ 
            content: '❌ No music is currently playing!', 
            ephemeral: true 
        });
    }
    
    // Clear queue and stop playback
    queue.songs = [];
    queue.currentSong = null;
    queue.player.stop();
    
    if (queue.connection) {
        queue.connection.destroy();
    }
    
    queues.delete(interaction.guildId);
    
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⏹️ Stopped')
        .setDescription('Music stopped and queue cleared!');
    
    await interaction.reply({ embeds: [embed] });
}

async function handleQueue(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ 
            content: '📭 The queue is empty! Add some songs with `/music play`', 
            ephemeral: true 
        });
    }
    
    // Show up to 10 songs in the queue
    const songList = queue.songs.slice(0, 10).map((song, index) => {
        const prefix = index === 0 ? '▶️ **Now Playing**' : `${index + 1}.`;
        return `${prefix} **[${song.title}](${song.url})** (${formatDuration(song.duration)}) - Requested by ${song.requestedBy}`;
    }).join('\n\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Music Queue')
        .setDescription(songList || 'No songs in queue')
        .setFooter({ text: `${queue.songs.length} songs total | Total duration: ${getTotalDuration(queue.songs)}` });
    
    if (queue.songs.length > 10) {
        embed.addFields({ name: 'And more...', value: `${queue.songs.length - 10} more songs in queue`, inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handlePause(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || !queue.currentSong) {
        return interaction.reply({ 
            content: '❌ No music is currently playing!', 
            ephemeral: true 
        });
    }
    
    if (queue.player.state.status === AudioPlayerStatus.Paused) {
        return interaction.reply({ 
            content: '⏸️ Music is already paused!', 
            ephemeral: true 
        });
    }
    
    queue.player.pause();
    
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⏸️ Paused')
        .setDescription(`Paused: **${queue.currentSong.title}**\nUse \`/music resume\` to continue`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleResume(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || !queue.currentSong) {
        return interaction.reply({ 
            content: '❌ No music is currently paused!', 
            ephemeral: true 
        });
    }
    
    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
        return interaction.reply({ 
            content: '▶️ Music is already playing!', 
            ephemeral: true 
        });
    }
    
    queue.player.unpause();
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('▶️ Resumed')
        .setDescription(`Resumed: **${queue.currentSong.title}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || !queue.currentSong) {
        return interaction.reply({ 
            content: '❌ No music is currently playing!', 
            ephemeral: true 
        });
    }
    
    const song = queue.currentSong;
    const progress = Math.floor((queue.player.state.playbackDuration / 1000) / song.duration * 20);
    const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${song.title}](${song.url})**`)
        .setThumbnail(song.thumbnail)
        .addFields(
            { name: 'Duration', value: `${formatDuration(Math.floor(queue.player.state.playbackDuration / 1000))} / ${formatDuration(song.duration)}`, inline: true },
            { name: 'Channel', value: song.channel, inline: true },
            { name: 'Requested by', value: song.requestedBy, inline: true },
            { name: 'Progress', value: `\`${progressBar}\``, inline: false }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction) {
    const queue = queues.get(interaction.guildId);
    
    if (!queue || queue.songs.length <= 1) {
        return interaction.reply({ 
            content: '❌ No songs in queue to clear!', 
            ephemeral: true 
        });
    }
    
    const clearedCount = queue.songs.length - 1;
    queue.songs = [queue.songs[0]]; // Keep current song
    
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🗑️ Queue Cleared')
        .setDescription(`Removed **${clearedCount}** song${clearedCount > 1 ? 's' : ''} from the queue`);
    
    await interaction.reply({ embeds: [embed] });
}

// Helper functions
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getTotalDuration(songs) {
    const totalSeconds = songs.reduce((total, song) => total + parseInt(song.duration), 0);
    return formatDuration(totalSeconds);
}