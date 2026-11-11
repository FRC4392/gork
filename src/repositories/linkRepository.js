import { createHash } from 'node:crypto';

import { pool } from '../database.js';

function hashUrl(normalizedUrl) {
  return createHash('sha256').update(normalizedUrl).digest('hex');
}

export async function recordOrFindLink({
  guildId,
  normalizedUrl,
  authorId,
  channelId,
  messageId,
  postedAt,
}) {
  const urlHash = hashUrl(normalizedUrl);

  const upsertResult = await pool.query(
    `
            INSERT INTO shared_links (
                guild_id,
                url_hash,
                normalized_url,
                original_author_id,
                original_channel_id,
                original_message_id,
                first_seen_at,
                expires_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $7::timestamptz + INTERVAL '6 months'
            )
            ON CONFLICT (guild_id, url_hash)
            DO UPDATE SET
                normalized_url = EXCLUDED.normalized_url,
                original_author_id = EXCLUDED.original_author_id,
                original_channel_id = EXCLUDED.original_channel_id,
                original_message_id = EXCLUDED.original_message_id,
                first_seen_at = EXCLUDED.first_seen_at,
                expires_at = EXCLUDED.expires_at
            WHERE shared_links.expires_at <= EXCLUDED.first_seen_at
            RETURNING *
        `,
    [guildId, urlHash, normalizedUrl, authorId, channelId, messageId, postedAt],
  );

  // A row is returned when this is a new link or replaces an
  // expired link.
  if (upsertResult.rows.length > 0) {
    return {
      isDuplicate: false,
      link: upsertResult.rows[0],
    };
  }

  const existingResult = await pool.query(
    `
            SELECT *
            FROM shared_links
            WHERE guild_id = $1
                AND url_hash = $2
                AND expires_at > $3
            LIMIT 1
        `,
    [guildId, urlHash, postedAt],
  );

  const existingLink = existingResult.rows[0];

  if (!existingLink) {
    // This should be rare, but avoids crashing if the record is
    // removed between the upsert and select.
    return {
      isDuplicate: false,
      link: null,
    };
  }

  return {
    isDuplicate: true,
    link: existingLink,
  };
}

export async function deleteExpiredLinks() {
  const result = await pool.query(`
       DELETE FROM shared_links
       WHERE expires_at <= NOW()
    `);

  return result.rowCount;
}
