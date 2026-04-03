import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CountriesCatalog from '~/components/CountriesCatalog';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    scroll: _scroll,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    scroll?: boolean;
  }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const countries: CatalogCountry[] = [
  {
    code: 'FR',
    cca3: 'FRA',
    name: 'France',
    officialName: 'French Republic',
    capital: 'Paris',
    region: 'Europe',
    subregion: 'Western Europe',
    continents: ['Europe'],
    population: 68000000,
    languages: ['French'],
    currencies: ['Euro'],
    flagEmoji: '🇫🇷',
    path: null,
    focusBounds: null,
  },
];

describe('CountriesCatalog', () => {
  it('renders each country card as a link to its details page', () => {
    render(
      <CountriesCatalog
        countries={countries}
        locale="en"
        copy={{
          searchPlaceholder: 'Search countries',
          allRegions: 'All regions',
          countriesShown: '{count} countries shown',
          officialLabel: 'Official name',
          capitalLabel: 'Capital',
          regionLabel: 'Region',
          populationLabel: 'Population',
          languagesLabel: 'Languages',
          emptyState: 'No countries found',
        }}
      />,
    );

    const franceLink = screen.getByRole('link', { name: /france/i });

    expect(franceLink).toHaveAttribute('href', '/en/country/fr');
  });
});
