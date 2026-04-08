import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT g.*, u.display_name as organizer_name, (SELECT COUNT(*) FROM orders o WHERE o.group_buy_id = g.id) as order_count FROM group_buys g JOIN users u ON g.organizer_id = u.id ORDER BY g.created_at DESC`,
      args: [],
    });
    return Response.json({ groupBuys: result.rows });
  } catch (e) {
    console.error('[GET /api/admin/group-buys]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
