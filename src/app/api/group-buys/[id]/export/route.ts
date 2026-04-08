import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gbResult = await db.execute({ sql: 'SELECT * FROM group_buys WHERE id = ?', args: [id] });
    const gb = gbResult.rows[0] as unknown as { id: number; organizer_id: number; title: string } | undefined;
    if (!gb) return Response.json({ error: '找不到' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return Response.json({ error: '無權限' }, { status: 403 });

    const optResult = await db.execute({ sql: 'SELECT * FROM options WHERE group_buy_id = ? ORDER BY sort_order', args: [id] });
    const options = optResult.rows as unknown as Array<{ id: number; label: string; name: string }>;

    const orderResult = await db.execute({ sql: 'SELECT * FROM orders WHERE group_buy_id = ? ORDER BY submitted_at', args: [id] });
    const orders = orderResult.rows as unknown as Array<{ id: number; participant_name: string; is_paid: number; submitted_at: string }>;

    const itemsResult = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE group_buy_id = ?)', args: [id] });
    const allItems = itemsResult.rows as unknown as Array<{ order_id: number; option_id: number; quantity: number }>;

    const wb = XLSX.utils.book_new();

    const headers = ['姓名', ...options.map(o => `${o.label}. ${o.name}`), '是否繳費', '提交時間'];
    const rows = orders.map(order => {
      const items = allItems.filter(i => i.order_id === order.id);
      const qtys = options.map(opt => {
        const found = items.find(i => i.option_id === opt.id);
        return found ? found.quantity : 0;
      });
      return [order.participant_name, ...qtys, order.is_paid ? '是' : '否', order.submitted_at];
    });
    const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws1, '訂單名單');

    const statHeaders = ['品項', '標籤', '人數', '總數量'];
    const statRows = options.map(opt => {
      const optItems = allItems.filter(i => i.option_id === opt.id);
      const people = optItems.length;
      const total = optItems.reduce((sum, i) => sum + i.quantity, 0);
      return [opt.name, opt.label, people, total];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([statHeaders, ...statRows]);
    XLSX.utils.book_append_sheet(wb, ws2, '統計');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = encodeURIComponent(`${gb.title}_訂單.xlsx`);

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    console.error('[GET /api/group-buys/[id]/export]', e);
    return Response.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
