'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { formatDate, getDaysLeft, parseImages } from '@/lib/utils';

interface GroupBuy {
  id: number;
  slug: string;
  title: string;
  description: string;
  image_url: string;
  organizer_name: string;
  start_date: string;
  end_date: string;
  is_locked: number;
}

export default function HomePage() {
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/group-buys')
      .then(r => r.json())
      .then(d => {
        // Handle both array and wrapped response
        const list = Array.isArray(d) ? d : (d.groupBuys || []);
        setGroupBuys(list);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          🛒 團購平台
        </h1>
        <p className="text-white/60 text-lg mb-6">
          輕鬆發起團購，快速收單管理
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/create" className="btn-primary px-8 py-3 text-base">
            新增一個團購
          </Link>
        </div>
      </div>

      {/* Public group buys */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">公開團購</h2>

        {loading && (
          <div className="text-center text-white/60 py-12">載入中...</div>
        )}

        {!loading && groupBuys.length === 0 && (
          <GlassCard className="p-8 text-center text-white/60">
            目前沒有公開的團購活動
          </GlassCard>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupBuys.map(gb => {
            const daysLeft = getDaysLeft(gb.end_date);
            const expired = daysLeft < 0;
            return (
              <GlassCard key={gb.id} className="overflow-hidden hover:scale-[1.01] transition-transform">
                {parseImages(gb.image_url).length > 0 && (
                  <div className="h-40 overflow-hidden">
                    <img src={parseImages(gb.image_url)[0]} alt={gb.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-white leading-tight">{gb.title}</h3>
                    {gb.is_locked ? (
                      <span className="bg-red-500/30 text-red-300 text-xs px-2 py-1 rounded-full ml-2 shrink-0">已鎖定</span>
                    ) : expired ? (
                      <span className="bg-gray-500/30 text-gray-300 text-xs px-2 py-1 rounded-full ml-2 shrink-0">已截止</span>
                    ) : (
                      <span className="bg-green-500/30 text-green-300 text-xs px-2 py-1 rounded-full ml-2 shrink-0">進行中</span>
                    )}
                  </div>
                  {gb.description && (
                    <p className="text-white/60 text-sm mb-3 line-clamp-2">{gb.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                    <span>發起人：{gb.organizer_name}</span>
                    <span>截止：{formatDate(gb.end_date)}</span>
                  </div>
                  {!expired && !gb.is_locked && (
                    <p className="text-indigo-300 text-xs mb-3">⏰ 剩餘 {daysLeft} 天</p>
                  )}
                  <Link
                    href={`/buy/${gb.slug}`}
                    className="btn-primary w-full text-center text-sm block"
                  >
                    {gb.is_locked || expired ? '查看詳情' : '前往參加'}
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
