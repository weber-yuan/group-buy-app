import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = db.prepare('SELECT * FROM group_buys WHERE slug = ? OR id = ?').get(
      id, parseInt(id, 10) || -1
    ) as { id: number; organizer_id: number } | undefined;
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: '無權限' }, { status: 403 });
    }

    const orders = db.prepare(
      'SELECT o.*, u.display_name as paid_by_name FROM orders o LEFT JOIN users u ON o.paid_by = u.id WHERE o.group_buy_id = ? ORDER BY o.submitted_at DESC'
    ).all(gb.id) as Array<{ id: number; [key: string]: unknown }>;

    const items = db.prepare(
      'SELECT oi.*, opt.label, opt.name as option_name FROM order_items oi JOIN options opt ON oi.option_id = opt.id WHERE oi.order_id IN (SELECT id FROM orders WHERE group_buy_id = ?)'
    ).all(gb.id) as Array<{ order_id: number; [key: string]: unknown }>;

    return Response.json({ orders, items });
  } catch (e) {
    console.error('[GET /api/group-buys/[id]/orders]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const gb = db.prepare('SELECT * FROM group_buys WHERE slug = ? OR id = ?').get(
      id, parseInt(id, 10) || -1
    ) as { id: number; is_locked: number } | undefined;
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.is_locked) return Response.json({ error: '此團購已鎖定，不再接受訂單' }, { status: 400 });

    const body = await request.json();
    const { participant_name, items } = body;

    if (!participant_name || !items || !Array.isArray(items)) {
      return Response.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const hasQty = items.some((item: { quantity: number }) => item.quantity > 0);
    if (!hasQty) return Response.json({ error: '至少選擇一個品項' }, { status: 400 });

    const submitter = await getCurrentUser();
    const result = db.prepare(
      'INSERT INTO orders (group_buy_id, participant_name, user_id) VALUES (?, ?, ?)'
    ).run(gb.id, participant_name, submitter?.id ?? null);

    const orderId = result.lastInsertRowid as number;
    const stmt = db.prepare('INSERT INTO order_items (order_id, option_id, quantity) VALUES (?, ?, ?)');
    for (const item of items as Array<{ option_id: number; quantity: number }>) {
      if (item.quantity > 0) stmt.run(orderId, item.option_id, item.quantity);
    }

    return Response.json({ id: orderId });
  } catch (e) {
    console.error('[POST /api/group-buys/[id]/orders]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

