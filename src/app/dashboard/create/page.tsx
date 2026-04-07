'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GroupBuyForm, { GroupBuyFormData, resolveFormImages, resolveOptionImage } from '@/components/GroupBuyForm';

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login');
    });
  }, [router]);

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
          label: opt.label,
          name: opt.name,
          description: opt.description,
          image_url: await resolveOptionImage(opt),
        }))
      );
      const res = await fetch('/api/group-buys', {
        method: 'POST',
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
      router.push(`/dashboard/${data.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">建立新團購</h1>
      <GroupBuyForm
        submitLabel="建立團購"
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
