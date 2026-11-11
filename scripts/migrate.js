import 'dotenv/config';

import { pool } from '../src/database.js';

try {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS shared_links (
            guild_id TEXT NOT NULL,
            url_hash CHAR(64) NOT NULL,
            normalized_url TEXT NOT NULL,
            original_author_id TEXT NOT NULL,
            original_channel_id TEXT NOT NULL,
            original_message_id TEXT NOT NULL,
            first_seen_at TIMESTAMPTZ NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,

            PRIMARY KEY (guild_id, url_hash),

            CONSTRAINT valid_link_expiration
                CHECK (expires_at > first_seen_at)
        );
    `);

  await pool.query(`
        CREATE INDEX IF NOT EXISTS shared_links_expiration_idx
            ON shared_links (expires_at);
    `);

  await pool.query(`
        CREATE TABLE IF NOT EXISTS reminders (
            id BIGSERIAL PRIMARY KEY,

            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,

            kind TEXT NOT NULL
                CHECK (kind IN ('once', 'weekly')),

            source TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'google_calendar')),

            external_id TEXT,

            message TEXT NOT NULL,
            role_id TEXT,

            timezone TEXT NOT NULL DEFAULT 'America/Detroit',

            weekly_days SMALLINT[],
            local_time TIME,

            next_run_at TIMESTAMPTZ NOT NULL,
            last_sent_at TIMESTAMPTZ,

            enabled BOOLEAN NOT NULL DEFAULT TRUE,

            locked_at TIMESTAMPTZ,
            locked_by TEXT,

            created_by TEXT NOT NULL,
            updated_by TEXT NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT valid_weekly_configuration CHECK (
                (
                    kind = 'once'
                    AND weekly_days IS NULL
                    AND local_time IS NULL
                )
                OR
                (
                    kind = 'weekly'
                    AND weekly_days IS NOT NULL
                    AND cardinality(weekly_days) > 0
                    AND local_time IS NOT NULL
                )
            )
        );
    `);

  await pool.query(`
        CREATE INDEX IF NOT EXISTS reminders_due_idx
            ON reminders (next_run_at)
            WHERE enabled = TRUE;
    `);

  await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS reminders_external_idx
            ON reminders (guild_id, source, external_id)
            WHERE external_id IS NOT NULL;
    `);

  console.log('Database migration completed successfully.');
} catch (error) {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
