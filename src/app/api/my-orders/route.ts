import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

  const db = getDb();

  const rows = db.prepare(`
    SELECT
      o.id as order_id,
      o.participant_name,
      o.is_paid,
      o.submitted_at,
      gb.id as group_buy_id,
      gb.title,
      gb.end_date,
      gb.is_locked,
      u.display_name as organizer_name
    FROM orders o
    JOIN group_buys gb ON o.group_buy_id = gb.id
    JOIN users u ON gb.organizer_id = u.id
    WHERE o.user_id = ?
    ORDER BY o.submitted_at DESC
  `).all(user.id) as Array<{
    order_id: number;
    participant_name: string;
    is_paid: number;
    submitted_at: string;
    group_buy_id: number;
    title: string;
    end_date: string;
    is_locked: number;
    organizer_name: string;
  }>;

  const orderIds = rows.map(r => r.order_id);
  let items: Array<{ order_id: number; label: string; option_name: string; quantity: number }> = [];
  if (orderIds.length > 0) {
    items = db.prepare(`
      SELECT oi.order_id, opt.label, opt.name as option_name, oi.quantity
      FROM order_items oi
      JOIN options opt ON oi.option_id = opt.id
      WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
    `).all(...orderIds) as typeof items;
  }

  return Response.json({ orders: rows, items });
}
