'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) { router.push('/login'); return; }
      setDisplayName(d.user.display_name);
      setLoading(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不一致');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { display_name: displayName };
      if (newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setSuccess('儲存成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('發生錯誤，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-white/60 text-center py-20">載入中...</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">個人資料</h1>
      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div>
            <label className="block text-white/70 text-sm mb-1">顯示名稱</label>
            <input
              className="glass-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>

          <hr className="border-white/10" />

          <p className="text-white/50 text-sm">更改密碼（不更改請留空）</p>

          <div>
            <label className="block text-white/70 text-sm mb-1">目前密碼</label>
            <input
              className="glass-input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="輸入目前密碼"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">新密碼</label>
            <input
              className="glass-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="至少 6 個字元"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">確認新密碼</label>
            <input
              className="glass-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="再次輸入新密碼"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? '儲存中...' : '儲存變更'}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => router.back()}>
              返回
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
