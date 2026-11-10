import {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';

import {
    createOneTimeReminder,
    createWeeklyReminder,
    listReminders,
    deleteReminder,
    getReminder,
    pauseReminder,
    resumeReminder,
    updateManualReminder,
} from '../repositories/reminderRepository.js';

import {
    formatDetroitDate,
    formatWeeklyDays,
    getNextWeeklyOccurrence,
    parseOneTimeReminder,
    parseTime,
    parseWeeklyDays,
    ReminderValidationError,
    getDetroitDateTimeParts,
} from '../utils/reminderTime.js';

export const data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Manage team reminders')
    .addSubcommand((subcommand) =>
        subcommand
            .setName('once')
            .setDescription('Create a one-time reminder')

            .addStringOption((option) =>
                option
                    .setName('date')
                    .setDescription('Date in the YYYY-MM-DD format')
                    .setMaxLength(10)
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('time')
                    .setDescription('Time in HH:MM 24-hour format')
                    .setMaxLength(5)
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('message')
                    .setDescription('Reminder message')
                    .setMaxLength(1500)
                    .setRequired(true)
            )
            .addRoleOption((option) =>
                option
                    .setName('role')
                    .setDescription('Optional role to tag')
                    .setRequired(false)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('weekly')
            .setDescription('Create a weekly reminder')
            .addStringOption((option) =>
                option
                    .setName('days')
                    .setDescription('Weekdays, such as mon,wed,fri')
                    .setMaxLength(80)
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('time')
                    .setDescription('Time in HH:MM 24-hour format')
                    .setMaxLength(5)
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName('message')
                    .setDescription('Reminder message')
                    .setMaxLength(1500)
                    .setRequired(true)
            )
            .addRoleOption((option) =>
                option
                    .setName('role')
                    .setDescription('Optional role to tag')
                    .setRequired(false)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('list')
            .setDescription('List configured reminders')
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('edit')
            .setDescription('Edit an existing reminder')
            .addIntegerOption((option) =>
                option
                .setName('id')
                .setDescription('Reminder ID')
                .setMinValue(1)
                .setRequired(true)
            )
            .addStringOption((option) =>
                option
                .setName('message')
                .setDescription('New reminder message')
                .setMaxLength(1500)
                .setRequired(false)
            )
            .addStringOption((option) =>
                option
                .setName('date')
                .setDescription('New date for a one-time reminder')
                .setMaxLength(10)
                .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName('time')
                    .setDescription('New Detroit time in HH:MM format')
                    .setMaxLength(5)
                    .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName('days')
                    .setDescription('New weekdays for a weekly reminder')
                    .setMaxLength(80)
                    .setRequired(false)
            )
            .addRoleOption((option) =>
                option
                    .setName('role')
                    .setDescription('New role to tag')
                    .setRequired(false)
            )
            .addBooleanOption((option) =>
                option
                    .setName('clear-role')
                    .setDescription('Remove the role tag')
                    .setRequired(false)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('pause')
            .setDescription('Pause a reminder')
            .addIntegerOption((option) =>
                option
                    .setName('id')
                    .setDescription('Reminder ID')
                    .setMinValue(1)
                    .setRequired(true)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('resume')
            .setDescription('Resume a paused reminder')
            .addIntegerOption((option) =>
                option
                    .setName('id')
                    .setDescription('Reminder ID')
                    .setMinValue(1)
                    .setRequired(true)
            )
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName('delete')
            .setDescription('Permanently delete a reminder')
            .addIntegerOption((option) =>
                option
                    .setName('id')
                    .setDescription('Reminder ID')
                    .setMinValue(1)
                    .setRequired(true)
            )
    );


async function memberCanManageReminders(interaction) {
    if (!process.env.MENTOR_ROLE_ID) {
        throw new Error('MENTOR_ROLE_ID is not configured');
    }

    const member = await interaction.guild.members.fetch(
        interaction.user.id
    );

    return (
        member.roles.cache.has(process.env.MENTOR_ROLE_ID) ||
        member.permissions.has(PermissionFlagsBits.Administrator)
    );
}

function validateRole(interaction, role) {
    if (!role) {
        return;
    }

    if (role.id === interaction.guild.id) {
        throw new ReminderValidationError(
            'The @everyone role cannot be used in a reminder.'
        );
    }

    if (role.managed) {
        throw new ReminderValidationError(
            'Discord-managed roles cannot be used in reminders.'
        );
    }
}

function formatReminder(reminder) {
    let status = 'Enabled';

    if (!reminder.enabled) {
        status =
            reminder.kind === 'once' && reminder.last_sent_at
                ? 'Completed'
                : 'Paused';
    }

    const schedule =
        reminder.kind === 'once'
            ? formatDetroitDate(reminder.next_run_at)
            : `${formatWeeklyDays(reminder.weekly_days)} at ` +
            `${String(reminder.local_time).slice(0,5)}`;

    const role = reminder.role_id
        ? `<@&${reminder.role_id}>`
        : 'No Role';

    const shortenedMessage = 
        reminder.message.length > 100
            ? `${reminder.message.slice(0, 97)}...`
            : reminder.message;

    return [
        `**#${reminder.id} - ${status}**`,
        schedule,
        role,
        shortenedMessage,
    ].join('\n');
}

export async function execute(interaction) {
    if (!interaction.inGuild()) {
        await interaction.reply({
            content: 'Reminders can only be managed in the team server',
            flags: MessageFlags.Ephemeral,
        });

        return
    }

    await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
    });

    if (!(await memberCanManageReminders(interaction))) {
        await interaction.editReply(
            'Only mentors can manage reminders'
        );

        return;
    }

    if (!process.env.REMINDER_CHANNEL_ID) {
        throw new Error('REMINDER_CHANNEL_ID is not configured');
    }

    const subcommand = interaction.options.getSubcommand();

    try {
        if (subcommand === 'once') {
            const date = interaction.options.getString(
                'date',
                true
            );

            const time = interaction.options.getString(
                'time',
                true
            );

            const message = interaction.options.getString(
                'message',
                true
            );

            const role = interaction.options.getRole('role');

            validateRole(interaction, role);

            const nextRunAt = parseOneTimeReminder(date, time);

            const reminder = await createOneTimeReminder({
                guildId: interaction.guildId,
                channelId: process.env.REMINDER_CHANNEL_ID,
                message,
                roleId: role?.id ?? null,
                nextRunAt,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: [
                    `Created reminder **#${reminder.id}**.`,
                    `Scheduled for ${formatDetroitDate(reminder.next_run_at)}.`,
                ].join('\n'),
                allowedMentions: {
                    parse: [],
                },
            });

            return;
        }

        if (subcommand === 'weekly'){
            const daysInput = interaction.options.getString(
                'days',
                true
            );

            const timeInput = interaction.options.getString(
                'time',
                true
            );

            const message = interaction.options.getString(
                'message',
                true
            );

            const role = interaction.options.getRole('role');

            validateRole(interaction, role);

            const weeklyDays = parseWeeklyDays(daysInput);
            const localTime = parseTime(timeInput).databaseValue;

            const nextRunAt = getNextWeeklyOccurrence(
                weeklyDays,
                timeInput
            );

            const reminder = await createWeeklyReminder({
                guildId: interaction.guild.id,
                channelId: process.env.REMINDER_CHANNEL_ID,
                message,
                roleId: role?.id ?? null,
                weeklyDays,
                localTime,
                nextRunAt,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: [
                    `Created reminder **#${reminder.id}**.`,
                    `Repeats ${formatWeeklyDays(weeklyDays)} at ${timeInput}.`,
                    `Next occurrence: ${formatDetroitDate(reminder.next_run_at)}.`,
                ].join('\n'),
                allowedMentions: {
                    parse: [],
                },
            });

            return;
        }

        if (subcommand === 'list') {
            const reminders = await listReminders(
                interaction.guildId
            );

            if (reminders.length === 0) {
                await interaction.editReply(
                    'There are no configured reminders.'
                );

                return;
            }

            await interaction.editReply({
                content: reminders
                    .map(formatReminder)
                    .join('\n\n'),
                allowedMentions: {
                    parse: [],
                },
            });

            return;
        }

        if (subcommand === 'pause') {
            const reminderId = interaction.options.getInteger(
                'id',
                true
            );

            const paused = await pauseReminder({
                guildId: interaction.guild.id,
                reminderId,
                userId: interaction.user.id,
            });

            if (!paused) {
                throw new ReminderValidationError(
                    `Reminder #${reminderId} does not exist or cannot currently be paused.`
                );
            }

            await interaction.editReply(
                `Paused reminder **#${reminderId}**.`
            );

            return;
        }

        if (subcommand === 'resume') {
            const reminderId = interaction.options.getInteger(
                'id',
                true
            );

            const reminder = await getReminder(
                interaction.guild.id,
                reminderId
            );

            if (!reminder || reminder.source !== 'manual') {
                throw new ReminderValidationError(
                    `Manual reminder #${reminderId} does not exist.`
                );
            }

            let nextRunAt = reminder.next_run_at;

            if (reminder.kind === 'once') {
                if (new Date(nextRunAt) <= Date()) {
                    throw new ReminderValidationError(
                        'This one-time reminder is in the past. Edit its date or time before resuming it.'
                    );
                }
            } else {
                nextRunAt = getNextWeeklyOccurrence(
                    reminder.weeklyDays,
                    String(reminder.local_time).slice(0,5)
                );
            }

            const resumed = await resumeReminder({
                guildId: interaction.guild.id,
                reminderId,
                nextRunAt,
                userId: interaction.user.id,
            });

            if (!resumed) {
                throw new ReminderValidationError(
                    'That reminder is currently being processed. Try again shortly.'
                );
            }

            await interaction.editReply(
                `Resumed reminder **#${reminderId}**.`
            );

            return;
        }

        if (subcommand === 'delete') {
            const reminderId = interaction.options.getInteger(
                'id',
                true
            );

            const deleted = await deleteReminder({
                guildId: interaction.guildId,
                reminderId,
            });

            if (!deleted) {
                throw new ReminderValidationError(
                    `Manual reminder #${reminderId} does not exist or cannot currently be deleted.`
                );
            }

            await interaction.editReply(
                `Deleted reminder **#${reminderId}**.`
            );

            return;
        }

        if (subcommand === 'edit'){
            const reminderId = interaction.options.getInteger(
                'id',
                true
            );

            const reminder = await getReminder(
                interaction.guild.id,
                reminderId
            );

            if (!reminder) {
                throw new ReminderValidationError(
                    `Reminder #${reminderId} does not exist.`
                );
            }

            if (reminder.source !== 'manual'){
                throw new ReminderValidationError(
                    'Calendar reminders must be edited in Google Calendar'
                );
            }

            const newMessage = 
                interaction.options.getString('message');

            const newDate =
                interaction.options.getString('date');

            const newTime =
                interaction.options.getString('time');

            const newDays =
                interaction.options.getString('days');

            const newRole =
                interaction.options.getRole('role');

            const clearRole =
                interaction.options.getBoolean('clear-role') ?? false;


            if (
                newMessage === null &&
                newDate === null &&
                newTime === null &&
                newDays === null &&
                newRole === null &&
                !clearRole
            ) {
                throw new ReminderValidationError(
                    'Provide at least one value to change.'
                );
            }

            if (newRole && clearRole) {
                throw new ReminderValidationError(
                    'Choose a new role or clear the role, not both.'
                );
            }

            validateRole(interaction, newRole);

            let weeklyDays = reminder.weekly_days;
            let localTime = reminder.local_time;
            let nextRunAt = reminder.next_run_at;

            if (reminder.kind === 'once') {

                if (newDays !== null) {
                    throw new ReminderValidationError(
                        'The `days` option only applies to weekly reminders.'
                    );
                }

                if (newDate !== null || newTime !== null) {
                    const existing = getDetroitDateTimeParts(
                        reminder.next_run_at
                    );
                

                    nextRunAt = parseOneTimeReminder(
                        newDate ?? existing.date,
                        newTime ?? existing.time
                    );
                }
            }

            if (reminder.kind === 'weekly') {
                if (newDate !== null) {
                    throw new ReminderValidationError(
                        'The `date` option only applies to one-time reminders.'
                    );
                }

                if (newDays !== null) {
                    weeklyDays = parseWeeklyDays(newDays);
                }

                if (newTime != null) {
                    localTime = parseTime(newTime).databaseValue;
                }

                if (newDays !== null || newTime !== null) {
                    nextRunAt = getNextWeeklyOccurrence(
                        weeklyDays,
                        String(localTime).slice(0, 5)
                    );
                }
            }

            const roleId = clearRole
                ? null
                : newRole?.id ?? reminder.role_id;

            const updated = await updateManualReminder({
                guildId: interaction.guild.id,
                reminderId,
                message: newMessage ?? reminder.message,
                roleId,
                weeklyDays,
                localTime,
                nextRunAt,
                userId: interaction.user.id,
            });

            if (!updated) {
                throw new ReminderValidationError(
                    'That reminder is currently being processed. Try again shortly.'
                );
            }

            await interaction.editReply(
                `Updated reminder **#${reminderId}**.`
            )

            return;
        }



    } catch (error) {
        if (error instanceof ReminderValidationError) {
            await interaction.editReply(error.message);
            return;
        }

        throw error
    }
}

