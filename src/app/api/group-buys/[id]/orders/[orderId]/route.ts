import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';

type Params = { params: Promise<{ id: string; orderId: string }> };

async function resolveGb(param: string) {
  const db = getDb();
  const result = await db.execute({
    sql: 'SELECT * FROM group_buys WHERE slug = ? OR id = ?',
    args: [param, parseInt(param, 10) || -1],
  });
  return result.rows[0] as unknown as { id: number; organizer_id: number } | undefined;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, orderId } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const gb = await resolveGb(id);
    if (!gb) return NextResponse.json({ error: '找不到此團購' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return NextResponse.json({ error: '無權限' }, { status: 403 });

    const { is_paid } = await req.json();
    const db = getDb();
    if (is_paid) {
      await db.execute({ sql: 'UPDATE orders SET is_paid = 1, paid_by = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?', args: [user.id, Number(orderId)] });
    } else {
      await db.execute({ sql: 'UPDATE orders SET is_paid = 0, paid_by = NULL, paid_at = NULL WHERE id = ?', args: [Number(orderId)] });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[PATCH orders/orderId]', e);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, orderId } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const gb = await resolveGb(id);
    if (!gb) return NextResponse.json({ error: '找不到此團購' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return NextResponse.json({ error: '無權限' }, { status: 403 });

    await getDb().execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [Number(orderId)] });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE orders/orderId]', e);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
