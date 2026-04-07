import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

  const db = getDb();
  const groupBuys = db.prepare(`
    SELECT g.*, u.display_name as organizer_name,
           (SELECT COUNT(*) FROM orders o WHERE o.group_buy_id = g.id) as order_count
    FROM group_buys g JOIN users u ON g.organizer_id = u.id ORDER BY g.created_at DESC
  `).all();
  return Response.json({ groupBuys });
}
