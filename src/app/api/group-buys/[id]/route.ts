import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

type GbRow = { id: number; organizer_id: number; [key: string]: unknown };

/** Accept both slug (new) and numeric id (old URLs for backward compat) */
function resolveGb(param: string): GbRow | undefined {
  const db = getDb();
  // Try slug first
  const bySlug = db.prepare(
    'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.slug = ?'
  ).get(param) as GbRow | undefined;
  if (bySlug) return bySlug;
  // Fall back to integer id
  const asInt = parseInt(param, 10);
  if (!isNaN(asInt)) {
    return db.prepare(
      'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.id = ?'
    ).get(asInt) as GbRow | undefined;
  }
  return undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const gb = resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });

    const options = db.prepare('SELECT * FROM options WHERE group_buy_id = ? ORDER BY sort_order').all(gb.id);
    return Response.json({ ...gb, options });
  } catch (e) {
    console.error('[GET /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: '無權限' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, image_url, start_date, end_date, is_public, options } = body;

    const imageUrlValue = Array.isArray(image_url)
      ? JSON.stringify(image_url.filter(Boolean))
      : (image_url || null);

    db.prepare(
      'UPDATE group_buys SET title=?, description=?, image_url=?, start_date=?, end_date=?, is_public=? WHERE id=?'
    ).run(title, description || null, imageUrlValue, start_date, end_date, is_public ? 1 : 0, gb.id);

    if (Array.isArray(options)) {
      const existing = db.prepare('SELECT id FROM options WHERE group_buy_id = ?').all(gb.id) as { id: number }[];
      const incomingIds = options.filter((o: { id?: number }) => o.id).map((o: { id?: number }) => o.id as number);
      for (const ex of existing) {
        if (!incomingIds.includes(ex.id)) {
          db.prepare('DELETE FROM options WHERE id = ?').run(ex.id);
        }
      }
      options.forEach((opt: { id?: number; label: string; name: string; description?: string; image_url?: string }, i: number) => {
        if (opt.id) {
          db.prepare('UPDATE options SET label=?, name=?, description=?, image_url=?, sort_order=? WHERE id=?')
            .run(opt.label, opt.name, opt.description || null, opt.image_url || null, i, opt.id);
        } else {
          db.prepare('INSERT INTO options (group_buy_id, label, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
            .run(gb.id, opt.label, opt.name, opt.description || null, opt.image_url || null, i);
        }
      });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: '無權限' }, { status: 403 });
    }

    db.prepare('DELETE FROM group_buys WHERE id = ?').run(gb.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
