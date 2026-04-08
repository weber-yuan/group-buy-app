import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    await getDb().execute({ sql: 'DELETE FROM group_buys WHERE id = ?', args: [id] });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/admin/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
