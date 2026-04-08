import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null });

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT email FROM users WHERE id = ?', args: [user.id] });
  const email = (result.rows[0] as unknown as { email: string | null } | undefined)?.email ?? null;

  return Response.json({ user: { ...user, email } });
}
