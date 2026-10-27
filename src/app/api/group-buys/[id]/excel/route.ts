import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db';
import ExcelJS from 'exceljs';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: slug } = await params;
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const db = getDb();
    const gbResult = await db.execute({
      sql: 'SELECT * FROM group_buys WHERE slug = ? OR id = ?',
      args: [slug, parseInt(slug, 10) || -1],
    });
    const gb = gbResult.rows[0] as unknown as { id: number; organizer_id: number; title: string } | undefined;
    if (!gb) return NextResponse.json({ error: '找不到此團購' }, { status: 404 });
    if (gb.organizer_id !== user.id && user.role !== 'admin') return NextResponse.json({ error: '無權限' }, { status: 403 });

    const optResult = await db.execute({ sql: 'SELECT * FROM options WHERE group_buy_id = ? ORDER BY sort_order', args: [gb.id] });
    const options = optResult.rows as unknown as { id: number; label: string; name: string }[];

    const orderResult = await db.execute({
      sql: 'SELECT o.*, u.display_name as paid_by_name FROM orders o LEFT JOIN users u ON o.paid_by = u.id WHERE o.group_buy_id = ? ORDER BY o.submitted_at',
      args: [gb.id],
    });
    const orders = orderResult.rows as unknown as { id: number; participant_name: string; is_paid: number; submitted_at: string }[];

    const orderIds = orders.map(o => o.id);
    let items: { order_id: number; option_id: number; quantity: number }[] = [];
    if (orderIds.length > 0) {
      const itemsResult = await db.execute({
        sql: `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`,
        args: orderIds,
      });
      items = itemsResult.rows as unknown as typeof items;
    }

    const wb = new ExcelJS.Workbook();

    const headers = ['姓名', ...options.map(o => `${o.label}. ${o.name}`), '已繳費', '提交時間'];
    const ws1 = wb.addWorksheet('參加名單');
    ws1.addRow(headers);
    for (const order of orders) {
      const row: (string | number)[] = [order.participant_name];
      for (const opt of options) {
        const item = items.find(it => it.order_id === order.id && it.option_id === opt.id);
        row.push(item ? item.quantity : 0);
      }
      row.push(order.is_paid ? '是' : '否');
      row.push(order.submitted_at);
      ws1.addRow(row);
    }

    const ws2 = wb.addWorksheet('統計摘要');
    ws2.addRow(['品項', '人數', '總數量']);
    for (const opt of options) {
      const optItems = items.filter(it => it.option_id === opt.id);
      const count = optItems.length;
      const total = optItems.reduce((sum, it) => sum + it.quantity, 0);
      ws2.addRow([`${opt.label}. ${opt.name}`, count, total]);
    }

    const buf = await wb.xlsx.writeBuffer();
    const filename = encodeURIComponent(`${gb.title}_名單.xlsx`);

    return new NextResponse(buf as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    console.error('[GET excel]', e);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
