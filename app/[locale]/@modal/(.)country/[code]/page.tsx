import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import CountryDetailsModal from '~/components/CountryDetailsModal';
import CountryDetailsView from '~/components/CountryDetailsView';
import { getCountryDetails } from '~/lib/server/countriesCatalog';

interface CountryDetailsModalPageProps {
  params: Promise<{ locale: string; code: string }>;
}

export default async function CountryDetailsModalPage({ params }: CountryDetailsModalPageProps) {
  const { locale, code } = await params;
  const [t, country] = await Promise.all([
    getTranslations({ locale, namespace: 'catalog' }),
    getCountryDetails(locale, code),
  ]);

  if (!country) {
    notFound();
  }

  return (
    <CountryDetailsModal title={country.name} closeLabel={t('close_details')}>
      <CountryDetailsView
        country={country}
        locale={locale}
        copy={{
          officialLabel: t('official_label'),
          capitalLabel: t('capital_label'),
          regionLabel: t('region_label'),
          populationLabel: t('population_label'),
          languagesLabel: t('languages_label'),
          currenciesLabel: t('currencies_label'),
          continentsLabel: t('continents_label'),
          codeLabel: t('code_label'),
        }}
      />
    </CountryDetailsModal>
  );
}
