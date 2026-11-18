import { pool } from '../database.js';

export async function createOneTimeReminder({
  guildId,
  channelId,
  message,
  roleId,
  nextRunAt,
  userId,
}) {
  const result = await pool.query(
    `
        INSERT INTO reminders (
            guild_id,
            channel_id,
            kind,
            message,
            role_id,
            next_run_at,
            created_by,
            updated_by
        )
        VALUES ($1, $2, 'once', $3, $4, $5, $6, $6)
        RETURNING *
        `,
    [guildId, channelId, message, roleId, nextRunAt, userId],
  );

  return result.rows[0];
}

export async function createWeeklyReminder({
  guildId,
  channelId,
  message,
  roleId,
  weeklyDays,
  localTime,
  nextRunAt,
  userId,
}) {
  const result = await pool.query(
    `
        INSERT INTO reminders (
            guild_id,
            channel_id,
            kind,
            message,
            role_id,
            weekly_days,
            local_time,
            next_run_at,
            created_by,
            updated_by
        )
        VALUES (
            $1,
            $2,
            'weekly',
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $8
        )
        RETURNING *
        `,
    [
      guildId,
      channelId,
      message,
      roleId,
      weeklyDays,
      localTime,
      nextRunAt,
      userId,
    ],
  );

  return result.rows[0];
}

export async function listReminders(guildId) {
  const result = await pool.query(
    `
        SELECT *
        FROM reminders
        WHERE guild_id = $1
          AND NOT (
            kind = 'once'
            AND enabled = FALSE
            AND last_sent_at IS NOT NULL
            AND last_sent_at < NOW() - INTERVAL '1 day'
          )
        ORDER BY
            enabled DESC,
            next_run_at ASC
        LIMIT 25
        `,
    [guildId],
  );

  return result.rows;
}

export async function claimDueReminders(workerId, limit = 10) {
  const result = await pool.query(
    `
        WITH due_reminders AS (
            SELECT id
            FROM reminders
            WHERE enabled = TRUE
                AND next_run_at <= NOW()
                AND (
                    locked_at IS NULL
                    OR locked_at < NOW() - INTERVAL '5 minutes'
                )
            ORDER BY next_run_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $1
        )
        UPDATE reminders
        SET
            locked_at = NOW(),
            locked_by = $2
        FROM due_reminders
        WHERE reminders.id = due_reminders.id
        RETURNING reminders.*
        `,
    [limit, workerId],
  );

  return result.rows;
}

export async function completeOneTimeReminder(reminderId, workId) {
  await pool.query(
    `
        UPDATE reminders
        SET
            enabled = FALSE,
            last_sent_at = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = $1
            AND locked_by = $2
        `,
    [reminderId, workId],
  );
}

export async function completeWeeklyReminder(reminderId, workerId, nextRunAt) {
  await pool.query(
    `
        UPDATE reminders
        SET
            next_run_at = $3,
            last_sent_at = NOW(),
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = $1
            AND locked_by = $2
        `,
    [reminderId, workerId, nextRunAt],
  );
}

export async function markReminderFailed(reminderId, workerId) {
  await pool.query(
    `
      UPDATE reminders
      SET
        locked_at = NOW(),
        locked_by = NULL,
        updated_at = NOW()
      WHERE id = $1
        AND locked_by = $2
    `,
    [reminderId, workerId],
  );
}

export async function getReminder(guildId, reminderId) {
  const result = await pool.query(
    `
    SELECT *
    FROM reminders
    WHERE guild_id = $1
        AND id = $2
    LIMIT 1
    `,
    [guildId, reminderId],
  );

  return result.rows[0] ?? null;
}

export async function updateManualReminder({
  guildId,
  reminderId,
  message,
  roleId,
  weeklyDays,
  localTime,
  nextRunAt,
  userId,
}) {
  const result = await pool.query(
    `
    UPDATE reminders
    SET
        message = $3,
        role_id = $4,
        weekly_days = $5,
        local_time = $6,
        next_run_at = $7,
        updated_by = $8,
        updated_at = NOW(),
        locked_at = NULL,
        locked_by = NULL
    WHERE guild_id = $1
        AND id = $2
        AND source = 'manual'
        AND (locked_by IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
    RETURNING *
    `,
    [
      guildId,
      reminderId,
      message,
      roleId,
      weeklyDays,
      localTime,
      nextRunAt,
      userId,
    ],
  );

  return result.rows[0] ?? null;
}

export async function pauseReminder({ guildId, reminderId, userId }) {
  const result = await pool.query(
    `
    UPDATE reminders
    SET
        enabled = FALSE,
        updated_by = $3,
        updated_at = NOW()
    WHERE guild_id = $1
        AND id = $2
        AND source = 'manual'
        AND (locked_by IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
    RETURNING *
    `,
    [guildId, reminderId, userId],
  );

  return result.rows[0] ?? null;
}

export async function resumeReminder({
  guildId,
  reminderId,
  nextRunAt,
  userId,
}) {
  const result = await pool.query(
    `
    UPDATE reminders
    SET
        enabled = TRUE,
        next_run_at = $3,
        updated_by = $4,
        updated_at = NOW(),
        locked_at = NULL,
        locked_by = NULL
    WHERE guild_id = $1
        AND id = $2
        AND source = 'manual'
        AND (locked_by IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
    RETURNING *
    `,
    [guildId, reminderId, nextRunAt, userId],
  );

  return result.rows[0] ?? null;
}

export async function deleteReminder({ guildId, reminderId }) {
  const result = await pool.query(
    `
    DELETE FROM reminders
    WHERE guild_id = $1
        AND id = $2
        AND source = 'manual'
        AND (locked_by IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
    RETURNING *
    `,
    [guildId, reminderId],
  );

  return result.rows[0] ?? null;
}

export async function deleteCompletedReminders() {
  const result = await pool.query(`
    DELETE FROM reminders
    WHERE kind = 'once'
      AND source = 'manual'
      AND enabled = FALSE
      and last_sent_at IS NOT NULL
      and last_sent_at < NOW() - INTERVAL '30 days'
      and locked_by IS NULL
    `);

  return result.rowCount;
}
