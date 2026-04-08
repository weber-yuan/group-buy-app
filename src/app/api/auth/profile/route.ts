import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getUserFromRequest, signToken, COOKIE_NAME } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) return Response.json({ error: '請先登入' }, { status: 401 });

    const { display_name, email, current_password, new_password } = await request.json();

    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [currentUser.id] });
    const user = result.rows[0] as unknown as {
      id: number; username: string; display_name: string; password_hash: string; role: string; email: string | null;
    } | undefined;
    if (!user) return Response.json({ error: '使用者不存在' }, { status: 404 });

    // Validate password change
    if (new_password) {
      if (!current_password) return Response.json({ error: '請輸入目前密碼' }, { status: 400 });
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return Response.json({ error: '目前密碼錯誤' }, { status: 400 });
      if (new_password.length < 6) return Response.json({ error: '新密碼至少 6 個字元' }, { status: 400 });
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const emailCheck = await db.execute({ sql: 'SELECT id FROM users WHERE email = ? AND id != ?', args: [email, currentUser.id] });
      if (emailCheck.rows[0]) return Response.json({ error: '此電子郵件已被使用' }, { status: 400 });
    }

    const newDisplayName = display_name?.trim() || user.display_name;
    const newEmail = email !== undefined ? (email?.trim() || null) : user.email;
    const newPasswordHash = new_password ? await bcrypt.hash(new_password, 10) : null;

    if (newPasswordHash) {
      await db.execute({
        sql: 'UPDATE users SET display_name = ?, email = ?, password_hash = ? WHERE id = ?',
        args: [newDisplayName, newEmail, newPasswordHash, currentUser.id],
      });
    } else {
      await db.execute({
        sql: 'UPDATE users SET display_name = ?, email = ? WHERE id = ?',
        args: [newDisplayName, newEmail, currentUser.id],
      });
    }

    // Re-issue JWT with updated display_name
    const newToken = signToken({ id: currentUser.id, username: currentUser.username, display_name: newDisplayName, role: currentUser.role });
    const res = NextResponse.json({ ok: true, display_name: newDisplayName });
    res.cookies.set(COOKIE_NAME, newToken, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (e) {
    console.error('[PATCH /api/auth/profile]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
