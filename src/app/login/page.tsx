'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">登入</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">帳號</label>
            <input
              className="glass-input"
              placeholder="輸入帳號"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">密碼</label>
            <div className="relative">
              <input
                className="glass-input pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="輸入密碼"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
        <p className="text-center text-white/50 text-sm mt-3">
          <Link href="/forgot-password" className="text-white/40 hover:text-white/70">
            忘記密碼？
          </Link>
        </p>
        <p className="text-center text-white/50 text-sm mt-2">
          還沒有帳號？{' '}
          <Link href="/register" className="text-indigo-300 hover:text-white">
            立即註冊
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
