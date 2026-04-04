import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CountriesCatalog from '~/components/CountriesCatalog';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({
    push: pushMock,
  }),
}));

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

afterEach(() => {
  vi.useRealTimers();
  pushMock.mockReset();
});

describe('CountriesCatalog', () => {
  const copy = {
    searchPlaceholder: 'Search countries',
    allRegions: 'All regions',
    countriesShown: '{count} countries shown',
    officialLabel: 'Official name',
    capitalLabel: 'Capital',
    regionLabel: 'Region',
    populationLabel: 'Population',
    languagesLabel: 'Languages',
    emptyState: 'No countries found',
    detailsCta: 'View details',
    loadingDetails: 'Loading details for {country}',
  };

  it('renders each country card as a link to its details page', () => {
    render(
      <CountriesCatalog
        countries={countries}
        locale="en"
        copy={copy}
      />,
    );

    const franceLink = screen.getByRole('link', { name: /view details: france/i });

    expect(franceLink).toHaveAttribute('href', '/en/country/fr');
  });

  it('shows only the in-card loader immediately and delays navigation by 500ms', async () => {
    vi.useFakeTimers();

    render(
      <CountriesCatalog
        countries={countries}
        locale="en"
        copy={copy}
      />,
    );

    const franceLink = screen.getByRole('link', { name: /view details: france/i });

    fireEvent.click(franceLink);

    expect(within(franceLink).getByRole('status', { name: /loading details for france/i })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(499);
    expect(pushMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(pushMock).toHaveBeenCalledWith('/en/country/fr', { scroll: false });
  });
});
