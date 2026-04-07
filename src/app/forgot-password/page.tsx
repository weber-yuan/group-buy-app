'use client';
import { useState } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setSent(true);
    if (data.devLink) setDevLink(data.devLink);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">忘記密碼</h1>
        <p className="text-white/50 text-sm text-center mb-6">輸入您的電子郵件，我們會寄送重設連結</p>

        {!sent ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">電子郵件</label>
              <input
                className="glass-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '發送中...' : '發送重設連結'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <p className="text-white mb-2">已發送重設連結！</p>
            <p className="text-white/50 text-sm mb-4">請檢查您的收件匣（含垃圾郵件資料夾）</p>
            {devLink && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 text-left">
                <p className="text-yellow-300 text-xs font-bold mb-2">🧪 開發模式 — 直接點擊連結：</p>
                <a href={devLink} className="text-indigo-300 text-xs break-all hover:text-white">
                  {devLink}
                </a>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-white/50 text-sm mt-4">
          <Link href="/login" className="text-indigo-300 hover:text-white">← 返回登入</Link>
        </p>
      </GlassCard>
    </div>
  );
}
