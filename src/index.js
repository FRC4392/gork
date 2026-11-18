import 'dotenv/config';

import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { execute as executeReminder } from './commands/reminder.js';
import { execute as executeRoles } from './commands/roles.js';
import { execute as executeTeam } from './commands/team.js';
import { handleMentionReply } from './events/mentionReply.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { handleRoleButton } from './interactions/roleButton.js';
import { deleteExpiredLinks } from './repositories/linkRepository.js';
import { deleteCompletedReminders } from './repositories/reminderRepository.js';
import { startGoogleCalendarSync } from './services/googleCalendarSync.js';
import { startReminderScheduler } from './services/reminderScheduler.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  const runCleanup = async () => {
    try {
      const deletedCount = await deleteExpiredLinks();

      if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} expired link records.`);
      }
    } catch (error) {
      console.error('Link cleanup failed:', error);
    }

    try {
      const deletedReminders = await deleteCompletedReminders();

      if (deletedReminders > 0) {
        console.log(`Deleted ${deletedReminders} completed reminders.`);
      }
    } catch (error) {
      console.error('Reminder cleanup failed:', error);
    }
  };

  runCleanup();

  const cleanupInterval = setInterval(runCleanup, 24 * 60 * 60 * 1000);

  cleanupInterval.unref();

  startReminderScheduler(readyClient);
  startGoogleCalendarSync();
});

async function sendInteractionError(interaction) {
  const content = 'Something went wrong while processing that action';

  if (interaction.deferred) {
    await interaction.editReply(content);
  } else if (interaction.replied) {
    await interaction.followUp({
      content,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    });
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'team') {
        await executeTeam(interaction);
      } else if (interaction.commandName === 'roles') {
        await executeRoles(interaction);
      } else if (interaction.commandName === 'reminder') {
        await executeReminder(interaction);
      }

      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId.startsWith('claim-role:')
    ) {
      await handleRoleButton(interaction);
    }
  } catch (error) {
    console.error('Interaction failed:', error);
    try {
      await sendInteractionError(interaction);
    } catch (error) {
      console.error('Could not send the error reply:', error);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessageCreate(message);
    await handleMentionReply(message);
  } catch (error) {
    console.error(`Failed to process message ${message.id}:`, error);
  }
});

client.on(Events.Error, (error) =>
  console.error('Discord client error:', error),
);

process.on('unhandledRejection', (error) =>
  console.error('Unhandled rejection:', error),
);

client.login(process.env.DISCORD_TOKEN);
