import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username, display_name, password, email } = await request.json();

  if (!username || !display_name || !password) {
    return Response.json({ error: '所有欄位必填' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: '密碼至少 6 個字元' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return Response.json({ error: '使用者名稱已被使用' }, { status: 400 });
  }
  if (email) {
    const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (emailTaken) return Response.json({ error: '此電子郵件已被使用' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, display_name, password_hash, email) VALUES (?, ?, ?, ?)'
  ).run(username, display_name, password_hash, email || null);

  const token = signToken({ id: result.lastInsertRowid as number, username, display_name, role: 'user' });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax' });

  return Response.json({ ok: true });
}
