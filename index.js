const { Client, WebhookClient, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Infine v1 Dual Engine (Voice Dispatch + HUD) active.');
}).listen(process.env.PORT || 8000);

const client = new Client({ checkUpdate: false });
const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });

const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

// Fast tactical alert tone (2 seconds)
const SIREN_AUDIO_URL = 'https://cdn.freesound.org/previews/369/369840_6687661-lq.mp3';
const GITHUB_BASE = 'https://raw.githubusercontent.com/infine17/infine-egg-tracker/main/';

const PET_IMAGES = {
  'archangel': 'Arch%20Angel.jfif',
  'centaur': 'Centaur.jfif',
  'cerberus': 'Cerberus.jfif',
  'cosmicdragon': 'Cosmic%20Dragon.jfif',
  'elmaja': 'El%20Maja.jfif',
  'icedragon': 'Ice%20Dragon.jfif',
  'gargoyle': 'Gargoyle.jfif',
  'gorillaking': 'Gorilla%20King.jfif',
  'kingsnake': 'Snake%20King.jfif',
  'snakeking': 'Snake%20King.jfif',
  'kitsune': 'Kitsune.jfif',
  'purejellyfish': 'Jelly%20fish.jfif',
  'jellyfish': 'Jelly%20fish.jfif',
  'lunardragon': 'Lunar%20Dragon.jfif',
  'kraken': 'Kraken.jfif',
  'lavadragon': 'Lava%20Dragon.jfif',
  'pegasus': 'Pegasus.jfif',
  'mosasaurus': 'mosasaurus.jfif',
  'nightflame': 'Night%20Flame.jfif',
  'onitiger': 'Oni%20Tiger.jfif',
  'phoenix': 'Pheonix.jfif',
  'pheonix': 'Pheonix.jfif',
  'razorfang': 'Razor%20Fang.jfif',
  'trex': 'Trex.jfif',
  'skeletonboss': 'Skeleton%20Boss.jfif',
  'skeletonhorse': 'Skeleton%20Horse.jfif',
  'stag': 'Stag.jfif',
  'tralaledon': 'Tralaledon.jfif',
  'unicorn': 'Unicorn.jfif',
  'worldburner': 'World%20burner.jfif',
  'yeti': 'Yeti.jfif'
};

const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/833/833593.png';
const seenMessages = new Set();

client.on('ready', () => {
  console.log('Infine v1 Voice Dispatch active as: ' + client.user.tag);
});

