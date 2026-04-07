import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { sendResetEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return Response.json({ error: '請輸入電子郵件' }, { status: 400 });

  const db = getDb();
  const user = db.prepare('SELECT id, display_name, email FROM users WHERE email = ?').get(email) as {
    id: number; display_name: string; email: string;
  } | undefined;

  // Always return success to avoid email enumeration
  if (!user) return Response.json({ ok: true });

  // Invalidate old tokens
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const result = await sendResetEmail(user.email, resetLink, user.display_name);

  // In dev mode, return the link so user can click it directly
  if ((result as { dev?: boolean }).dev) {
    return Response.json({ ok: true, devLink: resetLink });
  }
  return Response.json({ ok: true });
}
