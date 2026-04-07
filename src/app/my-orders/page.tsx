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
  title: string;
  end_date: string;
  is_locked: number;
  organizer_name: string;
}

interface ItemRow {
  order_id: number;
  label: string;
  option_name: string;
  quantity: number;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/my-orders')
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
  }, [router]);

  const getItems = (orderId: number) => items.filter(it => it.order_id === orderId);

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

              <div className="flex gap-2">
                <Link href={`/buy/${order.group_buy_id}`} className="btn-secondary text-xs px-4 py-1.5">
                  查看團購
                </Link>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
