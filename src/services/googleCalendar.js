import { google } from 'googleapis';
import { DateTime } from 'luxon';

import { REMINDER_TIMEZONE } from '../utils/reminderTime.js';

function getGoogleCredentials() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!encoded) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JASON_BASE64 is not configured');
  }

  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
}

function createCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getGoogleCredentials(),
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return google.calendar({
    version: 'v3',
    auth,
  });
}

export async function listUpcomingCalendarEvents() {
  if (!process.env.GOOGLE_CALENDAR_ID) {
    throw new Error('GOOGLE_CALENDAR_ID is not configured');
  }

  const calendar = createCalendarClient();

  const now = DateTime.now().setZone(REMINDER_TIMEZONE);

  const timeMax = now.plus({
    days: 400,
  });

  const events = [];
  let pageToken;

  do {
    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: now.toUTC().toISO(),
      timeMax: timeMax.toUTC().toISO(),
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });

    events.push(...(response.data.items ?? []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return events;
}
