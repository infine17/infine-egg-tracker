const { Client, WebhookClient, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js-selfbot-v13');
const http = require('http');
require('dotenv').config();

// Keep-alive HTTP server for hosting platform health checks
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Infine v1 Egg Tracker is running.');
}).listen(process.env.PORT || 8000);

const client = new Client({ checkUpdate: false });
const webhook = new WebhookClient({ url: process.env.WEBHOOK_URL });
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;

client.on('ready', () => {
  console.log(`Burner listener active as: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Only watch the target egg-notifier channel
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.embeds || message.embeds.length === 0) return;

  try {
    const original = message.embeds[0];

    // Build custom Infine v1 embed
    const relayEmbed = new MessageEmbed()
      .setTitle(original.title || '🚨 Rare Egg Sighted!')
      .setColor('#FF5500')
      .setDescription(original.description || '')
      .setFooter({ text: 'Infine v1 • Live Egg Tracker' })
      .setTimestamp();

    if (original.thumbnail) relayEmbed.setThumbnail(original.thumbnail.url);
    if (original.image) relayEmbed.setImage(original.image.url);

    if (original.fields && original.fields.length > 0) {
      original.fields.forEach(f => {
        relayEmbed.addField(f.name, f.value, f.inline ?? true);
      });
    }

    // Preserve Join Game buttons while dropping third-party server invites
    const components = [];
    if (message.components && message.components.length > 0) {
      for (const row of message.components) {
        const newRow = new MessageActionRow();
        let validButtonFound = false;

        for (const comp of row.components) {
          if (comp.url && !comp.url.includes('discord.gg') && !comp.url.includes('discord.com/oauth2')) {
            newRow.addComponents(
              new MessageButton()
                .setLabel(comp.label || 'Join Game')
                .setStyle('LINK')
                .setURL(comp.url)
            );
            validButtonFound = true;
          }
        }
        if (validButtonFound) components.push(newRow);
      }
    }

    await webhook.send({
      username: 'Infine v1',
      embeds: [relayEmbed],
      components: components.length > 0 ? components : []
    });

  } catch (err) {
    console.error('Relay error:', err);
  }
});

client.login(process.env.USER_TOKEN);
