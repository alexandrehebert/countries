'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Globe, Globe2, Languages, MapPinned, Ruler, Search, X } from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

const MAX_COMPARE_COUNTRIES = 4;

interface CountriesCatalogProps {
  countries: CatalogCountry[];
  locale: string;
  copy: {
    searchPlaceholder: string;
    allRegions: string;
    countriesShown: string;
    officialLabel: string;
    capitalLabel: string;
    regionLabel: string;
    populationLabel: string;
    areaLabel: string;
    languagesLabel: string;
    continentsLabel: string;
    currenciesLabel: string;
    emptyState: string;
    detailsCta?: string;
    loadingDetails: string;
    compareAction: string;
    comparingAction: string;
    compareTitle: string;
    compareHint: string;
    compareEmpty: string;
    compareClear: string;
    compareLimit: string;
    compareEnable: string;
    compareDisable: string;
  };
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatArea(area: number, numberFormat: Intl.NumberFormat): string {
  if (!Number.isFinite(area) || area <= 0) {
    return '—';
  }

  return `${numberFormat.format(Math.round(area))} km²`;
}

export default function CountriesCatalog({ countries, locale, copy }: CountriesCatalogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigationTimeoutRef = useRef<number | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [pendingCountry, setPendingCountry] = useState<{ code: string; name: string } | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  useEffect(() => {
    setPendingCountry(null);

    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current !== null) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const regions = useMemo(() => {
    return Array.from(new Set(countries.map((country) => country.region).filter(Boolean))).sort((left, right) => (
      left.localeCompare(right, locale)
    ));
  }, [countries, locale]);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return countries.filter((country) => {
      if (region !== 'all' && country.region !== region) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = normalizeSearch([
        country.name,
        country.officialName,
        country.code,
        country.cca3,
        country.capital,
        country.region,
        country.subregion,
        country.continents.join(' '),
        country.languages.join(' '),
      ].join(' '));

      return haystack.includes(normalizedQuery);
    });
  }, [countries, query, region]);

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const selectedCountries = useMemo(() => {
    const byCode = new Map(countries.map((country) => [country.code, country]));

    return selectedCodes
      .map((code) => byCode.get(code))
      .filter((country): country is CatalogCountry => Boolean(country));
  }, [countries, selectedCodes]);

  const compareRows = useMemo(() => ([
    {
      label: copy.capitalLabel,
      getValue: (country: CatalogCountry) => country.capital || '—',
    },
    {
      label: copy.regionLabel,
      getValue: (country: CatalogCountry) => `${country.region}${country.subregion ? ` · ${country.subregion}` : ''}` || '—',
    },
    {
      label: copy.populationLabel,
      getValue: (country: CatalogCountry) => numberFormat.format(country.population),
    },
    {
      label: copy.areaLabel,
      getValue: (country: CatalogCountry) => formatArea(country.area, numberFormat),
    },
    {
      label: copy.languagesLabel,
      getValue: (country: CatalogCountry) => (country.languages.length > 0 ? country.languages.join(', ') : '—'),
    },
    {
      label: copy.continentsLabel,
      getValue: (country: CatalogCountry) => (country.continents.length > 0 ? country.continents.join(', ') : '—'),
    },
    {
      label: copy.currenciesLabel,
      getValue: (country: CatalogCountry) => (country.currencies.length > 0 ? country.currencies.join(', ') : '—'),
    },
  ]), [copy, numberFormat]);

  const compareLimitReached = selectedCountries.length >= MAX_COMPARE_COUNTRIES;

  function setCompareMode(enabled: boolean) {
    setCompareEnabled(enabled);

    if (!enabled) {
      setSelectedCodes([]);
    }
  }

