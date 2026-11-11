import { recordOrFindLink } from '../repositories/linkRepository.js';
import { extractUrls } from '../utils/urls.js';

function createMessageUrl(guildId, channelId, messageId) {
  return ['https://discord.com/channels', guildId, channelId, messageId].join(
    '/',
  );
}

export async function handleMessageCreate(message) {
  if (!message.inGuild() || message.author.bot) {
    return;
  }

  const urls = extractUrls(message.content);

  if (urls.length === 0) {
    return;
  }

  const duplicates = [];

  for (const normalizedUrl of urls) {
    const result = await recordOrFindLink({
      guildId: message.guild.id,
      normalizedUrl,
      authorId: message.author.id,
      channelId: message.channel.id,
      messageId: message.id,
      postedAt: new Date(message.createdTimestamp),
    });

    if (result.isDuplicate && result.link) {
      duplicates.push(result.link);
    }
  }

  if (duplicates.length === 0) {
    return;
  }

  const lines = duplicates.map((link) => {
    const originalUrl = createMessageUrl(
      link.guild_id,
      link.original_channel_id,
      link.original_message_id,
    );

    const timestamp = Math.floor(new Date(link.first_seen_at).getTime() / 1000);

    return [
      `<@${link.original_author_id}> already shared this`,
      `[here](${originalUrl})`,
      `<t:${timestamp}:R>.`,
    ].join(' ');
  });

  await message.reply({
    content: ['Repost detected!', ...lines].join('\n'),
    allowedMentions: {
      parse: [],
      repliedUser: false,
    },
  });
}
