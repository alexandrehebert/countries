'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LOCALES = [
  { locale: 'en', label: 'EN' },
  { locale: 'fr', label: 'FR' },
] as const;

function replaceLocale(pathname: string, nextLocale: string): string {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `/${nextLocale}`;
  }

  if (LOCALES.some(({ locale }) => locale === segments[0])) {
    segments[0] = nextLocale;
    return `/${segments.join('/')}`;
  }

  return `/${nextLocale}/${segments.join('/')}`;
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const activeLocale = pathname.split('/').filter(Boolean)[0] || 'en';

  return (
    <nav className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
      {LOCALES.map((item) => {
        const isActive = activeLocale === item.locale;

        return (
          <Link
            key={item.locale}
            href={replaceLocale(pathname, item.locale)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
