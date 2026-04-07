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
      const rows = db.prepare(
        'SELECT * FROM group_buys WHERE organizer_id = ? ORDER BY created_at DESC'
      ).all(user.id);
      return Response.json(rows);
    }

    const rows = db.prepare(
      'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.is_public = 1 ORDER BY g.created_at DESC'
    ).all();
    return Response.json(rows);
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

    if (!title || !start_date || !end_date) {
      return Response.json({ error: '必填欄位缺少' }, { status: 400 });
    }

    const db = getDb();

    // Generate a unique random slug (plain while loop — avoids strict TS uninitialised-var warning)
    let slug = Math.random().toString(36).slice(2, 10);
    while (db.prepare('SELECT id FROM group_buys WHERE slug = ?').get(slug)) {
      slug = Math.random().toString(36).slice(2, 10);
    }

    const imageUrlValue = Array.isArray(image_url)
      ? JSON.stringify(image_url.filter(Boolean))
      : (image_url || null);

    const result = db.prepare(
      'INSERT INTO group_buys (slug, title, description, image_url, organizer_id, start_date, end_date, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(slug, title, description || null, imageUrlValue, user.id, start_date, end_date, is_public ? 1 : 0);

    const groupBuyId = result.lastInsertRowid as number;

    if (Array.isArray(options)) {
      const stmt = db.prepare('INSERT INTO options (group_buy_id, label, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      options.forEach((opt: { label: string; name: string; description?: string; image_url?: string }, i: number) => {
        stmt.run(groupBuyId, opt.label, opt.name, opt.description || null, opt.image_url || null, i);
      });
    }

    return Response.json({ id: groupBuyId, slug });
  } catch (e) {
    console.error('[POST /api/group-buys]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
