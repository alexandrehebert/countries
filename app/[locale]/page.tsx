import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Globe2, Landmark } from 'lucide-react';
import CountriesCatalog from '~/components/CountriesCatalog';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import { getCountriesCatalog } from '~/lib/server/countriesCatalog';

interface PageProps {
  params: Promise<{ locale: string }>;
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center shadow-[0_18px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm">
      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{helper}</p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: `/${locale}`,
    },
  };
}

export default async function CountriesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  const countries = await getCountriesCatalog(locale);

  const regionsCount = new Set(countries.map((country) => country.region).filter(Boolean)).size;
  const countriesWithCapitals = countries.filter((country) => country.capital !== '—').length;
  const sources = [
    {
      name: 'world-countries',
      href: 'https://www.npmjs.com/package/world-countries',
      description: t('sources_world_countries'),
    },
    {
      name: 'country-flag-icons',
      href: 'https://www.npmjs.com/package/country-flag-icons',
      description: t('sources_flags'),
    },
    {
      name: 'Natural Earth / world-countries-110m.geojson',
      href: 'https://www.naturalearthdata.com/',
      description: t('sources_map'),
    },
    {
      name: 'REST Countries',
      href: 'https://restcountries.com/',
      description: t('sources_population'),
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 12% 14%, rgba(56, 189, 248, 0.18), transparent 32%)',
            'radial-gradient(circle at 86% 18%, rgba(251, 191, 36, 0.16), transparent 26%)',
            'radial-gradient(circle at 50% 78%, rgba(34, 197, 94, 0.10), transparent 28%)',
          ].join(','),
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="flex items-center justify-between opacity-0 animate-fade-in-down">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-300 backdrop-blur-sm">
            <Globe2 className="h-3.5 w-3.5 text-emerald-300" />
            {t('eyebrow')}
          </div>
          <LanguageSwitcher />
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div className="opacity-0 animate-fade-in-left">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              {t('description')}
            </p>
          </div>

          <div className="grid gap-3 opacity-0 animate-scale-in sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              label={t('stats_total_label')}
              value={String(countries.length)}
              helper={t('stats_total_helper')}
            />
            <StatCard
              label={t('stats_regions_label')}
              value={String(regionsCount)}
              helper={t('stats_regions_helper')}
            />
            <StatCard
              label={t('stats_capitals_label')}
              value={String(countriesWithCapitals)}
              helper={t('stats_capitals_helper')}
            />
          </div>
        </section>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <Landmark className="h-4 w-4 text-amber-300" />
            <span>{t('catalog_intro')}</span>
          </div>

          <CountriesCatalog
            countries={countries}
            locale={locale}
            copy={{
              searchPlaceholder: t('search_placeholder'),
              allRegions: t('all_regions'),
              countriesShown: t.raw('countries_shown') as string,
              officialLabel: t('official_label'),
              capitalLabel: t('capital_label'),
              regionLabel: t('region_label'),
              populationLabel: t('population_label'),
              areaLabel: t('area_label'),
              languagesLabel: t('languages_label'),
              continentsLabel: t('continents_label'),
              currenciesLabel: t('currencies_label'),
              emptyState: t('empty_state'),
              detailsCta: t('details_cta'),
              loadingDetails: t.raw('loading_details') as string,
              compareAction: t('compare_action'),
              comparingAction: t('comparing_action'),
              compareTitle: t('compare_title'),
              compareHint: t('compare_hint'),
              compareEmpty: t('compare_empty'),
              compareClear: t('compare_clear'),
              compareLimit: t.raw('compare_limit') as string,
              compareEnable: t('compare_enable'),
              compareDisable: t('compare_disable'),
            }}
          />
        </div>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
            <Landmark className="h-4 w-4 text-cyan-300" />
            <span>{t('sources_title')}</span>
          </div>
          <p className="text-sm text-slate-400">{t('sources_intro')}</p>

          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <li key={source.name} className="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-emerald-200 transition hover:text-emerald-100"
                >
                  {source.name}
                </a>
                <p className="mt-1 text-sm text-slate-300">{source.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
