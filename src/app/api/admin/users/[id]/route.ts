import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const { password } = await request.json();
    if (!password || password.length < 6) return Response.json({ error: '新密碼至少 6 個字元' }, { status: 400 });

    const password_hash = await bcrypt.hash(password, 10);
    await getDb().execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [password_hash, id] });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/admin/users/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });
    if (String(user.id) === id) return Response.json({ error: '無法刪除自己' }, { status: 400 });

    await getDb().execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/admin/users/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
