import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, autoLockExpired } from '@/lib/db';
import { del } from '@vercel/blob';
import { parseImages } from '@/lib/utils';

type GbRow = { id: number; organizer_id: number; [key: string]: unknown };

async function resolveGb(param: string): Promise<GbRow | undefined> {
  const db = getDb();
  const bySlugResult = await db.execute({
    sql: 'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.slug = ?',
    args: [param],
  });
  if (bySlugResult.rows[0]) return bySlugResult.rows[0] as unknown as GbRow;
  const asInt = parseInt(param, 10);
  if (!isNaN(asInt)) {
    const byIdResult = await db.execute({
      sql: 'SELECT g.*, u.display_name as organizer_name FROM group_buys g JOIN users u ON g.organizer_id = u.id WHERE g.id = ?',
      args: [asInt],
    });
    return byIdResult.rows[0] as unknown as GbRow | undefined;
  }
  return undefined;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await autoLockExpired();
    const db = getDb();
    const gb = await resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });

    const optResult = await db.execute({ sql: 'SELECT * FROM options WHERE group_buy_id = ? ORDER BY sort_order', args: [gb.id] });
    return Response.json({ ...gb, options: optResult.rows });
  } catch (e) {
    console.error('[GET /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = await resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const body = await request.json();
    const { title, description, image_url, start_date, end_date, is_public, options } = body;

    const imageUrlValue = Array.isArray(image_url)
      ? JSON.stringify(image_url.filter(Boolean))
      : (image_url || null);

    await db.execute({
      sql: 'UPDATE group_buys SET title=?, description=?, image_url=?, start_date=?, end_date=?, is_public=? WHERE id=?',
      args: [title, description || null, imageUrlValue, start_date, end_date, is_public ? 1 : 0, gb.id],
    });

    if (Array.isArray(options)) {
      const existingResult = await db.execute({ sql: 'SELECT id FROM options WHERE group_buy_id = ?', args: [gb.id] });
      const existing = existingResult.rows as unknown as { id: number }[];
      const incomingIds = options.filter((o: { id?: number }) => o.id).map((o: { id?: number }) => o.id as number);
      for (const ex of existing) {
        if (!incomingIds.includes(ex.id)) {
          await db.execute({ sql: 'DELETE FROM options WHERE id = ?', args: [ex.id] });
        }
      }
      for (let i = 0; i < options.length; i++) {
        const opt = options[i] as { id?: number; label: string; name: string; description?: string; image_url?: string };
        if (opt.id) {
          await db.execute({
            sql: 'UPDATE options SET label=?, name=?, description=?, image_url=?, sort_order=? WHERE id=?',
            args: [opt.label, opt.name, opt.description || null, opt.image_url || null, i, opt.id],
          });
        } else {
          await db.execute({
            sql: 'INSERT INTO options (group_buy_id, label, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            args: [gb.id, opt.label, opt.name, opt.description || null, opt.image_url || null, i],
          });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gb = await resolveGb(id);
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    // Collect all Vercel Blob image URLs to delete
    const gbRow = gb as unknown as { image_url?: string };
    const optResult = await db.execute({ sql: 'SELECT image_url FROM options WHERE group_buy_id = ?', args: [gb.id] });
    const blobUrls: string[] = [
      ...parseImages(gbRow.image_url ?? null),
      ...(optResult.rows as unknown as { image_url: string | null }[]).flatMap(r => parseImages(r.image_url)),
    ].filter(url => url.includes('vercel-storage.com') || url.includes('blob.vercel'));

    // Delete child records
    const orderResult = await db.execute({ sql: 'SELECT id FROM orders WHERE group_buy_id = ?', args: [gb.id] });
    const orderIds = (orderResult.rows as unknown as { id: number }[]).map(r => r.id);
    if (orderIds.length > 0) {
      await db.execute({
        sql: `DELETE FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        args: orderIds,
      });
    }
    await db.execute({ sql: 'DELETE FROM orders WHERE group_buy_id = ?', args: [gb.id] });
    await db.execute({ sql: 'DELETE FROM options WHERE group_buy_id = ?', args: [gb.id] });
    await db.execute({ sql: 'DELETE FROM group_buys WHERE id = ?', args: [gb.id] });

    // Delete images from Vercel Blob (best-effort)
    if (blobUrls.length > 0) {
      await del(blobUrls).catch(e => console.error('[DELETE blob images]', e));
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/group-buys/[id]]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
