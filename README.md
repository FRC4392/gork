# Gork

Discord bot for FIRST Robotics Competition Team 4392, The Deceivers.

## Features

- FRC team information from The Blue Alliance, Match13, and Statbotics
- Self-assignable Discord roles
- Server-wide duplicate-link detection
- One-time and weekly reminders
- Opt-in Google Calendar reminders

## Requirements

- Node.js 24
- PostgreSQL
- A Discord application
- The Blue Alliance and Match13 API keys
- Google Calendar API credentials

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in the required configuration.
3. Start PostgreSQL.
4. Install dependencies:

   ```bash
   npm install
   ```
5. Run database migrations:

   ```bash
   npm run migrate
   ```
6. Register development commands:

   ```bash
   npm run register
   ```
7. Start the bot:

   ```bash
   npm start
   ```
## Calendar reminder tags

Add one of these tags to a Google Calendar event description:

- `[discord-reminders: 1w]`
- `[discord-reminders: 1d]`
- `[discord-reminders: 1w, 1d]`

Events without a tag do not create Discord reminders.

All-day events are treated as starting at 8:00 AM Detroit time for reminder scheduling.

## Available commands

- `/team` — Display FRC team identity, analytics, and event information
- `/roles` — Post the self-assignable role panel
- `/reminder once` — Create a one-time reminder
- `/reminder weekly` — Create a weekly reminder
- `/reminder list` — List configured reminders
- `/reminder edit` — Edit a reminder
- `/reminder pause` — Pause a reminder
- `/reminder resume` — Resume a reminder
- `/reminder delete` — Delete a reminder

Data sources
Team information is provided by:

- The Blue Alliance
- Match13
- Statbotics