// Chained Audio Routine: Siren -> Dynamic Voice Announcement -> Disconnect
async function triggerVoiceAlert(eggName, rarityTier, location) {
  if (!VOICE_CHANNEL_ID) return;

  try {
    const vc = await client.channels.fetch(VOICE_CHANNEL_ID);
    if (!vc || !vc.isVoice()) return;

    const connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    connection.subscribe(player);

    // Format spoken phrase (e.g. "Attention. Divine Ice Dragon egg sighted in Snow biome.")
    const spokenText = `Attention. ${rarityTier} ${eggName} egg sighted in ${location} biome.`;
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(spokenText)}`;

    const audioPlaylist = [
      createAudioResource(SIREN_AUDIO_URL),
      createAudioResource(ttsUrl)
    ];

    // Play siren first
    player.play(audioPlaylist.shift());

    player.on(AudioPlayerStatus.Idle, () => {
      if (audioPlaylist.length > 0) {
        // Siren finished: play the voice announcement
        player.play(audioPlaylist.shift());
      } else {
        // Both finished: leave VC cleanly
        setTimeout(() => {
          try { connection.destroy(); } catch (err) {}
        }, 1200);
      }
    });

    player.on('error', (err) => {
      console.error('Audio stream error:', err);
      try { connection.destroy(); } catch (e) {}
    });

  } catch (err) {
    console.error('VC Voice Dispatch failed:', err);
  }
}

client.on('messageCreate', async (message) => {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  if (seenMessages.has(message.id)) return;
  seenMessages.add(message.id);
  if (seenMessages.size > 100) {
    const firstItem = seenMessages.values().next().value;
    seenMessages.delete(firstItem);
  }

  try {
    const original = message.embeds[0];

    let descText = original.description || '';
    let contentText = message.content || '';
    let rawText = descText + '\n' + contentText;

    if (original.fields && original.fields.length > 0) {
      rawText += '\n' + original.fields.map(f => f.name + ': ' + f.value).join('\n');
    }

    // 1. Extract Roblox Link
    let gameUrl = null;
    if (message.components && message.components.length > 0) {
      for (const row of message.components) {
        for (const comp of row.components) {
          if (comp.url && (comp.url.includes('roblox.com') || comp.url.includes('share'))) {
            gameUrl = comp.url;
            break;
          }
        }
      }
    }
    if (!gameUrl && original.url) gameUrl = original.url;
    if (!gameUrl) {
      const match = rawText.match(/https?:\/\/[^\s\)\>]+/);
      if (match) gameUrl = match[0];
    }

    // 2. Parse Spawn Details
    let cleanText = rawText.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '').replace(/\*\*/g, '').replace(/__/g, '');
    const eggMatch = cleanText.match(/(?:^|\n|[^\w])Egg:\s*([^\n\r]+)/i);
    const locMatch = cleanText.match(/Location:\s*([^\n\r]+)/i);
    const spawnMatch = cleanText.match(/Spawned:\s*([^\n\r]+)/i);
    const moneyMatch = cleanText.match(/Money:\s*([^\n\r]+)/i);
    const speedMatch = cleanText.match(/(?:Recommended\s+)?Speed:\s*([^\n\r]+)/i);

    const eggName = eggMatch ? eggMatch[1].replace(/egg/gi, '').trim() : 'Rare';
    const location = locMatch ? locMatch[1].trim() : 'Unknown';
    const spawned = spawnMatch ? spawnMatch[1].trim() : 'Just now';
    const income = moneyMatch ? moneyMatch[1].split(/recommended|speed/i)[0].trim() : 'N/A';
    const speed = speedMatch ? speedMatch[1].trim() : 'N/A';

    // 3. Rarity & Roles
    let embedColor = '#FFFFFF';
    let rarityTier = 'Unknown';
    const titleLower = (original.title || '').toLowerCase();
    const fullLower = cleanText.toLowerCase();

    if (titleLower.includes('divine') || fullLower.includes('divine')) {
      rarityTier = 'Divine';
      embedColor = '#FFD700';
    } else if (titleLower.includes('eternal') || fullLower.includes('eternal')) {
      rarityTier = 'Eternal';
      embedColor = '#00F0FF';
    } else if (titleLower.includes('secret') || fullLower.includes('secret')) {
      rarityTier = 'Secret';
      embedColor = '#A855F7';
    }

    let mentionRole = '';
    if (rarityTier === 'Divine' && process.env.DIVINE_ROLE_ID) {
      mentionRole = `<@&${process.env.DIVINE_ROLE_ID}>`;
    } else if (rarityTier === 'Eternal' && process.env.ETERNAL_ROLE_ID) {
      mentionRole = `<@&${process.env.ETERNAL_ROLE_ID}>`;
    } else if (rarityTier === 'Secret' && process.env.SECRET_ROLE_ID) {
      mentionRole = `<@&${process.env.SECRET_ROLE_ID}>`;
    } else if (process.env.PING_ROLE_ID) {
      mentionRole = `<@&${process.env.PING_ROLE_ID}>`;
    }

    // 4. Asset Matcher
    const lookupKey = eggName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let selectedImage = DEFAULT_ICON;
    for (const [key, filename] of Object.entries(PET_IMAGES)) {
      if (lookupKey.includes(key) || key.includes(lookupKey)) {
        selectedImage = GITHUB_BASE + filename;
        break;
      }
    }

    // 5. Build Embed
    const joinText = gameUrl ? `[👉 **Click Here to Join Server**](${gameUrl})` : '*Link not detected*';
    const activeEmbed = new MessageEmbed()
      .setTitle('🥚 Rare Spawn: ' + eggName + ' Egg')
      .setColor(embedColor)
      .addFields(
        { name: '📍 Location', value: '`' + location + '`', inline: true },
        { name: '💵 Income', value: '`' + income + '`', inline: true },
        { name: '⚡ Req. Speed', value: '`' + speed + '`', inline: true },
        { name: '⏱️ Spawned', value: spawned, inline: true },
        { name: '🔗 Quick Join', value: joinText, inline: false }
      )
      .setThumbnail(selectedImage)
      .setFooter({ text: 'Infine v1 • Steal An Egg Tracker' })
      .setTimestamp();

    const components = [];
    if (gameUrl) {
      components.push(
        new MessageActionRow().addComponents(
          new MessageButton()
            .setLabel('Join Roblox Game')
            .setStyle('LINK')
            .setURL(gameUrl)
        )
      );
    }

    // 6. Send Webhook Alert
    const postPayload = {
      username: 'Infine v1',
      embeds: [activeEmbed],
      components: components.length > 0 ? components : [],
      allowedMentions: { parse: ['roles', 'users'] }
    };

    if (mentionRole) {
      postPayload.content = `${mentionRole} 🚨 **${rarityTier} Egg Spawned: ${eggName}!**`;
    }

    const sentMessage = await webhook.send(postPayload);

    // 7. Fire Chained Voice Dispatch (Siren -> TTS)
    if (['Divine', 'Eternal', 'Secret'].includes(rarityTier)) {
      triggerVoiceAlert(eggName, rarityTier, location);
    }

    // 8. Expire Message After 4m 30s
    if (sentMessage && sentMessage.id) {
      setTimeout(async () => {
        try {
          const expiredEmbed = new MessageEmbed()
            .setTitle('💀 DESPAWNED: ' + eggName + ' Egg')
            .setColor('#4F545C')
            .setDescription('*The 5-minute nest cycle has concluded. This egg is no longer in the biome.*')
            .addFields(
              { name: '📍 Location', value: '`' + location + '`', inline: true },
              { name: '⏳ Status', value: '`CYCLE ENDED`', inline: true }
            )
            .setThumbnail(selectedImage)
            .setFooter({ text: 'Infine v1 • Spawn Expired' })
            .setTimestamp();

          await webhook.editMessage(sentMessage.id, {
            content: mentionRole ? `~~${mentionRole} 🚨 ${rarityTier} Egg Spawned: ${eggName}!~~ *(Despawned)*` : '~~Spawn Alert~~ *(Despawned)*',
            embeds: [expiredEmbed],
            components: []
          });
        } catch (editErr) {
          console.error('Failed to auto-expire embed:', editErr);
        }
      }, 270 * 1000);
    }

  } catch (err) {
    console.error('Tracker error:', err);
  }
});

client.login(process.env.USER_TOKEN);
