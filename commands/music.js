const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('🎵 Complete music control system')
        .addSubcommand(sub => sub
            .setName('play')
            .setDescription('Play a song or playlist')
            .addStringOption(opt => opt
                .setName('query')
                .setDescription('Song name, URL, or playlist link')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('skip')
            .setDescription('Skip the current song')
        )
        .addSubcommand(sub => sub
            .setName('stop')
            .setDescription('Stop music and clear the queue')
        )
        .addSubcommand(sub => sub
            .setName('pause')
            .setDescription('Pause the current playback')
        )
        .addSubcommand(sub => sub
            .setName('resume')
            .setDescription('Resume the paused playback')
        )
        .addSubcommand(sub => sub
            .setName('queue')
            .setDescription('Show the current song queue')
            .addIntegerOption(opt => opt
                .setName('page')
                .setDescription('Page number')
                .setMinValue(1)
            )
        )
        .addSubcommand(sub => sub
            .setName('nowplaying')
            .setDescription('Show currently playing song')
        )
        .addSubcommand(sub => sub
            .setName('clear')
            .setDescription('Clear the entire queue')
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a specific song from queue')
            .addIntegerOption(opt => opt
                .setName('position')
                .setDescription('Position in queue')
                .setRequired(true)
                .setMinValue(1)
            )
        )
        .addSubcommand(sub => sub
            .setName('shuffle')
            .setDescription('Shuffle the queue')
        )
        .addSubcommand(sub => sub
            .setName('loop')
            .setDescription('Toggle loop mode')
            .addStringOption(opt => opt
                .setName('mode')
                .setDescription('Loop mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
            )
        )
        .addSubcommand(sub => sub
            .setName('volume')
            .setDescription('Adjust playback volume')
            .addIntegerOption(opt => opt
                .setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
            )
        )
        .addSubcommand(sub => sub
            .setName('seek')
            .setDescription('Seek to a position in the song')
            .addStringOption(opt => opt
                .setName('position')
                .setDescription('Position (1:30 or 90s format)')
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('lyrics')
            .setDescription('Get lyrics for current song')
        )
        .addSubcommand(sub => sub
            .setName('move')
            .setDescription('Move a song to a different position')
            .addIntegerOption(opt => opt
                .setName('from')
                .setDescription('Current position')
                .setRequired(true)
                .setMinValue(1)
            )
            .addIntegerOption(opt => opt
                .setName('to')
                .setDescription('New position')
                .setRequired(true)
                .setMinValue(1)
            )
        )
        .addSubcommand(sub => sub
            .setName('jump')
            .setDescription('Jump to a specific song in queue')
            .addIntegerOption(opt => opt
                .setName('position')
                .setDescription('Position in queue')
                .setRequired(true)
                .setMinValue(1)
            )
        )
        .addSubcommand(sub => sub
            .setName('rewind')
            .setDescription('Go back to previous song')
        )
        .addSubcommand(sub => sub
            .setName('export')
            .setDescription('Export current queue as playlist')
        ),
    
    async execute(interaction, lavalink) {
        const subcommand = interaction.options.getSubcommand();
        
        switch(subcommand) {
            case 'play':
                await handlePlay(interaction, lavalink);
                break;
            case 'skip':
                await handleSkip(interaction, lavalink);
                break;
            case 'stop':
                await handleStop(interaction, lavalink);
                break;
            case 'pause':
                await handlePause(interaction, lavalink);
                break;
            case 'resume':
                await handleResume(interaction, lavalink);
                break;
            case 'queue':
                await handleQueue(interaction, lavalink);
                break;
            case 'nowplaying':
                await handleNowPlaying(interaction, lavalink);
                break;
            case 'clear':
                await handleClear(interaction, lavalink);
                break;
            case 'remove':
                await handleRemove(interaction, lavalink);
                break;
            case 'shuffle':
                await handleShuffle(interaction, lavalink);
                break;
            case 'loop':
                await handleLoop(interaction, lavalink);
                break;
            case 'volume':
                await handleVolume(interaction, lavalink);
                break;
            case 'seek':
                await handleSeek(interaction, lavalink);
                break;
            case 'lyrics':
                await handleLyrics(interaction, lavalink);
                break;
            case 'move':
                await handleMove(interaction, lavalink);
                break;
            case 'jump':
                await handleJump(interaction, lavalink);
                break;
            case 'rewind':
                await handleRewind(interaction, lavalink);
                break;
            case 'export':
                await handleExport(interaction, lavalink);
                break;
        }
    }
};

async function handlePlay(interaction, lavalink) {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;
    
    if (!voiceChannel) {
        return interaction.reply({ 
            content: '❌ You need to be in a voice channel!', 
            ephemeral: true 
        });
    }
    
    await interaction.reply({ content: `🔍 Loading: **${query}**...` });
    
    let player = lavalink.getPlayer(interaction.guildId);
    
    if (!player) {
        player = await lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
            deaf: true,
        });
    }
    
    const result = await lavalink.resolve({ 
        query, 
        requester: interaction.user,
        source: query.includes('spotify.com') ? 'spsearch' : undefined
    });
    
    if (!result || !result.tracks.length) {
        return interaction.editReply({ content: '❌ No results found!' });
    }
    
    if (result.loadType === 'PLAYLIST_LOADED') {
        player.queue.addBulk(result.tracks);
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📀 Playlist Added')
            .setDescription(`**${result.playlistInfo.name}**`)
            .addFields(
                { name: 'Tracks', value: `${result.tracks.length} songs`, inline: true },
                { name: 'Duration', value: formatDuration(result.tracks.reduce((acc, t) => acc + t.info.length, 0)), inline: true },
                { name: 'Position', value: `${player.queue.length} total`, inline: true }
            )
            .setFooter({ text: `Added by ${interaction.user.tag}` });
        await interaction.editReply({ content: null, embeds: [embed] });
    } else {
        const track = result.tracks[0];
        player.queue.add(track);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Added to Queue')
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .setThumbnail(`https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`)
            .addFields(
                { name: 'Artist', value: track.info.author, inline: true },
                { name: 'Duration', value: formatDuration(track.info.length), inline: true },
                { name: 'Position', value: `${player.queue.length}`, inline: true },
                { name: 'Requested by', value: interaction.user.tag, inline: true }
            );
        await interaction.editReply({ content: null, embeds: [embed] });
    }
    
    if (!player.playing && !player.paused) {
        await player.play();
        
        const nowPlaying = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${player.queue.current.info.title}](${player.queue.current.info.uri})**`)
            .setThumbnail(`https://img.youtube.com/vi/${player.queue.current.info.identifier}/hqdefault.jpg`);
        
        await interaction.channel.send({ embeds: [nowPlaying] });
    }
}

