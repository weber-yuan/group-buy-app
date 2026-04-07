import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

  const db = getDb();
  db.prepare('DELETE FROM group_buys WHERE id = ?').run(id);
  return Response.json({ ok: true });
}
