import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = db.prepare('SELECT * FROM group_buys WHERE slug = ? OR id = ?').get(
      id, parseInt(id, 10) || -1
    ) as { id: number; organizer_id: number; is_locked: number } | undefined;
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: '無權限' }, { status: 403 });
    }

    const body = await request.json();
    const { lock, new_end_date } = body;

    if (lock) {
      db.prepare('UPDATE group_buys SET is_locked = 1 WHERE id = ?').run(gb.id);
    } else {
      if (!new_end_date) return Response.json({ error: '解鎖需提供新截止日' }, { status: 400 });
      db.prepare('UPDATE group_buys SET is_locked = 0, end_date = ? WHERE id = ?').run(new_end_date, gb.id);
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/group-buys/[id]/lock]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
