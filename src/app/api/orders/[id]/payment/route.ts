import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const orderResult = await db.execute({
      sql: 'SELECT o.*, g.organizer_id FROM orders o JOIN group_buys g ON o.group_buy_id = g.id WHERE o.id = ?',
      args: [id],
    });
    const order = orderResult.rows[0] as unknown as { organizer_id: number; is_paid: number } | undefined;
    if (!order) return Response.json({ error: '找不到' }, { status: 404 });
    if (order.organizer_id !== user.id && user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const { is_paid } = await request.json();
    if (is_paid) {
      await db.execute({ sql: 'UPDATE orders SET is_paid = 1, paid_by = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?', args: [user.id, id] });
    } else {
      await db.execute({ sql: 'UPDATE orders SET is_paid = 0, paid_by = NULL, paid_at = NULL WHERE id = ?', args: [id] });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/orders/[id]/payment]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
