import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 ${className}`}>
      {children}
    </div>
  );
}
