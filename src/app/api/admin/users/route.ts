import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

  const db = getDb();
  const users = db.prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at DESC').all();
  return Response.json({ users });
}
