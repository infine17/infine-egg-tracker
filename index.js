const { Client, WebhookClient, MessageEmbed } = require('discord.js-selfbot-v13');
const http = require('http');
require('dotenv').config();

// Keep-alive HTTP server for Render web service
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Infine v1 Multi-Tracker Active');
}).listen(process.env.PORT || 8000);

const client = new Client({ checkUpdate: false });

// Webhook Clients
const eggWebhook = new WebhookClient({ url: process.env.WEBHOOK_URL });
const eventWebhook = process.env.EVENT_WEBHOOK_URL ? new WebhookClient({ url: process.env.EVENT_WEBHOOK_URL }) : null;

// Source Channel IDs
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const EVENT_SOURCE_CHANNEL_ID = process.env.EVENT_SOURCE_CHANNEL_ID;

const GITHUB_BASE = '[https://raw.githubusercontent.com/infine17/infine-egg-tracker/main/](https://raw.githubusercontent.com/infine17/infine-egg-tracker/main/)';

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

const DEFAULT_ICON = '[https://cdn-icons-png.flaticon.com/512/833/833593.png](https://cdn-icons-png.flaticon.com/512/833/833593.png)';
const seenMessages = new Set();

client.on('ready', () => {
  console.log(`Infine v1 active as: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.channelId !== SOURCE_CHANNEL_ID && message.channelId !== EVENT_SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  // Deduplicate incoming alerts
  if (seenMessages.has(message.id)) return;
  seenMessages.add(message.id);
  if (seenMessages.size > 150) {
    const firstItem = seenMessages.values().next().value;
    seenMessages.delete(firstItem);
  }

  try {
    const original = message.embeds[0];

    // ==========================================
    // PIPELINE 1: EXPERIMENT & RIFT EVENTS
    // ==========================================
    if (message.channelId === EVENT_SOURCE_CHANNEL_ID) {
      if (!eventWebhook) return;

      let rawText = (original.description || '') + '\n' + (message.content || '');
      if (original.fields && original.fields.length > 0) {
        rawText += '\n' + original.fields.map(f => f.name + ': ' + f.value).join('\n');
      }

      // 1. Extract Roblox Game Link
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

      const isExperiment = (original.title || '').toLowerCase().includes('experiment') || rawText.toLowerCase().includes('experiment');
      const embedColor = isExperiment ? 0x00FF88 : 0x9B59B6;

      // Extract Event Name
      const expMatch = rawText.match(/([A-Za-z0-9\.\s]+?)\s+Experiment\s+has\s+appeared/i);
      const experimentName = expMatch ? expMatch[1].trim() : 'Dr. Scramble';

      // Extract Raw Discord Timestamp (DO NOT WRAP IN BACKTICKS)
      const timerMatch = rawText.match(/(?:Next\s+experiment\s+in|Next\s+Change):\s*([^\n\r]+)/i);
      let nextTimer = timerMatch ? timerMatch[1].trim() : 'Active Now';

      // Clean mobile join CTA
      const joinText = gameUrl ? `>>> 🚀 [**TAP HERE TO JOIN SERVER**](${gameUrl})` : '*Link not detected*';

      const eventEmbed = new MessageEmbed()
        .setTitle(isExperiment ? `🧪 A Forbidden Experiment Has Appeared!` : `🌀 Rift Dimension Shift`)
        .setColor(embedColor)
        .setFooter({ text: 'Infine v1 • Steal An Egg Event Dispatch' })
        .setTimestamp();

      // Use source image asset
      if (original.thumbnail && original.thumbnail.url) {
        eventEmbed.setThumbnail(original.thumbnail.url);
      } else if (original.image && original.image.url) {
        eventEmbed.setThumbnail(original.image.url);
      }

      if (isExperiment) {
        eventEmbed.addFields(
          { name: '🧪 Experiment', value: `\`${experimentName}\``, inline: true },
          { name: '⚡ Status', value: '`🟢 ACTIVE NOW`', inline: true },
          { name: '⏳ Next Experiment', value: nextTimer, inline: false }, // No backticks: enables native Discord countdown
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        );
      } else {
        // Parse pet drop list into clean Discord quotes
        const petsMatch = rawText.match(/Possible\s+Pets:?([\s\S]*?)(?:Join\s+Game|Next|$)/i);
        let formattedDrops = '';
        if (petsMatch) {
          const lines = petsMatch[1].trim().split('\n');
          formattedDrops = lines
            .map(l => {
              let cleaned = l.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '').replace(/[\*\_'`]/g, '').trim();
              return cleaned ? `> ${cleaned}` : null;
            })
            .filter(Boolean)
            .join('\n');
        }
        if (!formattedDrops) formattedDrops = '> *Check in-game dimension portal*';

        eventEmbed.addFields(
          { name: '🌀 Dimension', value: '`🟣 STABLE`', inline: true },
          { name: '⚡ Status', value: '`🟢 OPEN NOW`', inline: true },
          { name: '⏳ Next Dimension Shift', value: nextTimer, inline: false }, // No backticks: live timer
          { name: '📦 Possible Drops', value: formattedDrops, inline: false },
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        );
      }

      // Raw action-row payload for universal mobile support
      const components = [];
      if (gameUrl) {
        components.push({
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: isExperiment ? '🧪 Join Experiment Server' : '🌀 Teleport to Rift',
              url: gameUrl
            }
          ]
        });
      }

      const postPayload = {
        username: 'Infine v1',
        embeds: [eventEmbed],
        components: components.length > 0 ? components : [],
        allowedMentions: { parse: ['roles', 'users'] }
      };

      if (process.env.EVENT_ROLE_ID) {
        postPayload.content = `<@&${process.env.EVENT_ROLE_ID}> 🚨 **${isExperiment ? `Forbidden Experiment: ${experimentName}!` : 'Rift Event Shift!'}**`;
      }

      await eventWebhook.send(postPayload);
      return;
    }

    // ==========================================
    // PIPELINE 2: STANDARD EGG SPAWN TRACKER
    // ==========================================
    if (message.channelId === SOURCE_CHANNEL_ID) {
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

      // 2. Parse Egg Details
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

      // 3. Rarity Tiers & Dynamic Accent Colors
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

      // 4. Match Local Asset Image
      const lookupKey = eggName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let selectedImage = DEFAULT_ICON;
      for (const [key, filename] of Object.entries(PET_IMAGES)) {
        if (lookupKey.includes(key) || key.includes(lookupKey)) {
          selectedImage = GITHUB_BASE + filename;
          break;
        }
      }

      const joinText = gameUrl ? `>>> 🚀 [**TAP HERE TO JOIN SERVER**](${gameUrl})` : '*Link not detected*';

      const activeEmbed = new MessageEmbed()
        .setTitle(`🥚 Rare Spawn: ${eggName} Egg`)
        .setColor(embedColor)
        .addFields(
          { name: '📍 Location', value: `\`${location}\``, inline: true },
          { name: '💵 Income', value: `\`${income}\``, inline: true },
          { name: '⚡ Req. Speed', value: `\`${speed}\``, inline: true },
          { name: '⏱️ Spawned', value: spawned, inline: true },
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        )
        .setThumbnail(selectedImage)
        .setFooter({ text: 'Infine v1 • Steal An Egg Tracker' })
        .setTimestamp();

      const components = [];
      if (gameUrl) {
        components.push({
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: 'Join Roblox Game',
              url: gameUrl
            }
          ]
        });
      }

      const postPayload = {
        username: 'Infine v1',
        embeds: [activeEmbed],
        components: components.length > 0 ? components : [],
        allowedMentions: { parse: ['roles', 'users'] }
      };

      if (mentionRole) {
        postPayload.content = `${mentionRole} 🚨 **${rarityTier} Egg Spawned: ${eggName}!**`;
      }

      await eggWebhook.send(postPayload);
    }

  } catch (err) {
    console.error('Tracker error:', err);
  }
});

client.login(process.env.USER_TOKEN);
