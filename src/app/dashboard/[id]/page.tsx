'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { formatDate, getDaysLeft } from '@/lib/utils';

interface Option {
  id: number;
  label: string;
  name: string;
  description: string;
}

interface OrderItem {
  order_id: number;
  option_id: number;
  quantity: number;
}

interface Order {
  id: number;
  participant_name: string;
  is_paid: number;
  submitted_at: string;
  paid_by_name?: string;
}

interface GroupBuy {
  id: number;
  title: string;
  description: string;
  image_url: string;
  organizer_id: number;
  start_date: string;
  end_date: string;
  is_public: number;
  is_locked: number;
  organizer_name: string;
  options?: Option[];
}

export default function ManagePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [gb, setGb] = useState<GroupBuy | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: number; role: string } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    const safeJson = (r: Response) => r.ok ? r.json() : r.text().then(() => ({}));
    Promise.all([
      fetch(`/api/group-buys/${id}`).then(safeJson),
      fetch(`/api/group-buys/${id}/orders`).then(safeJson),
      fetch('/api/auth/me').then(safeJson)
    ]).then(([gbData, ordersData, meData]) => {
      if (!meData?.user) { router.push('/login'); return; }
      setCurrentUser(meData.user);
      if (gbData && !gbData.error) {
        const { options: opts, ...gbInfo } = gbData;
        setGb(gbInfo as GroupBuy);
        setOptions(opts || []);
      }
      if (ordersData?.orders) {
        setOrders(ordersData.orders);
        setItems(ordersData.items || []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const isOwner = currentUser && gb && (currentUser.id === gb.organizer_id || currentUser.role === 'admin');

  const togglePaid = async (orderId: number, isPaid: boolean) => {
    await fetch(`/api/group-buys/${id}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_paid: isPaid })
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_paid: isPaid ? 1 : 0 } : o));
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm('確定要刪除這筆訂單？')) return;
    await fetch(`/api/group-buys/${id}/orders/${orderId}`, { method: 'DELETE' });
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setItems(prev => prev.filter(it => it.order_id !== orderId));
  };

  const toggleLock = async () => {
    if (!gb) return;
    const isLocking = !gb.is_locked;
    if (isLocking && !newEndDate) { setMsg('請設定截止日期'); return; }

    const body = isLocking
      ? { lock: true }
      : { lock: false, new_end_date: newEndDate || gb.end_date };

    const res = await fetch(`/api/group-buys/${id}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const d = await res.json(); setMsg(d.error); return; }
    setShowLockModal(false);
    setGb(prev => prev ? {
      ...prev,
      is_locked: isLocking ? 1 : 0,
      end_date: isLocking ? (newEndDate || prev.end_date) : (newEndDate || prev.end_date)
    } : prev);
    setMsg(isLocking ? '已鎖定團購' : '已解鎖團購');
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteGroupBuy = async () => {
    if (!gb) return;
    const code = gb.title.slice(0, 4);
    if (deleteConfirm !== code) { setMsg('確認碼不正確'); return; }
    await fetch(`/api/group-buys/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  };

  const downloadExcel = () => {
    window.open(`/api/group-buys/${id}/excel`, '_blank');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/buy/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOrderItems = (orderId: number) => items.filter(it => it.order_id === orderId);

  const getOptionTotal = (optId: number) => {
    const optItems = items.filter(it => it.option_id === optId);
    return {
      count: optItems.length,
      qty: optItems.reduce((s, it) => s + it.quantity, 0)
    };
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white/60">載入中...</div>;
  if (!gb) return <div className="flex items-center justify-center min-h-screen text-white/60">找不到此團購</div>;

  const daysLeft = getDaysLeft(gb.end_date);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-white/50 hover:text-white text-sm">← 後台</Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{gb.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {gb.is_locked ? <span className="bg-red-500/30 text-red-300 text-xs px-2 py-1 rounded-full">🔒 已鎖定</span>
                          : <span className="bg-green-500/30 text-green-300 text-xs px-2 py-1 rounded-full">✅ 開放中</span>}
            {gb.is_public ? <span className="bg-blue-500/30 text-blue-300 text-xs px-2 py-1 rounded-full">🌍 公開</span>
                          : <span className="bg-gray-500/30 text-gray-300 text-xs px-2 py-1 rounded-full">🔗 私人</span>}
            <span className="bg-white/10 text-white/60 text-xs px-2 py-1 rounded-full">
              截止 {formatDate(gb.end_date)} {daysLeft >= 0 ? `（剩 ${daysLeft} 天）` : '（已截止）'}
            </span>
          </div>
        </div>
        {msg && <div className="fixed top-16 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm z-50">{msg}</div>}
      </div>

      {/* Action buttons */}
      {isOwner && (
        <GlassCard className="p-4 mb-6 flex flex-wrap gap-2">
          <button onClick={copyLink} className="btn-secondary text-sm">
            {copied ? '✅ 已複製' : '🔗 複製報名連結'}
          </button>
          <Link href={`/dashboard/${id}/edit`} className="btn-secondary text-sm flex items-center">
            ✏️ 編輯團購
          </Link>
          <button onClick={downloadExcel} className="btn-secondary text-sm">
            📊 下載 Excel
          </button>
          <button onClick={() => setShowLockModal(true)} className={`text-sm ${gb.is_locked ? 'btn-secondary' : 'btn-danger'}`}>
            {gb.is_locked ? '🔓 解鎖' : '🔒 鎖定團購'}
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="btn-danger text-sm ml-auto">
            🗑️ 刪除團購
          </button>
        </GlassCard>
      )}

      {/* Stats */}
      <GlassCard className="p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">統計摘要</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{orders.length}</div>
            <div className="text-white/50 text-xs mt-1">總參加人數</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{orders.filter(o => o.is_paid).length}</div>
            <div className="text-white/50 text-xs mt-1">已繳費</div>
          </div>
          {options.map(opt => {
            const t = getOptionTotal(opt.id);
            return (
              <div key={opt.id} className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-xs text-white/40 mb-1">{opt.label}. {opt.name}</div>
                <div className="text-xl font-bold text-indigo-300">{t.qty}</div>
                <div className="text-white/50 text-xs">{t.count} 人・共 {t.qty} 個</div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Orders list */}
      <GlassCard className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">參加名單（{orders.length} 人）</h2>

        {orders.length === 0 && (
          <div className="text-center text-white/50 py-8">還沒有人報名</div>
        )}

        <div className="overflow-x-auto">
          {orders.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 pb-2 pr-3">姓名</th>
                  {options.map(opt => (
                    <th key={opt.id} className="text-center text-white/50 pb-2 px-2 min-w-[60px]">{opt.label}</th>
                  ))}
                  <th className="text-center text-white/50 pb-2 px-2">繳費</th>
                  <th className="text-left text-white/50 pb-2 pl-2">提交時間</th>
                  {isOwner && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const orderItems = getOrderItems(order.id);
                  return (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-3 text-white font-medium">{order.participant_name}</td>
                      {options.map(opt => {
                        const item = orderItems.find(it => it.option_id === opt.id);
                        return (
                          <td key={opt.id} className="py-3 px-2 text-center text-white/80">
                            {item ? item.quantity : <span className="text-white/20">-</span>}
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-center">
                        {isOwner ? (
                          <button
                            onClick={() => togglePaid(order.id, !order.is_paid)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${order.is_paid ? 'bg-green-500' : 'bg-white/20'}`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${order.is_paid ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                        ) : (
                          <span className={order.is_paid ? 'text-green-400' : 'text-white/30'}>
                            {order.is_paid ? '✅' : '—'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-2 text-white/40 text-xs whitespace-nowrap">
                        {new Date(order.submitted_at).toLocaleDateString('zh-TW')}
                      </td>
                      {isOwner && (
                        <td className="py-3 pl-2">
                          <button onClick={() => deleteOrder(order.id)} className="text-red-400 hover:text-red-300 text-xs">
                            刪除
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* Lock modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              {gb.is_locked ? '🔓 解鎖團購' : '🔒 鎖定團購'}
            </h3>
            {!gb.is_locked ? (
              <>
                <p className="text-white/60 text-sm mb-3">鎖定後將不接受新的報名</p>
                <label className="block text-white/70 text-sm mb-1">確認截止日期</label>
                <input type="date" className="glass-input mb-4" value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)} placeholder={gb.end_date} />
              </>
            ) : (
              <>
                <p className="text-white/60 text-sm mb-3">解鎖後重新開放報名，請設定新截止日期</p>
                <label className="block text-white/70 text-sm mb-1">新截止日期 *</label>
                <input type="date" className="glass-input mb-4" value={newEndDate}
                  onChange={e => setNewEndDate(e.target.value)} required />
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowLockModal(false)} className="btn-secondary flex-1">取消</button>
              <button onClick={toggleLock} className="btn-primary flex-1">確認</button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-400 mb-2">刪除團購</h3>
            <p className="text-white/60 text-sm mb-4">
              此操作無法復原！請輸入團購名稱前 4 個字確認：<br />
              <span className="text-white font-bold">「{gb.title.slice(0, 4)}」</span>
            </p>
            <input className="glass-input mb-4" placeholder="輸入確認碼" value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }} className="btn-secondary flex-1">取消</button>
              <button onClick={deleteGroupBuy} className="btn-danger flex-1">確認刪除</button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
