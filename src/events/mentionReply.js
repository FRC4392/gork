import { readFileSync } from 'node:fs';

const repliesFile = new URL('../data/mentionReplies.json', import.meta.url);

const replies = JSON.parse(readFileSync(repliesFile, 'utf8'));

function validateReplies() {
  if (!Array.isArray(replies) || replies.length === 0) {
    throw new Error('mentionReplies.json must contain a non-empty array');
  }

  for (const reply of replies) {
    if (typeof reply !== 'string' || reply.trim() === '') {
      throw new Error('Every mention reply must be a non-empty string');
    }

    if (reply.length > 2000) {
      throw new Error('Mention replies cannot exceed 2,000 characters');
    }
  }
}

function getRandomReply() {
  const index = Math.floor(Math.random() * replies.length);

  return replies[index];
}

validateReplies();

export async function handleMentionReply(message) {
  if (!message.inGuild() || message.author.bot) {
    return;
  }

  const botWasMentioned = message.mentions.users.has(message.client.user.id);

  const roleId = process.env.MENTION_REPLY_ROLE_ID;

  const roleWasMentioned =
    Boolean(roleId) && message.mentions.roles.has(roleId);

  if (!botWasMentioned && !roleWasMentioned) {
    return;
  }

  await message.reply({
    content: getRandomReply(),
    allowedMentions: {
      parse: [],
      repliedUser: false,
    },
  });
}
