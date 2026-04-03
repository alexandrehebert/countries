'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Building2, Globe2, Languages, MapPinned, Search } from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

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
    languagesLabel: string;
    emptyState: string;
    detailsCta?: string;
  };
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function CountriesCatalog({ countries, locale, copy }: CountriesCatalogProps) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');

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

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
          {filteredCountries.map((country) => (
            <Link
              key={country.code}
              href={`/${locale}/country/${country.code.toLowerCase()}`}
              scroll={false}
              aria-label={copy.detailsCta ? `${copy.detailsCta}: ${country.name}` : country.name}
              className="group block min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_14px_45px_rgba(2,6,23,0.28)] transition hover:border-emerald-300/35 hover:bg-emerald-300/6"
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

                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-300/18 bg-emerald-300/8 px-3 py-2 text-sm font-medium text-emerald-100">
                  <span>{copy.detailsCta ?? 'View details'}</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
