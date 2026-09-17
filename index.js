const { Client, WebhookClient, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js-selfbot-v13');
const http = require('http');
require('dotenv').config();

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Infine v1 Esports Tracker active.');
}).listen(process.env.PORT || 8000);

const client = new Client({ checkUpdate: false });
const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;

// Base Raw URL for your repo
const GITHUB_BASE = 'https://raw.githubusercontent.com/infine17/infine-egg-tracker/main/';

// Mapping dictionary matching all your uploaded .jfif files
const PET_IMAGES = {
  'arch angel': 'Arch%20Angel.jfif',
  'centaur': 'Centaur.jfif',
  'cerberus': 'Cerberus.jfif',
  'cosmic dragon': 'Cosmic%20Dragon.jfif',
  'el maja': 'El%20Maja.jfif',
  'ice dragon': 'Ice%20Dragon.jfif',
  'gargoyle': 'Gargoyle.jfif',
  'gorilla king': 'Gorilla%20King.jfif',
  'kitsune': 'Kitsune.jfif',
  'pure jellyfish': 'Jelly%20fish.jfif',
  'jelly fish': 'Jelly%20fish.jfif',
  'lunar dragon': 'Lunar%20Dragon.jfif',
  'kraken': 'Kraken.jfif',
  'lava dragon': 'Lava%20Dragon.jfif',
  'pegasus': 'Pegasus.jfif',
  'mosasaurus': 'mosasaurus.jfif',
  'night flame': 'Night%20Flame.jfif',
  'oni tiger': 'Oni%20Tiger.jfif',
  'pheonix': 'Pheonix.jfif',
  'phoenix': 'Pheonix.jfif',
  'razor fang': 'Razor%20Fang.jfif',
  'trex': 'Trex.jfif',
  't-rex': 'Trex.jfif',
  'skeleton boss': 'Skeleton%20Boss.jfif',
  'skeleton horse': 'Skeleton%20Horse.jfif',
  'snake king': 'Snake%20King.jfif',
  'stag': 'Stag.jfif',
  'tralaledon': 'Tralaledon.jfif',
  'unicorn': 'Unicorn.jfif',
  'world burner': 'World%20burner.jfif',
  'yeti': 'Yeti.jfif'
};

const DEFAULT_ICON = 'https://cdn-icons-png.flaticon.com/512/833/833593.png';

client.on('ready', () => {
  console.log(`Esports tracker active as: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  try {
    const original = message.embeds[0];

    let eggName = 'Unknown';
    let location = 'Unknown';
    let spawned = 'Just now';
    let income = 'N/A';
    let speed = 'N/A';
    let gameUrl = null;

    if (original.fields) {
      for (const field of original.fields) {
        const name = field.name.toLowerCase();
        const val = field.value;

        if (name.includes('egg')) eggName = val.replace(/egg/gi, '').trim();
        if (name.includes('location')) location = val.trim();
        if (name.includes('spawned')) spawned = val.trim();
        if (name.includes('money')) income = val.trim();
        if (name.includes('speed')) speed = val.trim();
        if (name.includes('join')) {
          const match = val.match(/https?:\/\/[^\s\)]+/);
          if (match) gameUrl = match[0];
        }
      }
    }

    // Dynamic Rarity Colors
    let embedColor = '#FFFFFF';
    const titleText = (original.title || '').toLowerCase();
    if (titleText.includes('divine')) embedColor = '#FFD700';
    else if (titleText.includes('eternal')) embedColor = '#00F0FF';
    else if (titleText.includes('secret')) embedColor = '#A855F7';

    // Locate clean custom image
    const lookupKey = eggName.toLowerCase();
    let selectedImage = DEFAULT_ICON;

    for (const [key, filename] of Object.entries(PET_IMAGES)) {
      if (lookupKey.includes(key) || key.includes(lookupKey)) {
        selectedImage = `${GITHUB_BASE}${filename}`;
        break;
      }
    }

    // Build Clean Esports Embed
    const esportsEmbed = new MessageEmbed()
      .setTitle(`🥚 Rare Spawn: ${eggName} Egg`)
      .setColor(embedColor)
      .addFields(
        { name: '📍 Location', value: `\`${location}\``, inline: true },
        { name: '💵 Income', value: `\`${income}\``, inline: true },
        { name: '⚡ Req. Speed', value: `\`${speed}\``, inline: true },
        { name: '⏱️ Spawned', value: `${spawned}`, inline: true }
      )
      .setThumbnail(selectedImage)
      .setFooter({ text: 'Infine v1 • Steal An Egg Tracker' })
      .setTimestamp();

    // Link Button for Roblox
    const components = [];
    if (gameUrl) {
      components.push(
        new MessageActionRow().addComponents(
          new MessageButton()
            .setLabel('Join Roblox Server')
            .setStyle('LINK')
            .setURL(gameUrl)
        )
      );
    }

    await webhook.send({
      username: 'Infine v1',
      embeds: [esportsEmbed],
      components: components.length > 0 ? components : []
    });

  } catch (err) {
    console.error('Tracker error:', err);
  }
});

client.login(process.env.USER_TOKEN);
