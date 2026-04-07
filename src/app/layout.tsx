import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: '團購平台',
  description: '輕鬆發起與參加團購',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white">
        <Navbar />
        <main className="pt-14 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
