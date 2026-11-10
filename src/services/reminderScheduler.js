import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import {
    claimDueReminders,
    completeOneTimeReminder,
    completeWeeklyReminder,
    markReminderFailed,
} from '../repositories/reminderRepository.js';

import {
    getNextWeeklyOccurrence,
} from '../utils/reminderTime.js';

const CHECK_INTERVAL = 30 * 1000;

function createWorkerId() {
    return [
        hostname(),
        process.pid,
        randomUUID(),
    ].join(':');
}

async function sendReminder(client, reminder) {
    const channel = await client.channels.fetch(
        reminder.channel_id
    );

    if (!channel || !channel.isTextBased()) {
        throw new Error(
            `Reminder channel ${reminder.channel_id} is unavailable`
        );
    }

    const content = reminder.role_id
        ? `<@&${reminder.role_id}>\n${reminder.message}`
        : reminder.message;
    
    await channel.send({
        content,
        allowedMentions: {
            parse: [],
            roles: reminder.role_id
                ? [reminder.role_id]
                : [],
        },
    });
}

async function processReminder(
    client,
    workerId,
    reminder,
) {
    try {
        await sendReminder(client, reminder);

        if (reminder.kind === 'once') {
            await completeOneTimeReminder(
                reminder.id,
                workerId
            );

            console.log(
                `Sent one-time reminder #${reminder.id}`
            );

            return;
        }

        if (reminder.kind === 'weekly') {
            const localTime = String(
                reminder.local_time
            ).slice(0,5);

            const nextRunAt = getNextWeeklyOccurrence(
                reminder.weekly_days,
                localTime
            );

            await completeWeeklyReminder(
                reminder.id,
                workerId,
                nextRunAt
            );

            console.log(
                `Sent weekly reminder #${reminder.id}`
            );

            return;
        }

        throw new Error(
            `Unknown reminder kind: ${reminder.kind}`
        )
    } catch (error) {
        console.error(
            `Failed to send reminder #${reminder.id}`,
            error
        );

        await markReminderFailed(
            reminder.id,
            workerId
        );
    }
}

export function startReminderScheduler(client) {
    const workerId = createWorkerId();
    let running = false;

    const run = async () => {
        if (running) {
            return;
        }

        running = true;

        try {
            const reminders = await claimDueReminders(
                workerId
            );

            for (const reminder of reminders) {
                await processReminder(
                    client,
                    workerId,
                    reminder
                );
            }
        } catch (error) {
            console.error(
                'Reminder scheduler failed:',
                error
            );
        } finally {
            running = false;
        }
    };

    run();

    const interval = setInterval(
        run,
        CHECK_INTERVAL
    );

    interval.unref();

    console.log(
        `Reminder scheduler started as ${workerId}`
    );

    return () => {
        clearInterval(interval);
    };
}