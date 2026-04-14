import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import { isExpired } from './utils';

let _client: Client | null = null;

export function getDb(): Client {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}

// Flip is_locked = 1 on any unlocked group buy whose end_date has passed.
// Call from read endpoints so the DB state stays truthful without a cron.
export async function autoLockExpired(): Promise<void> {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT id, end_date FROM group_buys WHERE is_locked = 0',
    args: [],
  });
  const toLock: number[] = [];
  for (const row of result.rows as unknown as { id: number; end_date: string }[]) {
    if (isExpired(row.end_date)) toLock.push(Number(row.id));
  }
  if (toLock.length === 0) return;
  await db.execute({
    sql: `UPDATE group_buys SET is_locked = 1 WHERE id IN (${toLock.map(() => '?').join(',')})`,
    args: toLock,
  });
}
