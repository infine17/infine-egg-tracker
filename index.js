const { Client, WebhookClient, MessageEmbed } = require('discord.js-selfbot-v13');
const http = require('http');
require('dotenv').config();

// HTTP server for Render web service health checks
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Infine v1 Dual Tracker Online');
}).listen(process.env.PORT || 8000);

const client = new Client({ checkUpdate: false });

// Webhook Clients
const EGG_WEBHOOK_URL = (process.env.WEBHOOK_URL || '').trim();
const EVENT_WEBHOOK_URL = (process.env.EVENT_WEBHOOK_URL || '').trim();

const eggWebhook = EGG_WEBHOOK_URL ? new WebhookClient({ url: EGG_WEBHOOK_URL }) : null;
const eventWebhook = EVENT_WEBHOOK_URL ? new WebhookClient({ url: EVENT_WEBHOOK_URL }) : null;

// Channel IDs
const SOURCE_CHANNEL_ID = (process.env.SOURCE_CHANNEL_ID || '').trim();
const EVENT_SOURCE_CHANNEL_ID = (process.env.EVENT_SOURCE_CHANNEL_ID || '').trim();

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
  console.log(`[BOOT] Infine v1 active as: ${client.user.tag}`);
  console.log(`[CHANNELS] Monitoring Eggs: "${SOURCE_CHANNEL_ID}" \vert{} Events: "${EVENT_SOURCE_CHANNEL_ID}"`);
});

