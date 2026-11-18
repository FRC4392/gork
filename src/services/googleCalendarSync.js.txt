import { DateTime } from 'luxon';
import { reconcileCalendarReminder } from '../repositories/calendarReminderRepository.js';

import {
  buildCalendarReminderMessage,
  getCalendarEventStart,
  getCalendarReminderOffsets,
} from '../utils/calendarReminders.js';
import { listUpcomingCalendarEvents } from './googleCalendar.js';

const SYNC_INTERVAL = 5 * 60 * 1000;

async function synchronizeCalendar() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const channelId = process.env.REMINDER_CHANNEL_ID;
  const roleId = process.env.CALENDAR_REMINDER_ROLE_ID;

  if (!guildId) {
    throw new Error('DISCORD_GUILD_ID is not configured');
  }

  if (!channelId) {
    throw new Error('REMINDER_CHANNEL_ID is not configured');
  }

  if (!roleId) {
    throw new Error('CALENDAR_REMINDER_ROLE_ID is not configured');
  }

  const events = await listUpcomingCalendarEvents();
  const now = DateTime.now();

  const scheduledReminders = [];
  const desiredExternalIds = [];

  for (const event of events) {
    if (!event.id || event.status === 'cancelled') {
      continue;
    }

    const eventTiming = getCalendarEventStart(event);

    if (!eventTiming) {
      continue;
    }

    const offsets = getCalendarReminderOffsets(event.description ?? '');

    for (const offset of offsets) {
      const externalId = [event.id, offset.key].join(':');

      // Keep this ID in the desired set even after its scheduled
      // time passes. That prevents a due reminder from being
      // removed before the scheduler sends it.
      desiredExternalIds.push(externalId);

      const nextRunAt = eventTiming.start.minus({
        minutes: offset.minutes,
      });

      // Do not create retrospective reminders during the first
      // synchronization.
      if (nextRunAt <= now) {
        continue;
      }

      scheduledReminders.push({
        externalId,
        channelId,
        roleId,
        nextRunAt: nextRunAt.toJSDate(),
        message: buildCalendarReminderMessage({
          event,
          eventStart: eventTiming.start,
          allDay: eventTiming.allDay,
          offset,
        }),
      });
    }
  }

  await reconcileCalendarReminder({
    guildId,
    scheduledReminders,
    desiredExternalIds,
  });

  console.log(
    [
      'Google Calendar sync completed:',
      `${events.length} events checked,`,
      `${scheduledReminders.length} future reminders configured.`,
    ].join(' '),
  );
}

export function startGoogleCalendarSync() {
  let running = false;

  const run = async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      await synchronizeCalendar();
    } catch (error) {
      console.error(
        'Google Calendar sync failed:',
        error.response?.data ?? error,
      );
    } finally {
      running = false;
    }
  };

  run();

  const interval = setInterval(run, SYNC_INTERVAL);

  interval.unref();

  console.log('Google Calendar synchronization started.');

  return () => {
    clearInterval(interval);
  };
}
