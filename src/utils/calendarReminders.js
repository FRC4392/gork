import { DateTime } from 'luxon';

import { REMINDER_TIMEZONE } from './reminderTime.js';

const REMINDER_TAG_PATTERN = /\[discord-reminders\s*:\s*([^\]]+)\]/gi;

const OFFSETS = new Map([
  [
    '1w',
    {
      key: '1w',
      minutes: 7 * 24 * 60,
      description: 'in one week',
    },
  ],
  [
    '7d',
    {
      key: '1w',
      minutes: 7 * 24 * 60,
      description: 'in one week',
    },
  ],
  [
    '1week',
    {
      key: '1w',
      minutes: 7 * 24 * 60,
      description: 'in one week',
    },
  ],
  [
    '1d',
    {
      key: '1d',
      minutes: 24 * 60,
      description: 'tomorrow',
    },
  ],
  [
    '1day',
    {
      key: '1d',
      minutes: 24 * 60,
      description: 'tomorrow',
    },
  ],
]);

export function getCalendarReminderOffsets(description = '') {
  const offsets = new Map();

  for (const match of description.matchAll(REMINDER_TAG_PATTERN)) {
    const values = match[1].split(',');

    for (const value of values) {
      const normalized = value.trim().toLowerCase().replace(/\s+/g, '');

      const offset = OFFSETS.get(normalized);

      if (offset) {
        offsets.set(offset.key, offset);
      } else if (normalized) {
        console.warn(
          `Ignoring unknown calendar reminder offset: ${value.trim()}`,
        );
      }
    }
  }

  return [...offsets.values()];
}

export function getCalendarEventStart(event) {
  if (event.start?.dateTime) {
    const start = DateTime.fromISO(event.start.dateTime, {
      setZone: true,
    }).setZone(REMINDER_TIMEZONE);

    return {
      start,
      allDay: false,
    };
  }

  if (event.start?.date) {
    const start = DateTime.fromISO(event.start.date, {
      zone: REMINDER_TIMEZONE,
    }).set({
      hour: 8,
      minute: 0,
    });

    return {
      start,
      allDay: true,
    };
  }

  return null;
}

export function buildCalendarReminderMessage({
  event,
  eventStart,
  allDay,
  offset,
}) {
  const title = event.summary || 'Untitled event';
  const timestamp = Math.floor(eventStart.toSeconds());

  const lines = [`**${title}** is ${offset.description}.`];

  if (allDay) {
    lines.push(`When: All day <t:${timestamp}:D>`);
  } else {
    lines.push(`When: <t:${timestamp}:F>`);
  }

  if (event.location) {
    lines.push(`Where: ${event.location}`);
  }

  if (event.htmlLink) {
    lines.push(`[Open in Google Calendar](${event.htmlLink})`);
  }

  return lines.join('\n');
}