async function handleSkip(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.playing) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    const skipped = player.queue.current;
    await player.stop();
    
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⏭️ Skipped')
        .setDescription(`**${skipped.info.title}**`)
        .setFooter({ text: player.queue.length ? `${player.queue.length} songs remaining` : 'Queue is now empty' });
    
    await interaction.reply({ embeds: [embed] });
}

async function handleStop(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player) {
        return interaction.reply({ content: '❌ No music is playing!', ephemeral: true });
    }
    
    player.queue.clear();
    await player.destroy();
    
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('⏹️ Stopped')
        .setDescription('Music stopped and queue cleared!');
    
    await interaction.reply({ embeds: [embed] });
}

async function handlePause(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.playing) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    if (player.paused) {
        return interaction.reply({ content: '⏸️ Already paused!', ephemeral: true });
    }
    
    await player.pause();
    await interaction.reply('⏸️ Playback paused');
}

async function handleResume(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.paused) {
        return interaction.reply({ content: '❌ Music is not paused!', ephemeral: true });
    }
    
    await player.resume();
    await interaction.reply('▶️ Playback resumed');
}

async function handleQueue(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const page = interaction.options.getInteger('page') || 1;
    const itemsPerPage = 10;
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '📭 Queue is empty!', ephemeral: true });
    }
    
    const totalPages = Math.ceil(player.queue.length / itemsPerPage);
    if (page > totalPages) {
        return interaction.reply({ content: `❌ Page ${page} doesn't exist! Max page: ${totalPages}`, ephemeral: true });
    }
    
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const queueList = player.queue.slice(start, end).map((track, i) => {
        const position = start + i + 1;
        return `**${position}.** [${track.info.title}](${track.info.uri}) - \`${formatDuration(track.info.length)}\`\n└ Requested by: ${track.requester?.username || 'Unknown'}`;
    }).join('\n\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Music Queue')
        .setDescription(queueList || 'No songs in queue')
        .addFields(
            { name: 'Now Playing', value: `[${player.queue.current?.info.title}](${player.queue.current?.info.uri})`, inline: false },
            { name: 'Total Songs', value: `${player.queue.length}`, inline: true },
            { name: 'Total Duration', value: getTotalDuration(player.queue), inline: true },
            { name: 'Page', value: `${page}/${totalPages}`, inline: true }
        )
        .setFooter({ text: `Loop: ${player.loop || 'Off'} | Volume: ${player.volume || 100}%` });
    
    await interaction.reply({ embeds: [embed] });
}

