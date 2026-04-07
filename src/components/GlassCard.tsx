'use client';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = '' }: Props) {
  return (
    <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}
