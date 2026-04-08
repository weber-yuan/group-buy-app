import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';

type Params = { params: Promise<{ orderId: string }> };

async function getOwnedOrder(userId: number, orderId: number) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT o.*, gb.is_locked, gb.end_date FROM orders o
          JOIN group_buys gb ON o.group_buy_id = gb.id
          WHERE o.id = ? AND o.user_id = ?`,
    args: [orderId, userId],
  });
  return result.rows[0] as unknown as {
    id: number; group_buy_id: number; participant_name: string;
    is_locked: number; end_date: string;
  } | undefined;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const order = await getOwnedOrder(user.id, Number(orderId));
    if (!order) return NextResponse.json({ error: '找不到訂單或無權限' }, { status: 404 });
    if (order.is_locked || new Date(order.end_date) < new Date()) {
      return NextResponse.json({ error: '此團購已截止，無法修改' }, { status: 400 });
    }

    const { participant_name, items } = await req.json() as {
      participant_name?: string;
      items?: Array<{ option_id: number; quantity: number }>;
    };

    const db = getDb();
    if (participant_name?.trim()) {
      await db.execute({
        sql: 'UPDATE orders SET participant_name = ? WHERE id = ?',
        args: [participant_name.trim(), Number(orderId)],
      });
    }

    if (items && items.length > 0) {
      await db.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [Number(orderId)] });
      for (const item of items) {
        if (item.quantity > 0) {
          await db.execute({
            sql: 'INSERT INTO order_items (order_id, option_id, quantity) VALUES (?, ?, ?)',
            args: [Number(orderId), item.option_id, item.quantity],
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/my-orders/[orderId]]', e);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const order = await getOwnedOrder(user.id, Number(orderId));
    if (!order) return NextResponse.json({ error: '找不到訂單或無權限' }, { status: 404 });
    if (order.is_locked || new Date(order.end_date) < new Date()) {
      return NextResponse.json({ error: '此團購已截止，無法刪除' }, { status: 400 });
    }

    const db = getDb();
    await db.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [Number(orderId)] });
    await db.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [Number(orderId)] });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/my-orders/[orderId]]', e);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
