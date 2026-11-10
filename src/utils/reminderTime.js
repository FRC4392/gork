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

export function parseOneTimeReminder(date, time) {
    const dateTime = DateTime.fromFormat(
        `${date} ${time}`,
        'yyyy-MM-dd HH:mm',
        {
            zone: REMINDER_TIMEZONE,
            setZone: true,
        }
    );

    if (!dateTime.isValid) {
        throw new ReminderValidationError(
            'Use `YYYY-MM-DD` for the date and `HH:MM in 24-hour time.'
        );
    }

    if (dateTime <= DateTime.now()) {
        throw new ReminderValidationError(
            'The reminder must be scheduled in the future.'
        );
    }

    return dateTime.toJSDate();
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
                `I don't recognize the weekday \`${value}\`.`
            );
        }

        days.push(weekday);
    }

    const uniqueDays = [...new Set(days)].sort((a,b) => a-b);

    if (uniqueDays.length === 0) {
        throw new ReminderValidationError(
            'Provide at least one weekday'
        );
    }

    return uniqueDays;
}

export function parseTime(input) {
    const parsed = DateTime.fromFormat(input, 'HH:mm', {
        zone: REMINDER_TIMEZONE,
    });

    if (!parsed.isValid) {
        throw new ReminderValidationError(
            'Use HH:MM in 24-hour time, such as `18:30`.'
        );
    }

    return {
        hour: parsed.hour,
        minute: parsed.minute,
        databaseValue: input,
    };
}

export function getNextWeeklyOccurrence(days, timeInput) {
    const time = parseTime(timeInput);
    const now = DateTime.now().setZone(REMINDER_TIMEZONE);

    for (let offset = 0; offset <= 7; offset += 1) {
        const canidate = now
            .startOf('day')
            .plus({ days: offset })
            .set({
                hour: time.hour,
                minute: time.minute,
            });

        if (
            days.includes(canidate.weekday) &&
            canidate > now
        ) {
            return canidate.toJSDate();
        }
    }

    throw new Error('Unable to calculate the next weekly reminder.');
}

export function formatDetroitDate(value) {
    return DateTime
        .fromJSDate(new Date(value))
        .setZone(REMINDER_TIMEZONE)
        .toFormat("ccc, LLL d, yyyy 'at' h:mm a ZZZZ");
}

export function formatWeeklyDays(days){
    return days
        .map((day) => WEEKDAY_NAMES[day])
        .join(', ');
}

export function getDetroitDateTimeParts(value) {
    const dateTime = DateTime
        .fromJSDate(new Date(value))
        .setZone(REMINDER_TIMEZONE);

    return {
        date: dateTime.toFormat('yyyy-MM-dd'),
        time: dateTime.toFormat('HH:mm'),
    };
}
