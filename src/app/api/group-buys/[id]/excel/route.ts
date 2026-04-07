import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id: slug } = await params;
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

  const db = getDb();
  const gb = db.prepare('SELECT * FROM group_buys WHERE slug = ? OR id = ?').get(
    slug, parseInt(slug, 10) || -1
  ) as { id: number; organizer_id: number; title: string } | undefined;
  if (!gb) return NextResponse.json({ error: '找不到此團購' }, { status: 404 });
  if (gb.organizer_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  const options = db.prepare('SELECT * FROM options WHERE group_buy_id = ? ORDER BY sort_order').all(gb.id) as {
    id: number; label: string; name: string
  }[];

  const orders = db.prepare(`
    SELECT o.*, u.display_name as paid_by_name
    FROM orders o
    LEFT JOIN users u ON o.paid_by = u.id
    WHERE o.group_buy_id = ?
    ORDER BY o.submitted_at
  `).all(gb.id) as { id: number; participant_name: string; is_paid: number; submitted_at: string }[];

  const orderIds = orders.map(o => o.id);
  let items: { order_id: number; option_id: number; quantity: number }[] = [];
  if (orderIds.length > 0) {
    items = db.prepare(`
      SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})
    `).all(...orderIds) as typeof items;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: orders
  const headers = ['姓名', ...options.map(o => `${o.label}. ${o.name}`), '已繳費', '提交時間'];
  const sheet1Data = [headers];
  for (const order of orders) {
    const row: (string | number)[] = [order.participant_name];
    for (const opt of options) {
      const item = items.find(it => it.order_id === order.id && it.option_id === opt.id);
      row.push(item ? item.quantity : 0);
    }
    row.push(order.is_paid ? '是' : '否');
    row.push(order.submitted_at);
    sheet1Data.push(row as string[]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, '參加名單');

  // Sheet 2: summary
  const sheet2Data = [['品項', '人數', '總數量']];
  for (const opt of options) {
    const optItems = items.filter(it => it.option_id === opt.id);
    const count = optItems.length;
    const total = optItems.reduce((sum, it) => sum + it.quantity, 0);
    sheet2Data.push([`${opt.label}. ${opt.name}`, String(count), String(total)]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, '統計摘要');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = encodeURIComponent(`${gb.title}_名單.xlsx`);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`
    }
  });
}