async function handleNowPlaying(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.playing) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    const track = player.queue.current;
    const position = player.position || 0;
    const duration = track.info.length;
    const progress = Math.floor((position / duration) * 20);
    const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.info.title}](${track.info.uri})**`)
        .setThumbnail(`https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`)
        .addFields(
            { name: 'Artist', value: track.info.author, inline: true },
            { name: 'Duration', value: `${formatDuration(position)} / ${formatDuration(duration)}`, inline: true },
            { name: 'Volume', value: `${player.volume || 100}%`, inline: true },
            { name: 'Loop', value: player.loop || 'Off', inline: true },
            { name: 'Progress', value: `\`${progressBar}\``, inline: false },
            { name: 'Requested by', value: track.requester?.tag || 'Unknown', inline: true }
        );
    
    await interaction.reply({ embeds: [embed] });
}

async function handleClear(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is already empty!', ephemeral: true });
    }
    
    const count = player.queue.length;
    player.queue.clear();
    
    const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🗑️ Queue Cleared')
        .setDescription(`Removed **${count}** song${count > 1 ? 's' : ''} from queue`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const position = interaction.options.getInteger('position');
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
    }
    
    if (position > player.queue.length) {
        return interaction.reply({ content: `❌ Position ${position} doesn't exist! Max: ${player.queue.length}`, ephemeral: true });
    }
    
    const removed = player.queue.remove(position - 1);
    
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🗑️ Song Removed')
        .setDescription(`Removed: **${removed[0].info.title}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleShuffle(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
    }
    
    player.queue.shuffle();
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔀 Queue Shuffled')
        .setDescription(`Shuffled **${player.queue.length}** songs`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleLoop(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const mode = interaction.options.getString('mode');
    
    if (!player) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    player.setLoop(mode);
    
    const modeEmoji = {
        'off': '➡️',
        'track': '🔂',
        'queue': '🔁'
    };
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`${modeEmoji[mode]} Loop Mode`)
        .setDescription(`Loop mode set to: **${mode.toUpperCase()}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleVolume(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const level = interaction.options.getInteger('level');
    
    if (!player) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    await player.setVolume(level);
    
    const volumeBar = '🔊'.repeat(Math.floor(level / 10)) + '🔇'.repeat(10 - Math.floor(level / 10));
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔊 Volume Changed')
        .setDescription(`${volumeBar} **${level}%**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleSeek(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const position = interaction.options.getString('position');
    
    if (!player || !player.playing) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    let ms;
    if (position.includes(':')) {
        const parts = position.split(':');
        ms = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
    } else if (position.endsWith('s')) {
        ms = parseInt(position) * 1000;
    } else {
        ms = parseInt(position) * 1000;
    }
    
    if (ms > player.queue.current.info.length) {
        return interaction.reply({ content: '❌ Position exceeds song duration!', ephemeral: true });
    }
    
    await player.seek(ms);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('⏩ Seeked')
        .setDescription(`Moved to: **${formatDuration(ms)}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleLyrics(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.playing) {
        return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }
    
    await interaction.reply({ content: '🔍 Searching for lyrics...' });
    
    const track = player.queue.current;
    const query = `${track.info.title} ${track.info.author}`;
    
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(track.info.author)}/${encodeURIComponent(track.info.title)}`);
        const data = await response.json();
        
        if (data.lyrics) {
            const lyricsChunks = splitLyrics(data.lyrics);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🎤 Lyrics: ${track.info.title}`)
                .setDescription(lyricsChunks[0])
                .setFooter({ text: `Artist: ${track.info.author}` });
            
            await interaction.editReply({ content: null, embeds: [embed] });
        } else {
            await interaction.editReply({ content: '❌ No lyrics found!' });
        }
    } catch (error) {
        await interaction.editReply({ content: '❌ Could not fetch lyrics!' });
    }
}

