import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, display_name, password, email } = await request.json();
    if (!username || !display_name || !password) return Response.json({ error: '所有欄位必填' }, { status: 400 });
    if (password.length < 6) return Response.json({ error: '密碼至少 6 個字元' }, { status: 400 });

    const db = getDb();
    const existingResult = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
    if (existingResult.rows[0]) return Response.json({ error: '使用者名稱已被使用' }, { status: 400 });

    if (email) {
      const emailResult = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
      if (emailResult.rows[0]) return Response.json({ error: '此電子郵件已被使用' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const insertResult = await db.execute({
      sql: 'INSERT INTO users (username, display_name, password_hash, email) VALUES (?, ?, ?, ?)',
      args: [username, display_name, password_hash, email || null],
    });

    const token = signToken({ id: Number(insertResult.lastInsertRowid), username, display_name, role: 'user' });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res;
  } catch (e) {
    console.error('[POST /api/auth/register]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
