'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <GlassCard className="w-full max-w-sm p-8 text-center">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-white">無效的重設連結</p>
        <Link href="/forgot-password" className="text-indigo-300 text-sm mt-3 block">重新申請</Link>
      </GlassCard>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('兩次密碼不一致'); return; }
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setDone(true);
    setTimeout(() => router.push('/login'), 3000);
  };

  if (done) {
    return (
      <GlassCard className="w-full max-w-sm p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">密碼已重設！</h2>
        <p className="text-white/60 text-sm">3 秒後自動跳轉到登入頁...</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-sm p-8">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">設定新密碼</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-white/70 text-sm mb-1">新密碼</label>
          <div className="relative">
            <input
              className="glass-input pr-10"
              type={showPw ? 'text' : 'password'}
              placeholder="至少 6 個字元"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" onClick={() => setShowPw(!showPw)}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-1">確認新密碼</label>
          <input
            className="glass-input"
            type={showPw ? 'text' : 'password'}
            placeholder="再次輸入密碼"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? '更新中...' : '確認設定'}
        </button>
      </form>
    </GlassCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-white/60">載入中...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
