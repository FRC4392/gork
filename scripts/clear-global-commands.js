import 'dotenv/config';

import {
  REST,
  Routes,
} from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Removing all global commands...');

  await rest.put(
    Routes.applicationCommands(
      process.env.DISCORD_CLIENT_ID
    ),
    {
      body: [],
    }
  );

  console.log('Global commands removed successfully.');
} catch (error) {
  console.error('Failed to remove global commands:', error);
}
