import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const result = await getDb().execute({ sql: 'SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at DESC', args: [] });
    return Response.json({ users: result.rows });
  } catch (e) {
    console.error('[GET /api/admin/users]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
