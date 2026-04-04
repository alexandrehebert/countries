import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import CountryDetailsView from '~/components/CountryDetailsView';
import { getCatalogMapBackdrop, getCountryDetails } from '~/lib/server/countriesCatalog';

interface CountryDetailsPageProps {
  params: Promise<{ locale: string; code: string }>;
}

export async function generateMetadata({ params }: CountryDetailsPageProps): Promise<Metadata> {
  const { locale, code } = await params;
  const country = await getCountryDetails(locale, code);

  if (!country) {
    return {};
  }

  return {
    title: `${country.name} · Countries Atlas`,
    description: country.officialName,
    alternates: {
      canonical: `/${locale}/country/${country.code.toLowerCase()}`,
    },
  };
}

export default async function CountryDetailsPage({ params }: CountryDetailsPageProps) {
  const { locale, code } = await params;
  const [t, country, worldMapPath] = await Promise.all([
    getTranslations({ locale, namespace: 'catalog' }),
    getCountryDetails(locale, code),
    getCatalogMapBackdrop(),
  ]);

  if (!country) {
    notFound();
  }

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

      <div className="relative mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-sm">
          <CountryDetailsView
            country={country}
            locale={locale}
            backHref={`/${locale}`}
            worldMapPath={worldMapPath}
            copy={{
              backToCatalog: t('back_to_catalog'),
              officialLabel: t('official_label'),
              capitalLabel: t('capital_label'),
              regionLabel: t('region_label'),
              subregionLabel: t('subregion_label'),
              populationLabel: t('population_label'),
              areaLabel: t('area_label'),
              languagesLabel: t('languages_label'),
              currenciesLabel: t('currencies_label'),
              continentsLabel: t('continents_label'),
              codeLabel: t('code_label'),
            }}
          />
        </div>
      </div>
    </main>
  );
}
