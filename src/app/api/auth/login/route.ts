import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: '請輸入帳號和密碼' }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as {
    id: number; username: string; display_name: string; password_hash: string; role: string;
  } | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json({ error: '帳號或密碼錯誤' }, { status: 401 });
  }

  const token = signToken({ id: user.id, username: user.username, display_name: user.display_name, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });

  return Response.json({ ok: true, role: user.role });
}
