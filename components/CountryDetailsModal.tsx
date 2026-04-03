'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface CountryDetailsModalProps {
  children: ReactNode;
  title: string;
  closeLabel: string;
}

export default function CountryDetailsModal({
  children,
  title,
  closeLabel,
}: CountryDetailsModalProps) {
  const router = useRouter();

  const closeModal = () => {
    router.back();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeModal]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={closeModal}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <div
        className="relative z-10 flex min-h-full items-start justify-center p-4 sm:p-6 lg:p-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="relative max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950/95 shadow-[0_30px_100px_rgba(2,6,23,0.6)]"
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={closeModal}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {children}
        </div>
      </div>
    </div>
  );
}
