'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import { formatDate } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface GroupBuy {
  id: number;
  title: string;
  organizer_name: string;
  end_date: string;
  is_locked: number;
  is_public: number;
  order_count: number;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'gb' | 'users'>('gb');
  const [msg, setMsg] = useState('');
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'admin') { router.push('/'); return; }
      loadAll();
    });
  }, [router]);

  const loadAll = () => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/group-buys').then(r => r.json())
    ]).then(([ud, gd]) => {
      setUsers(ud.users || []);
      setGroupBuys(gd.groupBuys || []);
      setLoading(false);
    });
  };

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const resetPassword = async (uid: number) => {
    if (newPassword.length < 6) { notify('密碼至少 6 個字元'); return; }
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) { notify('密碼已重設'); setResetingId(null); setNewPassword(''); }
    else { const d = await res.json(); notify(d.error); }
  };

  const deleteUser = async (uid: number, name: string) => {
    if (!confirm(`確定要刪除使用者「${name}」？`)) return;
    const res = await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
    if (res.ok) { setUsers(p => p.filter(u => u.id !== uid)); notify('已刪除使用者'); }
    else { const d = await res.json(); notify(d.error); }
  };

  const deleteGroupBuy = async (gbId: number, title: string) => {
    if (!confirm(`確定要刪除團購「${title}」？`)) return;
    const res = await fetch(`/api/admin/group-buys/${gbId}`, { method: 'DELETE' });
    if (res.ok) { setGroupBuys(p => p.filter(g => g.id !== gbId)); notify('已刪除團購'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white/60">載入中...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {msg && <div className="fixed top-16 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm z-50">{msg}</div>}

      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">⚙️ 管理員後台</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4 text-center">
          <div className="text-3xl font-bold text-white">{users.length}</div>
          <div className="text-white/50 text-sm mt-1">使用者</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-3xl font-bold text-white">{groupBuys.length}</div>
          <div className="text-white/50 text-sm mt-1">團購</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{groupBuys.filter(g => !g.is_locked).length}</div>
          <div className="text-white/50 text-sm mt-1">進行中</div>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <div className="text-3xl font-bold text-indigo-300">{groupBuys.reduce((s, g) => s + g.order_count, 0)}</div>
          <div className="text-white/50 text-sm mt-1">總訂單</div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['gb', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
            {t === 'gb' ? `所有團購 (${groupBuys.length})` : `所有使用者 (${users.length})`}
          </button>
        ))}
      </div>

      {tab === 'gb' && (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="text-white/50 p-4">標題</th>
                  <th className="text-white/50 p-4">發起人</th>
                  <th className="text-white/50 p-4">截止</th>
                  <th className="text-white/50 p-4 text-center">訂單</th>
                  <th className="text-white/50 p-4 text-center">狀態</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {groupBuys.map(g => (
                  <tr key={g.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{g.title}</td>
                    <td className="p-4 text-white/60">{g.organizer_name}</td>
                    <td className="p-4 text-white/60">{formatDate(g.end_date)}</td>
                    <td className="p-4 text-center text-white/80">{g.order_count}</td>
                    <td className="p-4 text-center">
                      {g.is_locked ? <span className="text-red-400 text-xs">鎖定</span>
                                   : <span className="text-green-400 text-xs">開放</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => deleteGroupBuy(g.id, g.title)} className="text-red-400 hover:text-red-300 text-xs">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {tab === 'users' && (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="text-white/50 p-4">帳號</th>
                  <th className="text-white/50 p-4">顯示名稱</th>
                  <th className="text-white/50 p-4">角色</th>
                  <th className="text-white/50 p-4">註冊時間</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white font-mono">{u.username}</td>
                      <td className="p-4 text-white">{u.display_name}</td>
                      <td className="p-4">
                        {u.role === 'admin'
                          ? <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-full">admin</span>
                          : <span className="text-white/50 text-xs">user</span>}
                      </td>
                      <td className="p-4 text-white/50">{new Date(u.created_at).toLocaleDateString('zh-TW')}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-3">
                        <button
                          onClick={() => { setResetingId(resetingId === u.id ? null : u.id); setNewPassword(''); }}
                          className="text-indigo-400 hover:text-indigo-300 text-xs">
                          重設密碼
                        </button>
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u.id, u.display_name)} className="text-red-400 hover:text-red-300 text-xs">刪除</button>
                        )}
                      </td>
                    </tr>
                    {resetingId === u.id && (
                      <tr className="bg-white/5">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white/50 text-xs shrink-0">新密碼：</span>
                            <input
                              className="glass-input text-sm py-1 flex-1 max-w-xs"
                              type="password"
                              placeholder="至少 6 個字元"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && resetPassword(u.id)}
                              autoFocus
                            />
                            <button onClick={() => resetPassword(u.id)} className="btn-primary text-xs px-3 py-1">確認</button>
                            <button onClick={() => { setResetingId(null); setNewPassword(''); }} className="btn-secondary text-xs px-3 py-1">取消</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
