import 'dotenv/config';

import { google } from 'googleapis';

function getGoogleCredentials() {
    const encoded =
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
    
    if (!encoded) {
        throw new Error(
            'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is not configured'
        );
    }

    const decoded = Buffer
        .from(encoded, 'base64')
        .toString('utf8');

    return JSON.parse(decoded);
}

const credentials = getGoogleCredentials();

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        'https://www.googleapis.com/auth/calendar.events',
    ],
});

const calendar = google.calendar({
    version: 'v3',
    auth,
});

try {
    const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10,
    });

    const events = response.data.items ?? [];

    console.log(
        `Successfully read ${events.length} upcoming events.`
    );

    for (const event of events){
        const start =
            event.start?.dateTime ??
            event.start?.date ??
            'Unknown Start';

        console.log(`${start} - ${event.summary}`);
    }
} catch (error) {
    console.error(
        'Unable to read the Google Calendar:',
        error.response?.data ?? error
    );

    process.exitCode = 1;
}