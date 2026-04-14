'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { formatDate, getDaysLeft } from '@/lib/utils';

interface OrderRow {
  order_id: number;
  participant_name: string;
  is_paid: number;
  submitted_at: string;
  group_buy_id: number;
  group_buy_slug: string;
  title: string;
  end_date: string;
  is_locked: number;
  organizer_name: string;
}

interface ItemRow {
  order_id: number;
  option_id: number;
  label: string;
  option_name: string;
  quantity: number;
}

interface Option {
  id: number;
  label: string;
  name: string;
}

interface EditState {
  orderId: number;
  participantName: string;
  quantities: Record<number, number>; // option_id -> quantity
  options: Option[];
  saving: boolean;
  error: string;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function load() {
    return fetch('/api/my-orders')
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        setOrders(d.orders ?? []);
        setItems(d.items ?? []);
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, [router]);

  const getItems = (orderId: number) => items.filter(it => it.order_id === orderId);

  async function startEdit(order: OrderRow) {
    // Fetch options for this group buy
    const res = await fetch(`/api/group-buys/${order.group_buy_id}`);
    const data = await res.json();
    const options: Option[] = data.options ?? [];
    const orderItems = getItems(order.order_id);
    const quantities: Record<number, number> = {};
    options.forEach(opt => {
      const found = orderItems.find(it => it.option_id === opt.id);
      quantities[opt.id] = found?.quantity ?? 0;
    });
    setEditState({
      orderId: order.order_id,
      participantName: order.participant_name,
      quantities,
      options,
      saving: false,
      error: '',
    });
  }

  async function saveEdit() {
    if (!editState) return;
    setEditState(s => s ? { ...s, saving: true, error: '' } : s);

    const itemsPayload = Object.entries(editState.quantities)
      .filter(([, qty]) => qty > 0)
      .map(([optionId, quantity]) => ({ option_id: Number(optionId), quantity }));

    if (itemsPayload.length === 0) {
      setEditState(s => s ? { ...s, saving: false, error: '至少需要一個品項數量' } : s);
      return;
    }

    const res = await fetch(`/api/my-orders/${editState.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_name: editState.participantName, items: itemsPayload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditState(s => s ? { ...s, saving: false, error: data.error } : s);
      return;
    }
    setEditState(null);
    setLoading(true);
    load();
  }

  async function deleteOrder(orderId: number) {
    setDeletingId(orderId);
    const res = await fetch(`/api/my-orders/${orderId}`, { method: 'DELETE' });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) { alert(data.error); return; }
    setOrders(prev => prev.filter(o => o.order_id !== orderId));
    setItems(prev => prev.filter(it => it.order_id !== orderId));
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white/60">載入中...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-white/50 hover:text-white text-sm">← 首頁</Link>
        <h1 className="text-3xl font-bold text-white">我參加的團購</h1>
      </div>

      {orders.length === 0 && (
        <GlassCard className="p-10 text-center text-white/60">
          還沒有參加任何團購
          <div className="mt-4">
            <Link href="/" className="btn-primary px-6 py-2 text-sm">去看看公開團購</Link>
          </div>
        </GlassCard>
      )}

      <div className="flex flex-col gap-4">
        {orders.map(order => {
          const daysLeft = getDaysLeft(order.end_date);
          const expired = order.is_locked || daysLeft < 0;
          const orderItems = getItems(order.order_id);
          const isEditing = editState?.orderId === order.order_id;

          return (
            <GlassCard key={order.order_id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-lg text-white">{order.title}</h3>
                  <p className="text-white/50 text-sm mt-0.5">發起人：{order.organizer_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {expired ? (
                    <span className="bg-gray-500/30 text-gray-300 text-xs px-2 py-1 rounded-full">已截止</span>
                  ) : (
                    <span className="bg-green-500/30 text-green-300 text-xs px-2 py-1 rounded-full">進行中</span>
                  )}
                  {order.is_paid ? (
                    <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">✅ 已繳費</span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full">⏳ 待繳費</span>
                  )}
                </div>
              </div>

              {/* Edit form */}
              {isEditing && editState ? (
                <div className="flex flex-col gap-3 mb-3 bg-white/5 rounded-lg p-4">
                  <div>
                    <label className="block text-white/60 text-xs mb-1">報名者名稱</label>
                    <input
                      className="glass-input text-sm"
                      value={editState.participantName}
                      onChange={e => setEditState(s => s ? { ...s, participantName: e.target.value } : s)}
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs mb-2">品項數量</label>
                    <div className="flex flex-col gap-2">
                      {editState.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between">
                          <span className="text-white/70 text-sm">{opt.label}. {opt.name}</span>
                          <div className="flex items-center gap-2">
                            <button type="button"
                              className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 text-sm"
                              onClick={() => setEditState(s => s ? { ...s, quantities: { ...s.quantities, [opt.id]: Math.max(0, (s.quantities[opt.id] ?? 0) - 1) } } : s)}>
                              −
                            </button>
                            <span className="w-6 text-center text-white text-sm">{editState.quantities[opt.id] ?? 0}</span>
                            <button type="button"
                              className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 text-sm"
                              onClick={() => setEditState(s => s ? { ...s, quantities: { ...s.quantities, [opt.id]: (s.quantities[opt.id] ?? 0) + 1 } } : s)}>
                              ＋
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {editState.error && <p className="text-red-400 text-xs">{editState.error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button className="btn-primary text-xs px-4 py-1.5 flex-1" onClick={saveEdit} disabled={editState.saving}>
                      {editState.saving ? '儲存中...' : '儲存'}
                    </button>
                    <button className="btn-secondary text-xs px-4 py-1.5 flex-1" onClick={() => setEditState(null)}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-white/40 text-xs mb-3">
                    報名者：{order.participant_name}・截止：{formatDate(order.end_date)}
                    {!expired && <span className="text-indigo-300 ml-2">⏰ 剩 {daysLeft} 天</span>}
                  </div>
                  {orderItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {orderItems.map((it, i) => (
                        <span key={i} className="bg-indigo-500/20 text-indigo-200 text-xs px-2.5 py-1 rounded-full">
                          {it.label}. {it.option_name} × {it.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Link href={`/buy/${order.group_buy_slug}`} className="btn-secondary text-xs px-4 py-1.5">
                  查看團購
                </Link>
                {!expired && !isEditing && (
                  <>
                    <button
                      className="btn-primary text-xs px-4 py-1.5"
                      onClick={() => startEdit(order)}
                    >
                      編輯
                    </button>
                    <button
                      className="text-xs px-4 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={() => { if (confirm('確定要刪除此訂單？')) deleteOrder(order.order_id); }}
                      disabled={deletingId === order.order_id}
                    >
                      {deletingId === order.order_id ? '刪除中...' : '刪除'}
                    </button>
                  </>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
