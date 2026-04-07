import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();
  if (!token || !password) return Response.json({ error: '缺少必要參數' }, { status: 400 });
  if (password.length < 6) return Response.json({ error: '密碼至少 6 個字元' }, { status: 400 });

  const db = getDb();
  const record = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0'
  ).get(token) as { id: number; user_id: number; expires_at: string } | undefined;

  if (!record) return Response.json({ error: '連結無效或已使用' }, { status: 400 });
  if (new Date(record.expires_at) < new Date()) {
    return Response.json({ error: '連結已過期，請重新申請' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, record.user_id);
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

  return Response.json({ ok: true });
}
