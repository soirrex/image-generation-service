export interface OutboxRow {
  id: bigint;
  value: Record<string, unknown>;
}

export interface OutboxPool {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface OutboxSender {
  send(id: string, value: Record<string, unknown>): Promise<void>;
}

export async function processOutbox(
  pool: OutboxPool,
  kafka: OutboxSender,
  batchSize = 100,
): Promise<{ total: number; sent: number }> {
  const { rows } = await pool.query<OutboxRow>(
    'SELECT id, value FROM "ImageOutbox" ORDER BY id LIMIT $1',
    [batchSize],
  );

  let sent = 0;

  for (const row of rows) {
    try {
      await kafka.send(row.id.toString(), row.value);
      await pool.query('DELETE FROM "ImageOutbox" WHERE id = $1', [row.id]);
      sent++;
    } catch {
      await pool.query('UPDATE "ImageOutbox" SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    }
  }

  return { total: rows.length, sent };
}
