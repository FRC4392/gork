import { MessageFlags } from 'discord.js';

import { findClaimableRole } from '../config/claimableRoles.js';

export async function handleRoleButton(interaction) {
  const roleKey = interaction.customId.replace('claim-role:', '');

  const roleConfiguration = findClaimableRole(roleKey);

  if (!roleConfiguration) {
    await interaction.reply({
      content: 'That role is not self-assignable.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Roles can only be selected inside the team server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  const role = await interaction.guild.roles.fetch(roleConfiguration.roleId);

  if (!role) {
    await interaction.reply({
      content: 'That role no longer exists. Please notify and administrator.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const alreadyHasRole = member.roles.cache.has(role.id);

  if (alreadyHasRole) {
    await member.roles.remove(role);

    await interaction.reply({
      content: `Removed the **${role.name}** role`,
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await member.roles.add(role);

    await interaction.reply({
      content: `Added the **${role.name}** role.`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
