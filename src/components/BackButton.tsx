'use client';

import { useRouter } from 'next/navigation';

export function BackButton({ text }: { text: string }) {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.back()} 
      className="flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-[var(--color-rose-600)] transition-colors mb-4"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      {text}
    </button>
  );
}
