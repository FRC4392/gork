import 'dotenv/config';

import { REST, Routes } from 'discord.js';
//import { data as reminderCommand } from '../src/commands/reminder.js';
import { data as rolesCommand } from '../src/commands/roles.js';
import { data as teamCommand } from '../src/commands/team.js';
import { data as test_gamble } from '../src/commands/test_gamble.js';

const commands = [
  teamCommand.toJSON(),
  rolesCommand.toJSON(),
  test_gamble.toJSON(),
  // reminderCommand.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registering development commands...');

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.DISCORD_CLIENT_ID,
      process.env.DISCORD_GUILD_ID,
    ),
    {
      body: commands,
    },
  );

  console.log('Commands registered sucessfully');
} catch (error) {
  console.error('Failed to register commands:', error);
}
