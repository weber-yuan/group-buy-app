import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const mine = searchParams.get('mine');
    const user = await getCurrentUser();

    if (mine && user) {
      const result = await db.execute({ sql: 'SELECT * FROM group_buys WHERE organizer_id = ? ORDER BY created_at DESC', args: [user.id] });
      return Response.json(result.rows);
    }

    const result = await db.execute({ sql: 'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.is_public = 1 ORDER BY g.created_at DESC', args: [] });
    return Response.json(result.rows);
  } catch (e) {
    console.error('[GET /api/group-buys]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const body = await request.json();
    const { title, description, image_url, start_date, end_date, is_public, options } = body;
    if (!title || !start_date || !end_date) return Response.json({ error: '必填欄位缺少' }, { status: 400 });

    const db = getDb();

    let slug = Math.random().toString(36).slice(2, 10);
    while ((await db.execute({ sql: 'SELECT id FROM group_buys WHERE slug = ?', args: [slug] })).rows[0]) {
      slug = Math.random().toString(36).slice(2, 10);
    }

    const imageUrlValue = Array.isArray(image_url)
      ? JSON.stringify(image_url.filter(Boolean))
      : (image_url || null);

    const result = await db.execute({
      sql: 'INSERT INTO group_buys (slug, title, description, image_url, organizer_id, start_date, end_date, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [slug, title, description || null, imageUrlValue, user.id, start_date, end_date, is_public ? 1 : 0],
    });

    const groupBuyId = Number(result.lastInsertRowid);

    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i] as { label: string; name: string; description?: string; image_url?: string };
        await db.execute({
          sql: 'INSERT INTO options (group_buy_id, label, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          args: [groupBuyId, opt.label, opt.name, opt.description || null, opt.image_url || null, i],
        });
      }
    }

    return Response.json({ id: groupBuyId, slug });
  } catch (e) {
    console.error('[POST /api/group-buys]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