  function toggleCompare(code: string) {
    setSelectedCodes((current) => {
      if (current.includes(code)) {
        return current.filter((entry) => entry !== code);
      }

      if (current.length >= MAX_COMPARE_COUNTRIES) {
        return current;
      }

      return [...current, code];
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full min-w-0 sm:max-w-md">
            <span className="sr-only">{copy.searchPlaceholder}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-xl border border-white/12 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-emerald-300/50 focus:bg-emerald-300/10"
            />
          </label>

          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="w-full rounded-xl border border-white/12 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-300/50 sm:w-auto"
          >
            <option value="all">{copy.allRegions}</option>
            {regions.map((regionOption) => (
              <option key={regionOption} value={regionOption}>
                {regionOption}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setCompareMode(!compareEnabled)}
            aria-pressed={compareEnabled}
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-semibold transition ${compareEnabled
              ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-50'
              : 'border-white/10 bg-slate-950/45 text-slate-200 hover:border-emerald-300/30 hover:text-white'}`}
          >
            {compareEnabled ? <Check className="h-3.5 w-3.5" /> : <Ruler className="h-3.5 w-3.5" />}
            {compareEnabled ? copy.compareDisable : copy.compareEnable}
          </button>

          <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 sm:block">
            {copy.countriesShown.replace('{count}', String(filteredCountries.length))}
          </p>
        </div>
      </div>

      {compareEnabled ? (
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.22)]" aria-labelledby="compare-countries-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="compare-countries-heading" className="text-sm font-semibold text-white">
                {copy.compareTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {selectedCountries.length === 0 ? copy.compareEmpty : copy.compareHint}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                {selectedCountries.length}/{MAX_COMPARE_COUNTRIES}
              </span>

              {selectedCountries.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedCodes([])}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-rose-300/35 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  {copy.compareClear}
                </button>
              ) : null}
            </div>
          </div>

          {selectedCountries.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCompare(country.code)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-sm text-emerald-50 transition hover:border-emerald-200/40 hover:bg-emerald-300/14"
                  aria-label={`${copy.comparingAction}: ${country.name}`}
                >
                  <CountryFlag
                    country={country.name}
                    countryCode={country.code}
                    fallbackEmoji={country.flagEmoji}
                    size="sm"
                  />
                  <span>{country.name} · {country.code}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          ) : null}

          {compareLimitReached ? (
            <p className="mt-3 text-xs text-amber-200">
              {copy.compareLimit.replace('{count}', String(MAX_COMPARE_COUNTRIES))}
            </p>
          ) : null}

          {selectedCountries.length >= 2 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-slate-950/35">
              <table className="min-w-full border-collapse text-left text-sm text-slate-100">
                <thead>
                  <tr className="border-b border-white/8 text-slate-300">
                    <th scope="col" className="px-3 py-3 text-[10px] uppercase tracking-[0.16em]">
                      <span className="sr-only">Metric</span>
                    </th>
                    {selectedCountries.map((country) => (
                      <th key={country.code} scope="col" className="min-w-44 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <CountryFlag
                            country={country.name}
                            countryCode={country.code}
                            fallbackEmoji={country.flagEmoji}
                            size="md"
                          />
                          <div>
                            <p className="font-semibold text-white">{country.name} · {country.code}</p>
                            <p className="text-xs text-slate-400">{country.cca3}</p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.label} className="border-b border-white/8 last:border-b-0">
                      <th scope="row" className="whitespace-nowrap px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {row.label}
                      </th>
                      {selectedCountries.map((country) => (
                        <td key={`${country.code}-${row.label}`} className="px-3 py-3 align-top text-slate-100">
                          {row.getValue(country)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-5 border-t border-white/8 pt-4 sm:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          {copy.countriesShown.replace('{count}', String(filteredCountries.length))}
        </p>
      </div>

      {filteredCountries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-10 text-center text-sm text-slate-300">
          {copy.emptyState}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCountries.map((country) => {
            const href = `/${locale}/country/${country.code.toLowerCase()}`;
            const isCompared = selectedCodes.includes(country.code);
            const isCompareDisabled = !isCompared && compareLimitReached;

            return (
              <div
                key={country.code}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_14px_45px_rgba(2,6,23,0.28)] transition hover:border-emerald-300/35 hover:bg-emerald-300/6"
              >
                <Link
                  href={href}
                  scroll={false}
                  aria-label={copy.detailsCta ? `${copy.detailsCta}: ${country.name}` : country.name}
                  onClick={(event) => {
                    if (
                      event.button !== 0
                      || event.metaKey
                      || event.ctrlKey
                      || event.shiftKey
                      || event.altKey
                      || event.defaultPrevented
                    ) {
                      return;
                    }

                    event.preventDefault();

                    if (navigationTimeoutRef.current !== null) {
                      window.clearTimeout(navigationTimeoutRef.current);
                    }

                    setPendingCountry({ code: country.code, name: country.name });
                    navigationTimeoutRef.current = window.setTimeout(() => {
                      router.push(href, { scroll: false });
                      navigationTimeoutRef.current = null;
                    }, 500);
                  }}
                  aria-busy={pendingCountry?.code === country.code}
                  className="relative block min-w-0 overflow-hidden p-4"
                >
                  <article className="flex h-full min-w-0 flex-col">
                    <div className="flex items-start gap-3">
                      <CountryFlag
                        country={country.name}
                        countryCode={country.code}
                        fallbackEmoji={country.flagEmoji}
                        size="lg"
                        className="h-12 w-12 rounded-2xl ring-2 ring-white/12"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-white">{country.name}</h3>
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                              {country.code} · {country.cca3}
                            </p>
                          </div>

                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-emerald-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {country.path && country.focusBounds ? (
                              <svg
                                aria-hidden="true"
                                viewBox={`${country.focusBounds.x} ${country.focusBounds.y} ${Math.max(1, country.focusBounds.width)} ${Math.max(1, country.focusBounds.height)}`}
                                className="h-[18px] w-[18px]"
                                preserveAspectRatio="xMidYMid meet"
                              >
                                <path d={country.path} fill="currentColor" />
                              </svg>
                            ) : (
                              <Globe2 className="h-4 w-4" />
                            )}
                          </span>
                        </div>

                        <p className="mt-2 break-words text-xs leading-5 text-slate-400">{country.officialName}</p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm">
                      <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        <div className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{copy.capitalLabel}</dt>
                          <dd className="break-words text-slate-100">{country.capital}</dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2">
                        <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        <div className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{copy.regionLabel}</dt>
                          <dd className="break-words text-slate-100">{country.region}{country.subregion ? ` · ${country.subregion}` : ''}</dd>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2">
                        <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <div className="min-w-0">
                          <dt className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{copy.populationLabel}</dt>
                          <dd className="break-words text-slate-100">{numberFormat.format(country.population)}</dd>
                        </div>
                      </div>
                    </dl>

                    <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/35 px-3 py-2">
                      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                        <Languages className="h-3.5 w-3.5" />
                        {copy.languagesLabel}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-100">
                        {country.languages.length > 0 ? country.languages.join(', ') : '—'}
                      </p>
                    </div>
                  </article>

                  {pendingCountry?.code !== country.code ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-slate-950/0 opacity-0 transition-all duration-200 group-hover:bg-slate-950/58 group-hover:opacity-100 group-focus-visible:bg-slate-950/58 group-focus-visible:opacity-100"
                    >
                      <Globe className="h-12 w-12 text-emerald-300 drop-shadow-[0_0_18px_rgba(110,231,183,0.35)]" />
                    </div>
                  ) : null}

                  {pendingCountry?.code === country.code ? (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-label={copy.loadingDetails.replace('{country}', country.name)}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/68 backdrop-blur-[2px]"
                    >
                      <Globe className="h-12 w-12 animate-spin text-emerald-300" />
                      <span className="sr-only">{copy.loadingDetails.replace('{country}', country.name)}</span>
                    </div>
                  ) : null}
                </Link>

                {compareEnabled ? (
                  <div className="border-t border-white/8 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleCompare(country.code)}
                      aria-pressed={isCompared}
                      aria-label={`${isCompared ? copy.comparingAction : copy.compareAction} ${country.name}`}
                      disabled={isCompareDisabled}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${isCompared
                        ? 'border-emerald-300/35 bg-emerald-300/12 text-emerald-50'
                        : 'border-white/10 bg-slate-950/35 text-slate-200 hover:border-emerald-300/30 hover:text-white'} ${isCompareDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {isCompared ? <Check className="h-4 w-4" /> : <Ruler className="h-4 w-4" />}
                      {isCompared ? copy.comparingAction : copy.compareAction}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
