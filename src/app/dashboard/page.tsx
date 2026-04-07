'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { formatDate, getDaysLeft } from '@/lib/utils';

interface GroupBuy {
  id: number;
  slug: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_public: number;
  is_locked: number;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ display_name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return; }
      setUser(d.user);
    });
    fetch('/api/group-buys?mine=1')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.groupBuys || []);
        setGroupBuys(list);
        setLoading(false);
      });
  }, [router]);

  const active = groupBuys.filter(gb => getDaysLeft(gb.end_date) >= 0 && !gb.is_locked);
  const history = groupBuys.filter(gb => getDaysLeft(gb.end_date) < 0 || gb.is_locked);

  const GroupBuyCard = ({ gb }: { gb: GroupBuy }) => {
    const daysLeft = getDaysLeft(gb.end_date);
    const expired = daysLeft < 0;
    return (
      <GlassCard className="p-5 hover:scale-[1.01] transition-transform">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-white text-base leading-tight">{gb.title}</h3>
          <div className="flex gap-1 ml-2 shrink-0">
            {gb.is_locked && <span className="bg-red-500/30 text-red-300 text-xs px-2 py-0.5 rounded-full">鎖定</span>}
            {gb.is_public ? <span className="bg-blue-500/30 text-blue-300 text-xs px-2 py-0.5 rounded-full">公開</span>
                          : <span className="bg-gray-500/30 text-gray-300 text-xs px-2 py-0.5 rounded-full">私人</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50 mb-4">
          <span>截止：{formatDate(gb.end_date)}</span>
          {!expired && !gb.is_locked && <span className="text-indigo-300">剩 {daysLeft} 天</span>}
          {expired && <span className="text-gray-400">已截止</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/${gb.slug}`} className="btn-primary flex-1 text-center text-sm">
            管理
          </Link>
          <Link href={`/buy/${gb.slug}`} className="btn-secondary flex-1 text-center text-sm">
            參加頁
          </Link>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">我的後台</h1>
          {user && <p className="text-white/60 mt-1">歡迎回來，{user.display_name}</p>}
        </div>
        <Link href="/dashboard/create" className="btn-primary text-sm">
          + 建立團購
        </Link>
      </div>

      {loading && <div className="text-white/60 text-center py-12">載入中...</div>}

      {!loading && (
        <>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">進行中 ({active.length})</h2>
            {active.length === 0
              ? <GlassCard className="p-6 text-center text-white/50">還沒有進行中的團購，<Link href="/dashboard/create" className="text-indigo-300">立即建立</Link></GlassCard>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{active.map(gb => <GroupBuyCard key={gb.id} gb={gb} />)}</div>
            }
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white/70 mb-4">歷史紀錄 ({history.length})</h2>
            {history.length === 0
              ? <GlassCard className="p-6 text-center text-white/40">暫無歷史紀錄</GlassCard>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{history.map(gb => <GroupBuyCard key={gb.id} gb={gb} />)}</div>
            }
          </section>
        </>
      )}
    </div>
  );
}
