import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) return Response.json({ error: '請輸入帳號和密碼' }, { status: 400 });

    const db = getDb();
    const result = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
    const user = result.rows[0] as unknown as {
      id: number; username: string; display_name: string; password_hash: string; role: string;
    } | undefined;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return Response.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    const token = signToken({ id: user.id, username: user.username, display_name: user.display_name, role: user.role });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (e) {
    console.error('[POST /api/auth/login]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
