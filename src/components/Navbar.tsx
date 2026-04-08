'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-white/90 hover:text-white transition-colors">
          🛒 團購平台首頁
        </Link>
        <div className="hidden sm:flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                我開的團購
              </Link>
              <Link href="/my-orders" className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                我參加的團購
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="px-3 py-1.5 text-sm text-yellow-300/80 hover:text-yellow-300 transition-colors rounded-lg hover:bg-white/10">
                  管理員
                </Link>
              )}
              <Link href="/dashboard/profile" className="px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all min-h-[36px] flex items-center gap-1">
                <span>👤</span>
                <span>{user.display_name}</span>
              </Link>
              <button onClick={logout} className="px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all min-h-[36px]">
                登出
              </button>
            </>
          ) : (
            <>
              <span className="text-white/40 text-sm">目前的使用者：遊客</span>
              <Link href="/login" className="px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                登入
              </Link>
              <Link href="/register" className="px-3 py-1.5 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                註冊
              </Link>
            </>
          )}
        </div>
        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 text-white/70 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden bg-white/10 backdrop-blur-md border-t border-white/10 px-4 py-3 flex flex-col gap-2">
          {user ? (
            <>
              <Link href="/dashboard" className="py-2 text-white/80" onClick={() => setMenuOpen(false)}>我開的團購</Link>
              <Link href="/my-orders" className="py-2 text-white/80" onClick={() => setMenuOpen(false)}>我參加的團購</Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="py-2 text-yellow-300" onClick={() => setMenuOpen(false)}>管理員</Link>
              )}
              <Link href="/dashboard/profile" className="py-2 text-white/60" onClick={() => setMenuOpen(false)}>個人資料（{user.display_name}）</Link>
              <button onClick={logout} className="py-2 text-left text-white/60">登出</button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-2 text-white/80" onClick={() => setMenuOpen(false)}>登入</Link>
              <Link href="/register" className="py-2 text-white/80" onClick={() => setMenuOpen(false)}>註冊</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
