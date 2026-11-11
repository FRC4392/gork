import { pool } from '../database.js';

export async function reconcileCalendarReminder({
  guildId,
  scheduledReminders,
  desiredExternalIds,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const reminder of scheduledReminders) {
      await client.query(
        `
                INSERT INTO reminders (
                    guild_id,
                    channel_id,
                    kind,
                    source,
                    external_id,
                    message,
                    role_id,
                    next_run_at,
                    created_by,
                    updated_by
                )
                VALUES (
                    $1,
                    $2,
                    'once',
                    'google_calendar',
                    $3,
                    $4,
                    $5,
                    $6,
                    'google-calendar',
                    'google-calendar'
                )
                ON CONFLICT (
                    guild_id,
                    source,
                    external_id
                )
                WHERE external_id IS NOT NULL
                DO UPDATE SET
                    channel_id = EXCLUDED.channel_id,
                    message = EXCLUDED.message,
                    role_id = EXCLUDED.role_id,
                    next_run_at = EXCLUDED.next_run_at,
                    enabled = TRUE,
                    last_sent_at = NULL,
                    updated_by = 'google-calendar',
                    updated_at = NOW()
                WHERE reminders.locked_at IS NULL
                `,
        [
          guildId,
          reminder.channelId,
          reminder.externalId,
          reminder.message,
          reminder.roleId,
          reminder.nextRunAt,
        ],
      );
    }

    if (desiredExternalIds.length === 0) {
      await client.query(
        `
                DELETE FROM reminders
                WHERE guild_id = $1
                    AND source = 'google_calendar'
                    AND locked_at IS NULL
                `,
        [guildId],
      );
    } else {
      await client.query(
        `
                DELETE FROM reminders
                WHERE guild_id = $1
                    AND source = 'google_calendar'
                    AND NOT (
                        external_id = ANY($2::text[])
                    )
                    AND locked_at IS NULL
                `,
        [guildId, desiredExternalIds],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
