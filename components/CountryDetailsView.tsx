import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Coins, Globe2, Languages, MapPinned } from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import type { CatalogCountry } from '~/lib/server/countriesCatalog';

interface CountryDetailsViewProps {
  country: CatalogCountry;
  locale: string;
  backHref?: string;
  copy: {
    backToCatalog?: string;
    officialLabel: string;
    capitalLabel: string;
    regionLabel: string;
    subregionLabel?: string;
    populationLabel: string;
    languagesLabel: string;
    currenciesLabel: string;
    continentsLabel: string;
    codeLabel: string;
  };
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-100 sm:text-base">{value}</p>
    </div>
  );
}

function TagSection({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(items.length > 0 ? items : ['—']).map((item) => (
          <span
            key={`${label}-${item}`}
            className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2.5 py-1 text-xs text-emerald-100"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CountryDetailsView({
  country,
  locale,
  backHref,
  copy,
}: CountryDetailsViewProps) {
  const numberFormat = new Intl.NumberFormat(locale);
  const continents = Array.from(new Set(country.continents.map((continent) => continent.trim()).filter(Boolean)));
  const continentsValue = continents.join(', ') || '—';
  const hasDuplicateRegionAndContinent = continents.length === 1 && continents[0] === country.region;
  const geographyLabel = hasDuplicateRegionAndContinent && country.subregion
    ? (copy.subregionLabel || copy.regionLabel)
    : copy.regionLabel;
  const geographyValue = hasDuplicateRegionAndContinent && country.subregion
    ? country.subregion
    : (country.region || '—');

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-7">
      {backHref && copy.backToCatalog ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {copy.backToCatalog}
        </Link>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)] sm:p-5">
          <div className="flex items-start gap-4">
            <CountryFlag
              country={country.name}
              countryCode={country.code}
              fallbackEmoji={country.flagEmoji}
              size="lg"
              className="h-16 w-16 rounded-3xl ring-2 ring-white/12"
            />

            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                {country.region}{country.subregion ? ` · ${country.subregion}` : ''}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {country.name}
              </h1>
              <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.officialLabel}</p>
                <p className="mt-1 text-sm text-slate-100 sm:text-base">{country.officialName}</p>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {copy.codeLabel}: {country.code} · {country.cca3}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoTile
              icon={<Building2 className="h-3.5 w-3.5 text-amber-300" />}
              label={copy.capitalLabel}
              value={country.capital}
            />
            <InfoTile
              icon={<Globe2 className="h-3.5 w-3.5 text-emerald-300" />}
              label={copy.populationLabel}
              value={numberFormat.format(country.population)}
            />
            <InfoTile
              icon={<MapPinned className="h-3.5 w-3.5 text-cyan-300" />}
              label={geographyLabel}
              value={geographyValue}
            />
            <InfoTile
              icon={<MapPinned className="h-3.5 w-3.5 text-sky-300" />}
              label={copy.continentsLabel}
              value={continentsValue}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)] sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{country.name}</p>
            <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/45 p-3">
              {country.path && country.focusBounds ? (
                <svg
                  aria-hidden="true"
                  viewBox={`${country.focusBounds.x} ${country.focusBounds.y} ${Math.max(1, country.focusBounds.width)} ${Math.max(1, country.focusBounds.height)}`}
                  className="h-40 w-full text-emerald-100"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path d={country.path} fill="currentColor" />
                </svg>
              ) : (
                <div className="flex h-40 items-center justify-center text-slate-400">
                  <Globe2 className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          <TagSection label={copy.languagesLabel} items={country.languages} />
          <TagSection label={copy.currenciesLabel} items={country.currencies} />
        </section>
      </div>
    </div>
  );
}
