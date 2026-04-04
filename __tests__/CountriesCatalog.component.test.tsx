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
    area: 551695,
    languages: ['French'],
    currencies: ['Euro'],
    flagEmoji: '🇫🇷',
    path: null,
    focusBounds: null,
    mapCenter: null,
  },
  {
    code: 'JP',
    cca3: 'JPN',
    name: 'Japan',
    officialName: 'Japan',
    capital: 'Tokyo',
    region: 'Asia',
    subregion: 'Eastern Asia',
    continents: ['Asia'],
    population: 123900000,
    area: 377930,
    languages: ['Japanese'],
    currencies: ['Japanese yen'],
    flagEmoji: '🇯🇵',
    path: null,
    focusBounds: null,
    mapCenter: null,
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
    areaLabel: 'Surface area',
    languagesLabel: 'Languages',
    continentsLabel: 'Continents',
    currenciesLabel: 'Currencies',
    emptyState: 'No countries found',
    detailsCta: 'View details',
    loadingDetails: 'Loading details for {country}',
    compareAction: 'Compare',
    comparingAction: 'Selected',
    compareTitle: 'Compare countries',
    compareHint: 'Select at least 2 countries',
    compareEmpty: 'Choose countries to compare key facts.',
    compareClear: 'Clear',
    compareLimit: 'You can compare up to {count} countries at once.',
    compareEnable: 'Enable compare mode',
    compareDisable: 'Disable compare mode',
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

  it('lets you enable compare mode on demand and compare multiple countries', () => {
    render(
      <CountriesCatalog
        countries={countries}
        locale="en"
        copy={copy}
      />,
    );

    expect(screen.queryByRole('heading', { name: /compare countries/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /compare france/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /enable compare mode/i }));

    expect(screen.getByRole('heading', { name: /compare countries/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /compare france/i }));
    fireEvent.click(screen.getByRole('button', { name: /compare japan/i }));
    expect(screen.getByRole('button', { name: /selected: france/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /selected: japan/i })).toBeInTheDocument();

    const comparisonTable = screen.getByRole('table');

    expect(within(comparisonTable).getByText('123,900,000')).toBeInTheDocument();
    expect(within(comparisonTable).getByText('551,695 km²')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
