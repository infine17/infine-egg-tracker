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

const GITHUB_BASE = 'https://raw.githubusercontent.com/infine17/infine-egg-tracker/main/';

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
  console.log('Esports tracker active as: ' + client.user.tag);
});

client.on('messageCreate', async (message) => {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  try {
    const original = message.embeds[0];

    let descText = original.description ? original.description : '';
    let contentText = message.content ? message.content : '';
    let rawText = descText + '\n' + contentText;

    if (original.fields && original.fields.length > 0) {
      rawText += '\n' + original.fields.map(f => f.name + ': ' + f.value).join('\n');
    }

    // 1. Strip custom Discord emojis
    let cleanText = rawText.replace(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g, '');

    // 2. Strip bold and underline markdown
    cleanText = cleanText.replace(/\*\*/g, '').replace(/__/g, '');

    // 3. Targeted regex extractions
    const eggMatch = cleanText.match(/(?:^|\n|[^\w])Egg:\s*([^\n\r]+)/i);
    const locMatch = cleanText.match(/Location:\s*([^\n\r]+)/i);
    const spawnMatch = cleanText.match(/Spawned:\s*([^\n\r]+)/i);
    const moneyMatch = cleanText.match(/Money:\s*([^\n\r]+)/i);
    const speedMatch = cleanText.match(/(?:Recommended\s+)?Speed:\s*([^\n\r]+)/i);
    const urlMatch = rawText.match(/https?:\/\/[^\s\)\>]+/);

    const eggName = eggMatch ? eggMatch[1].replace(/egg/gi, '').trim() : 'Rare';
    const location = locMatch ? locMatch[1].trim() : 'Unknown';
    const spawned = spawnMatch ? spawnMatch[1].trim() : 'Just now';
    const income = moneyMatch ? moneyMatch[1].split(/recommended|speed/i)[0].trim() : 'N/A';
    const speed = speedMatch ? speedMatch[1].trim() : 'N/A';
    const gameUrl = urlMatch ? urlMatch[0] : null;

    // Dynamic Rarity Colors
    let embedColor = '#FFFFFF';
    const titleLower = (original.title ? original.title : '').toLowerCase();
    const fullLower = cleanText.toLowerCase();

    if (titleLower.includes('divine') || fullLower.includes('divine')) {
      embedColor = '#FFD700';
    } else if (titleLower.includes('eternal') || fullLower.includes('eternal')) {
      embedColor = '#00F0FF';
    } else if (titleLower.includes('secret') || fullLower.includes('secret')) {
      embedColor = '#A855F7';
    }

    // Match Clean Demon Image
    const lookupKey = eggName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    let selectedImage = DEFAULT_ICON;

    for (const [key, filename] of Object.entries(PET_IMAGES)) {
      if (lookupKey.includes(key) || key.includes(lookupKey)) {
        selectedImage = GITHUB_BASE + filename;
        break;
      }
    }

    // Build Esports Card
    const esportsEmbed = new MessageEmbed()
      .setTitle('🥚 Rare Spawn: ' + eggName + ' Egg')
      .setColor(embedColor)
      .addFields(
        { name: '📍 Location', value: '`' + location + '`', inline: true },
        { name: '💵 Income', value: '`' + income + '`', inline: true },
        { name: '⚡ Req. Speed', value: '`' + speed + '`', inline: true },
        { name: '⏱️ Spawned', value: spawned, inline: true }
      )
      .setThumbnail(selectedImage)
      .setFooter({ text: 'Infine v1 • Steal An Egg Tracker' })
      .setTimestamp();

    // Attach Clickable Join Button
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
