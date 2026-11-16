import * as chrono from 'chrono-node';

import { DateTime } from 'luxon';

export const REMINDER_TIMEZONE = 'America/Detroit';

const WEEKDAYS = new Map([
  ['mon', 1],
  ['monday', 1],
  ['tue', 2],
  ['tues', 2],
  ['tuesday', 2],
  ['wed', 3],
  ['wednesday', 3],
  ['thu', 4],
  ['thur', 4],
  ['thurs', 4],
  ['thursday', 4],
  ['fri', 5],
  ['friday', 5],
  ['sat', 6],
  ['saturday', 6],
  ['sun', 7],
  ['sunday', 7],
]);

const WEEKDAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export class ReminderValidationError extends Error {}

function parseNatural(text) {
  const now = DateTime.now().setZone(REMINDER_TIMEZONE);

  const [result] = chrono.parse(
    text,
    { instant: now.toJSDate(), timezone: now.offset },
    { forwardDate: true },
  );

  if (!result) {
    return null;
  }

  const s = result.start;

  return {
    hasTime: s.isCertain('hour'),
    hasDate: s.isCertain('day') || s.isCertain('weekday'),
    dateTime: DateTime.fromObject(
      {
        year: s.get('year'),
        month: s.get('month'),
        day: s.get('day'),
        hour: s.get('hour'),
        minute: s.get('minute'),
      },
      { zone: REMINDER_TIMEZONE },
    ),
  };
}

export function parseOneTimeReminder(date, time) {
  const parsedDateTime = parseNatural(`${date} at ${time}`);

  if (!parsedDateTime?.hasTime || !parsedDateTime?.hasDate) {
    throw new ReminderValidationError(
      "I couldn't understand that date and time. Try something like `tomorrow` + `6pm`, `next fri` + `3:30pm`, or `11/20` + `18:30`.",
    );
  }

  if (parsedDateTime.dateTime <= DateTime.now()) {
    throw new ReminderValidationError(
      'The reminder must be scheduled in the future.',
    );
  }

  return parsedDateTime.dateTime.toJSDate();
}

export function parseWeeklyDays(input) {
  const values = input
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);

  const days = [];

  for (const value of values) {
    const weekday = WEEKDAYS.get(value);

    if (!weekday) {
      throw new ReminderValidationError(
        `I don't recognize the weekday \`${value}\`.`,
      );
    }

    days.push(weekday);
  }

  const uniqueDays = [...new Set(days)].sort((a, b) => a - b);

  if (uniqueDays.length === 0) {
    throw new ReminderValidationError('Provide at least one weekday');
  }

  return uniqueDays;
}

export function parseTime(input) {
  const parsed = parseNatural(input);

  if (!parsed?.hasTime) {
    throw new ReminderValidationError(
      "I couldn't understand that time. Try something like `6pm`, `6:30 pm`, `18:30`, or `noon`.",
    );
  }

  return {
    hour: parsed.dateTime.hour,
    minute: parsed.dateTime.minute,
    databaseValue: parsed.dateTime.toFormat('HH:mm'),
  };
}

export function getNextWeeklyOccurrence(days, timeInput) {
  const time = parseTime(timeInput);
  const now = DateTime.now().setZone(REMINDER_TIMEZONE);

  for (let offset = 0; offset <= 7; offset += 1) {
    const canidate = now.startOf('day').plus({ days: offset }).set({
      hour: time.hour,
      minute: time.minute,
    });

    if (days.includes(canidate.weekday) && canidate > now) {
      return canidate.toJSDate();
    }
  }

  throw new Error('Unable to calculate the next weekly reminder.');
}

export function formatDetroitDate(value) {
  return DateTime.fromJSDate(new Date(value))
    .setZone(REMINDER_TIMEZONE)
    .toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ");
}

export function formatWeeklyDays(days) {
  return days.map((day) => WEEKDAY_NAMES[day]).join(', ');
}

export function getDetroitDateTimeParts(value) {
  const dateTime = DateTime.fromJSDate(new Date(value)).setZone(
    REMINDER_TIMEZONE,
  );

  return {
    date: dateTime.toFormat('yyyy-MM-dd'),
    time: dateTime.toFormat('HH:mm'),
  };
}
