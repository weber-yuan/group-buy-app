'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', display_name: '', email: '', password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('兩次密碼不一致'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">註冊帳號</h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">帳號（4-20 位英數字）</label>
            <input
              className="glass-input"
              placeholder="e.g. john123"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">顯示名稱</label>
            <input
              className="glass-input"
              placeholder="e.g. 小明"
              value={form.display_name}
              onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">
              電子郵件 <span className="text-white/40">（選填，用於忘記密碼）</span>
            </label>
            <input
              className="glass-input"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">密碼（至少 6 字元）</label>
            <div className="relative">
              <input
                className="glass-input pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="輸入密碼"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" onClick={() => setShowPw(!showPw)}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1">確認密碼</label>
            <div className="relative">
              <input
                className="glass-input pr-10"
                type={showCp ? 'text' : 'password'}
                placeholder="再次輸入密碼"
                value={form.confirm_password}
                onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                required
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white" onClick={() => setShowCp(!showCp)}>
                {showCp ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '註冊中...' : '建立帳號'}
          </button>
        </form>
        <p className="text-center text-white/50 text-sm mt-4">
          已有帳號？{' '}
          <Link href="/login" className="text-indigo-300 hover:text-white">
            登入
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