client.on('messageCreate', async (message) => {
  const currentChan = message.channelId ? message.channelId.trim() : '';

  if (currentChan !== SOURCE_CHANNEL_ID && currentChan !== EVENT_SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  if (seenMessages.has(message.id)) return;
  seenMessages.add(message.id);
  if (seenMessages.size > 200) {
    const oldest = seenMessages.values().next().value;
    seenMessages.delete(oldest);
  }

  try {
    const original = message.embeds[0];

    // ==========================================
    // PIPELINE 1: EXPERIMENTS & RIFT NOTIFICATIONS
    // ==========================================
    if (currentChan === EVENT_SOURCE_CHANNEL_ID) {
      if (!eventWebhook) return;

      let rawText = (original.description || '') + '\n' + (message.content || '');
      if (original.fields && original.fields.length > 0) {
        rawText += '\n' + original.fields.map(f => f.name + ': ' + f.value).join('\n');
      }

      let gameUrl = null;
      if (original.url) gameUrl = original.url;
      if (!gameUrl) {
        const match = rawText.match(/https?:\/\/[^\s\)\>]+/);
        if (match) gameUrl = match[0];
      }

      const isExperiment = (original.title || '').toLowerCase().includes('experiment') || rawText.toLowerCase().includes('experiment');
      const embedColor = isExperiment ? 0x00FF88 : 0x9B59B6;

      let experimentName = 'Dr. Scramble';
      const scrambleMatch = rawText.match(/(Dr\.?\s*[A-Za-z0-9]+)/i);
      if (scrambleMatch) {
        experimentName = scrambleMatch[1].trim();
      } else {
        const expMatch = rawText.match(/([A-Za-z0-9\.\s]+?)\s+Experiment\s+has\s+appeared/i);
        if (expMatch && !expMatch[1].toLowerCase().includes('forbidden')) {
          experimentName = expMatch[1].trim();
        }
      }

      const timerMatch = rawText.match(/(?:Next\s+experiment\s+in|Next\s+Change):\s*([^\n\r]+)/i);
      let nextTimer = timerMatch ? timerMatch[1].trim() : 'Active Now';

      const joinText = gameUrl ? `>>> 🚀 [**TAP HERE TO JOIN SERVER**](${gameUrl})` : '*Link not detected*';

      const eventEmbed = new MessageEmbed()
        .setTitle(isExperiment ? '🧪 A Forbidden Experiment Has Appeared!' : '🌀 Rift Dimension Shift')
        .setColor(embedColor)
        .setFooter({ text: 'Infine v1 • Steal An Egg Event Dispatch' })
        .setTimestamp();

      if (original.thumbnail && original.thumbnail.url) {
        eventEmbed.setThumbnail(original.thumbnail.url);
      } else if (original.image && original.image.url) {
        eventEmbed.setThumbnail(original.image.url);
      }

      if (isExperiment) {
        eventEmbed.addFields(
          { name: '🧪 Experiment', value: `\`${experimentName}\``, inline: true },
          { name: '⚡ Status', value: '`🟢 ACTIVE NOW`', inline: true },
          { name: '⏳ Next Experiment', value: nextTimer, inline: false },
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        );
      } else {
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
          { name: '⏳ Next Dimension Shift', value: nextTimer, inline: false },
          { name: '📦 Possible Drops', value: formattedDrops, inline: false },
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        );
      }

      const postPayload = {
        username: 'Infine v1',
        embeds: [eventEmbed],
        allowedMentions: { parse: ['roles', 'users'] }
      };

      if (process.env.EVENT_ROLE_ID) {
        postPayload.content = `<@&${process.env.EVENT_ROLE_ID.trim()}> 🚨 **${isExperiment ? `Forbidden Experiment: ${experimentName}!` : 'Rift Event Shift!'}**`;
      }

      await eventWebhook.send(postPayload);
      console.log(`[DISPATCH] Event posted: ${experimentName}`);
      return;
    }

    // ==========================================
    // PIPELINE 2: STANDARD EGG SPAWN TRACKER
    // ==========================================
    if (currentChan === SOURCE_CHANNEL_ID) {
      if (!eggWebhook) {
        console.error('[CONFIG ERROR] WEBHOOK_URL is missing in environment variables.');
        return;
      }

      let descText = original.description || '';
      let contentText = message.content || '';
      let rawText = descText + '\n' + contentText;

      if (original.fields && original.fields.length > 0) {
        rawText += '\n' + original.fields.map(f => (f.name || '') + ': ' + (f.value || '')).join('\n');
      }

      // Extract Join URL safely from links or description
      let gameUrl = null;
      if (original.url) gameUrl = original.url;
      if (!gameUrl) {
        const match = rawText.match(/https?:\/\/[^\s\)\>]+/);
        if (match) gameUrl = match[0];
      }

      // Safe clean text parser
      let cleanText = rawText.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '').replace(/\*\*/g, '').replace(/__/g, '');
      const eggMatch = cleanText.match(/(?:^|\n|[^\w])Egg:\s*([^\n\r]+)/i);
      const locMatch = cleanText.match(/Location:\s*([^\n\r]+)/i);
      const spawnMatch = cleanText.match(/Spawned:\s*([^\n\r]+)/i);
      const moneyMatch = cleanText.match(/Money:\s*([^\n\r]+)/i);
      const speedMatch = cleanText.match(/(?:Recommended\s+)?Speed:\s*([^\n\r]+)/i);

      let eggName = eggMatch ? eggMatch[1].replace(/egg/gi, '').trim() : 'Rare';
      if (!eggName) eggName = 'Rare';

      const location = locMatch ? locMatch[1].trim() : 'Unknown';
      const spawned = spawnMatch ? spawnMatch[1].trim() : 'Just now';
      const income = moneyMatch ? moneyMatch[1].split(/recommended|speed/i)[0].trim() : 'N/A';
      const speed = speedMatch ? speedMatch[1].trim() : 'N/A';

      // Determine Rarity Tier
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

      // Role Mentions
      let mentionRole = '';
      if (rarityTier === 'Divine' && process.env.DIVINE_ROLE_ID) {
        mentionRole = `<@&${process.env.DIVINE_ROLE_ID.trim()}>`;
      } else if (rarityTier === 'Eternal' && process.env.ETERNAL_ROLE_ID) {
        mentionRole = `<@&${process.env.ETERNAL_ROLE_ID.trim()}>`;
      } else if (rarityTier === 'Secret' && process.env.SECRET_ROLE_ID) {
        mentionRole = `<@&${process.env.SECRET_ROLE_ID.trim()}>`;
      } else if (process.env.PING_ROLE_ID) {
        mentionRole = `<@&${process.env.PING_ROLE_ID.trim()}>`;
      }

      // Thumbnail Matching (fallback to source image if local asset doesn't exist)
      const lookupKey = eggName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let selectedImage = DEFAULT_ICON;
      let matchedLocal = false;

      for (const [key, filename] of Object.entries(PET_IMAGES)) {
        if (lookupKey.includes(key) || key.includes(lookupKey)) {
          selectedImage = GITHUB_BASE + filename;
          matchedLocal = true;
          break;
        }
      }

      if (!matchedLocal) {
        if (original.thumbnail && original.thumbnail.url) {
          selectedImage = original.thumbnail.url;
        } else if (original.image && original.image.url) {
          selectedImage = original.image.url;
        }
      }

      const joinText = gameUrl ? `>>> 🚀 [**TAP HERE TO JOIN SERVER**](${gameUrl})` : '*Link not detected*';

      const activeEmbed = new MessageEmbed()
        .setTitle(`🥚 Rare Spawn: ${eggName} Egg`)
        .setColor(embedColor)
        .addFields(
          { name: '📍 Location', value: `\`${location || 'Unknown'}\``, inline: true },
          { name: '💵 Income', value: `\`${income || 'N/A'}\``, inline: true },
          { name: '⚡ Req. Speed', value: `\`${speed || 'N/A'}\``, inline: true },
          { name: '⏱️ Spawned', value: spawned || 'Just now', inline: true },
          { name: '🔗 Quick Teleport', value: joinText, inline: false }
        )
        .setThumbnail(selectedImage)
        .setFooter({ text: 'Infine v1 • Steal An Egg Tracker' })
        .setTimestamp();

      const postPayload = {
        username: 'Infine v1',
        embeds: [activeEmbed],
        allowedMentions: { parse: ['roles', 'users'] }
      };

      if (mentionRole) {
        postPayload.content = `${mentionRole} 🚨 **${rarityTier} Egg Spawned: ${eggName}!**`;
      }

      // Dispatched without raw components to ensure Discord API acceptance
      await eggWebhook.send(postPayload);
      console.log(`[DISPATCH] Egg posted: ${eggName} (${rarityTier})`);
    }

  } catch (err) {
    console.error('[TRACKER ERROR]', err);
  }
});

client.login((process.env.USER_TOKEN || '').trim());
