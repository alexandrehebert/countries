import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CountryDetailsView from '~/components/CountryDetailsView';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('~/components/CountryFlag', () => ({
  default: ({ country }: { country: string }) => <span data-testid="country-flag">{country}</span>,
}));

const defaultCopy = {
  officialLabel: 'Official name',
  capitalLabel: 'Capital',
  regionLabel: 'Region',
  subregionLabel: 'Subregion',
  populationLabel: 'Population',
  areaLabel: 'Surface area',
  languagesLabel: 'Languages',
  currenciesLabel: 'Currencies',
  continentsLabel: 'Continents',
  codeLabel: 'Codes',
};

function buildCountry(overrides: Partial<CatalogCountry>): CatalogCountry {
  return {
    code: 'FR',
    cca3: 'FRA',
    name: 'France',
    officialName: 'French Republic',
    capital: 'Paris',
    region: 'Europe',
    subregion: 'Western Europe',
    continents: ['Europe'],
    population: 68000000,
    area: 551695,
    languages: ['French'],
    currencies: ['Euro'],
    flagEmoji: '🇫🇷',
    path: null,
    focusBounds: null,
    mapCenter: null,
    ...overrides,
  };
}

describe('CountryDetailsView', () => {
  it('shows the subregion when the region and continent would otherwise repeat', () => {
    render(
      <CountryDetailsView
        country={buildCountry({})}
        locale="en"
        copy={defaultCopy}
      />,
    );

    expect(screen.getByText('Subregion')).toBeInTheDocument();
    expect(screen.getByText('Western Europe')).toBeInTheDocument();
  });

  it('keeps the broad region when continent data is already more specific', () => {
    render(
      <CountryDetailsView
        country={buildCountry({
          code: 'US',
          cca3: 'USA',
          name: 'United States',
          officialName: 'United States of America',
          capital: 'Washington, D.C.',
          region: 'Americas',
          subregion: 'North America',
          continents: ['North America'],
          population: 331000000,
          area: 9833520,
          languages: ['English'],
          currencies: ['United States dollar'],
          flagEmoji: '🇺🇸',
        })}
        locale="en"
        copy={defaultCopy}
      />,
    );

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('Americas')).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
  });

  it('shows a location preview even when no country shape icon is available', () => {
    render(
      <CountryDetailsView
        country={buildCountry({
          code: 'AD',
          cca3: 'AND',
          name: 'Andorra',
          officialName: 'Principality of Andorra',
          capital: 'Andorra la Vella',
          path: null,
          focusBounds: null,
          mapCenter: { x: 495, y: 146 },
        } as Partial<CatalogCountry>)}
        locale="en"
        worldMapPath="M24 24H976V536H24Z"
        copy={defaultCopy}
      />,
    );

    expect(screen.getByRole('img', { name: /andorra location map/i })).toBeInTheDocument();
  });
});
