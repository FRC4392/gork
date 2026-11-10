import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';

import { getClaimableRoles } from '../config/claimableRoles.js';

export const data = new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Post the self-assignable role panel')
    .setDefaultMemberPermissions(
        PermissionFlagsBits.ManageRoles
    );

export async function execute(interaction) {
    const claimableRoles = getClaimableRoles();

    const buttons = claimableRoles.map((role) =>
        new ButtonBuilder()
            .setCustomId(`claim-role:${role.key}`)
            .setLabel(role.label)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const embed = new EmbedBuilder()
        .setColor(0x0066b3)
        .setTitle('Team roles')
        .setDescription(
            [
                'Use the buttons below to select your roles.',
                'Click a role again to remove it.',
                'You may select more than one role.',
            ].join('\n')
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
    });
}