async function handleMove(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const from = interaction.options.getInteger('from');
    const to = interaction.options.getInteger('to');
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
    }
    
    if (from > player.queue.length || to > player.queue.length) {
        return interaction.reply({ content: '❌ Invalid position!', ephemeral: true });
    }
    
    const track = player.queue.remove(from - 1);
    player.queue.add(track[0], to - 1);
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Song Moved')
        .setDescription(`Moved **${track[0].info.title}** to position ${to}`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleJump(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    const position = interaction.options.getInteger('position');
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
    }
    
    if (position > player.queue.length) {
        return interaction.reply({ content: `❌ Position ${position} doesn't exist!`, ephemeral: true });
    }
    
    const track = player.queue.remove(position - 1);
    player.queue.unshift(track[0]);
    await player.stop();
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎵 Jumped to Song')
        .setDescription(`Now playing: **${track[0].info.title}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleRewind(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.previousTracks || !player.previousTracks.length) {
        return interaction.reply({ content: '❌ No previous song!', ephemeral: true });
    }
    
    const previous = player.previousTracks[player.previousTracks.length - 1];
    player.queue.unshift(previous);
    await player.stop();
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('⏪ Rewound')
        .setDescription(`Now playing: **${previous.info.title}**`);
    
    await interaction.reply({ embeds: [embed] });
}

async function handleExport(interaction, lavalink) {
    const player = lavalink.getPlayer(interaction.guildId);
    
    if (!player || !player.queue.length) {
        return interaction.reply({ content: '❌ Queue is empty!', ephemeral: true });
    }
    
    const playlist = player.queue.map((track, i) => `${i+1}. ${track.info.title} - ${track.info.author}\n   ${track.info.uri}`).join('\n\n');
    
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📋 Queue Export')
        .setDescription(`\`\`\`\n${playlist.substring(0, 4000)}\n\`\`\``)
        .setFooter({ text: `${player.queue.length} songs exported` });
    
    await interaction.reply({ embeds: [embed] });
}

// Helper functions
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getTotalDuration(queue) {
    const totalMs = queue.reduce((acc, track) => acc + track.info.length, 0);
    return formatDuration(totalMs);
}

function splitLyrics(lyrics) {
    const chunks = [];
    let current = '';
    const lines = lyrics.split('\n');
    
    for (const line of lines) {
        if ((current + line).length > 4000) {
            chunks.push(current);
            current = line + '\n';
        } else {
            current += line + '\n';
        }
    }
    
    if (current) chunks.push(current);
    return chunks;
}