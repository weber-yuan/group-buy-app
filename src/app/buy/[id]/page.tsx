'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import { formatDate, getDaysLeft, parseImages } from '@/lib/utils';

interface Option {
  id: number;
  label: string;
  name: string;
  description: string;
  image_url?: string;
}

interface GroupBuy {
  id: number;
  title: string;
  description: string;
  image_url: string;
  organizer_name: string;
  end_date: string;
  is_locked: number;
}

export default function BuyPage() {
  const params = useParams();
  const id = params.id as string;

  const [gb, setGb] = useState<GroupBuy | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch(`/api/group-buys/${id}`)
      .then(r => r.ok ? r.json() : r.text().then(() => ({})))
      .then((d: Record<string, unknown>) => {
        if (d && !d.error) {
          const gbData = (d.groupBuy as Record<string, unknown>) || d;
          const opts = (d.options || (gbData.options as Option[]) || []) as Option[];
          const { options: _opts, ...gbInfo } = gbData;
          void _opts;
          setGb(gbInfo as GroupBuy);
          setOptions(opts);
          const initQ: Record<number, number> = {};
          for (const opt of opts) initQ[opt.id] = 0;
          setQuantities(initQ);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const itemsList = options.map(opt => ({ option_id: opt.id, quantity: quantities[opt.id] || 0 }));
    const hasAny = itemsList.some(it => it.quantity > 0);
    if (!hasAny) { setError('請至少選擇一個品項'); return; }

    setSubmitting(true);
    const res = await fetch(`/api/group-buys/${id}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_name: name, items: itemsList })
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setSuccess(true);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white/60">載入中...</div>;
  if (!gb) return <div className="flex items-center justify-center min-h-screen text-white/60">找不到此團購</div>;

  const daysLeft = getDaysLeft(gb.end_date);
  const locked = gb.is_locked || daysLeft < 0;

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <GlassCard className="p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">報名成功！</h2>
          <p className="text-white/60 mb-6">您的訂單已送出，等待發起人確認。</p>
          <button onClick={() => {
            setSuccess(false);
            setName('');
            const q: Record<number, number> = {};
            options.forEach(o => { q[o.id] = 0; });
            setQuantities(q);
          }} className="btn-secondary w-full">
            再報一份
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Group buy info */}
      <GlassCard className="overflow-hidden mb-6">
        {(() => {
          const imgs = parseImages(gb.image_url);
          if (imgs.length === 0) return null;
          if (imgs.length === 1) return (
            <div className="h-48 overflow-hidden">
              <img src={imgs[0]} alt={gb.title} className="w-full h-full object-cover" />
            </div>
          );
          return (
            <div className="flex gap-1 h-48 overflow-hidden">
              {imgs.map((url, i) => (
                <img key={i} src={url} alt={`${gb.title} ${i + 1}`}
                  className="flex-1 object-cover" style={{ minWidth: 0 }} />
              ))}
            </div>
          );
        })()}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-2">{gb.title}</h1>
          {gb.description && <p className="text-white/60 mb-3">{gb.description}</p>}
          <div className="flex flex-wrap gap-3 text-sm text-white/50">
            <span>發起人：{gb.organizer_name}</span>
            <span>截止：{formatDate(gb.end_date)}</span>
            {!locked && <span className="text-indigo-300">⏰ 剩餘 {daysLeft} 天</span>}
          </div>
        </div>
      </GlassCard>

      {locked ? (
        <GlassCard className="p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-semibold text-white mb-2">此團購已截止</h2>
          <p className="text-white/60">如有問題請聯絡發起人：{gb.organizer_name}</p>
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">填寫團購資料</h2>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <label className="block text-white/70 text-sm mb-1">您的姓名 *</label>
              <input className="glass-input" placeholder="請輸入姓名" value={name}
                onChange={e => setName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-3">選擇品項（數量 0 代表不選）</label>
              <div className="flex flex-col gap-3">
                {options.map(opt => (
                  <div key={opt.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {opt.image_url && (
                          <img src={opt.image_url} alt={opt.name}
                            className="w-14 h-14 object-cover rounded-lg shrink-0 border border-white/20" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-500/40 text-indigo-200 font-bold w-7 h-7 flex items-center justify-center rounded-full text-sm shrink-0">
                              {opt.label}
                            </span>
                            <span className="text-white font-medium">{opt.name}</span>
                          </div>
                          {opt.description && (
                            <p className="text-white/50 text-xs mt-1 ml-9">{opt.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button"
                        onClick={() => setQuantities(p => ({ ...p, [opt.id]: Math.max(0, (p[opt.id] || 0) - 1) }))}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg"
                      >−</button>
                      <span className="w-8 text-center text-white font-bold text-lg">{quantities[opt.id] || 0}</span>
                      <button type="button"
                        onClick={() => setQuantities(p => ({ ...p, [opt.id]: (p[opt.id] || 0) + 1 }))}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="btn-primary w-full text-base" disabled={submitting}>
              {submitting ? '送出中...' : '填寫完成'}
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
}
