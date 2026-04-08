import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { sendResetEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return Response.json({ error: '請輸入電子郵件' }, { status: 400 });

    const db = getDb();
    const userResult = await db.execute({ sql: 'SELECT id, display_name, email FROM users WHERE email = ?', args: [email] });
    const user = userResult.rows[0] as unknown as { id: number; display_name: string; email: string } | undefined;

    if (!user) return Response.json({ ok: true });

    await db.execute({ sql: 'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', args: [user.id] });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: 'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      args: [user.id, token, expiresAt],
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const result = await sendResetEmail(user.email, resetLink, user.display_name);

    if ((result as { dev?: boolean }).dev) return Response.json({ ok: true, devLink: resetLink });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/auth/forgot-password]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
