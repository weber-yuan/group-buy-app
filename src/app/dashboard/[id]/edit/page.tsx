'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import GroupBuyForm, { GroupBuyFormData, resolveFormImages, resolveOptionImage } from '@/components/GroupBuyForm';
import { parseImages } from '@/lib/utils';

interface RawGroupBuy {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  organizer_id: number;
  start_date: string;
  end_date: string;
  is_public: number;
  options: Array<{ id: number; label: string; name: string; description: string; image_url: string | null }>;
}

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<Partial<GroupBuyFormData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [gbRes, meRes] = await Promise.all([
      fetch(`/api/group-buys/${id}`),
      fetch('/api/auth/me'),
    ]);
    const meData = await meRes.json();
    if (!meData.user) { router.push('/login'); return; }

    if (!gbRes.ok) { setNotFound(true); return; }
    const gb: RawGroupBuy = await gbRes.json();

    if (gb.organizer_id !== meData.user.id && meData.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setInitialData({
      title: gb.title,
      description: gb.description ?? '',
      start_date: gb.start_date,
      end_date: gb.end_date,
      is_public: gb.is_public === 1,
      image_urls: parseImages(gb.image_url),
      options: (gb.options ?? []).map(o => ({
        id: o.id,
        label: o.label,
        name: o.name,
        description: o.description ?? '',
        image_url: o.image_url ?? '',
      })),
    });
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (form: GroupBuyFormData) => {
    if (form.options.some(o => !o.name.trim())) {
      setError('請填寫所有品項名稱');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const image_urls = await resolveFormImages(form);
      const optionsWithImages = await Promise.all(
        form.options.map(async opt => ({
          id: opt.id,
          label: opt.label,
          name: opt.name,
          description: opt.description,
          image_url: await resolveOptionImage(opt),
        }))
      );
      const res = await fetch(`/api/group-buys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          image_url: image_urls,
          start_date: form.start_date,
          end_date: form.end_date,
          is_public: form.is_public,
          options: optionsWithImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/dashboard/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  if (notFound) return (
    <div className="flex items-center justify-center min-h-screen text-white/60">找不到此團購</div>
  );

  if (!initialData) return (
    <div className="flex items-center justify-center min-h-screen text-white/60">載入中...</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/${id}`} className="text-white/50 hover:text-white text-sm">← 返回管理</Link>
        <h1 className="text-3xl font-bold text-white">編輯團購</h1>
      </div>
      <GroupBuyForm
        initialData={initialData}
        submitLabel="儲存變更"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/dashboard/${id}`)}
      />
    </div>
  );
}
