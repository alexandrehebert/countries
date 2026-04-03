import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import countries, { type Country } from 'world-countries';
import populationByCode from '~/lib/data/countryPopulationByCode.json';

const CATALOG_VIEWBOX = { width: 1000, height: 560 };
const MIN_SHAPE_SIZE = 4;

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureProperties = Record<string, unknown>;
type FeatureLookupCandidate = { value: string; priority: number };

export interface CatalogCountry {
  code: string;
  cca3: string;
  name: string;
  officialName: string;
  capital: string;
  region: string;
  subregion: string;
  continents: string[];
  population: number;
  languages: string[];
  currencies: string[];
  flagEmoji: string;
  path: string | null;
  focusBounds: { x: number; y: number; width: number; height: number } | null;
}

let cachedEnglishCatalogPromise: Promise<CatalogCountry[]> | null = null;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function getLocalizedCountryName(country: Country, locale: string): string {
  if (locale === 'fr') {
    return country.translations?.fra?.common || country.name.common;
  }

  return country.name.common;
}

function getLocalizedOfficialName(country: Country, locale: string): string {
  if (locale === 'fr') {
    return country.translations?.fra?.official || country.name.official;
  }

  return country.name.official;
}

function getCountryNameCandidates(country: Country): string[] {
  return [
    country.cca2,
    country.cca3,
    country.ccn3,
    country.name.common,
    country.name.official,
    ...(country.altSpellings || []),
    country.translations?.fra?.common,
    country.translations?.fra?.official,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

function getFeatureCodeCandidates(properties: FeatureProperties): string[] {
  return [
    properties.ISO_A2,
    properties.ISO_A2_EH,
    properties.WB_A2,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toUpperCase());
}

function getFeatureNameCandidates(properties: FeatureProperties): FeatureLookupCandidate[] {
  return [
    { value: String(properties.ISO_A2 || ''), priority: 95 },
    { value: String(properties.ISO_A2_EH || ''), priority: 95 },
    { value: String(properties.WB_A2 || ''), priority: 95 },
    { value: String(properties.ISO_A3 || ''), priority: 90 },
    { value: String(properties.ISO_A3_EH || ''), priority: 90 },
    { value: String(properties.WB_A3 || ''), priority: 90 },
    { value: String(properties.ADM0_A3 || ''), priority: 90 },
    { value: String(properties.NAME || ''), priority: 100 },
    { value: String(properties.NAME_EN || ''), priority: 100 },
    { value: String(properties.NAME_FR || ''), priority: 100 },
    { value: String(properties.ADMIN || ''), priority: 100 },
    { value: String(properties.BRK_NAME || ''), priority: 92 },
    { value: String(properties.FORMAL_EN || ''), priority: 82 },
    { value: String(properties.FORMAL_FR || ''), priority: 82 },
    { value: String(properties.SOVEREIGNT || ''), priority: 40 },
  ].filter((candidate) => candidate.value.trim().length > 0);
}

function normalizeAntimeridianGeometry(
  feature: GeoFeature,
  generator: ReturnType<typeof geoPath>,
): GeoFeature {
  if (feature.geometry.type !== 'MultiPolygon') {
    return feature;
  }

  const polygons = feature.geometry.coordinates;
  const avgLons = polygons.map((polygon) => {
    const ring = polygon[0];
    if (!ring.length) return 0;
    return ring.reduce((sum, coord) => sum + (coord[0] as number), 0) / ring.length;
  });

  let largestIndex = 0;
  let largestArea = -1;

  for (let index = 0; index < polygons.length; index++) {
    const polygonFeature: GeoFeature = {
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: polygons[index] },
    };
    const area = Math.max(0, generator.area(polygonFeature));
    if (area > largestArea) {
      largestArea = area;
      largestIndex = index;
    }
  }

  if (avgLons[largestIndex] <= 90 || !avgLons.some((longitude) => longitude < -90)) {
    return feature;
  }

  return {
    ...feature,
    geometry: {
      type: 'MultiPolygon',
      coordinates: polygons.map((polygon, index) => {
        if (avgLons[index] >= -90) {
          return polygon;
        }

        return polygon.map((ring) => ring.map((coord) => [Number(coord[0]) + 360, coord[1]] as GeoJSON.Position));
      }),
    },
  };
}

function getFeatureFocusGeometry(
  feature: GeoFeature,
  generator: ReturnType<typeof geoPath>,
): GeoFeature {
  if (feature.geometry.type !== 'MultiPolygon') {
    return feature;
  }

  const polygons = feature.geometry.coordinates;
  if (!polygons.length) {
    return feature;
  }

  let totalArea = 0;
  let largestArea = -1;
  let largestPolygon: GeoJSON.Position[][] | null = null;
  let largestBounds: [[number, number], [number, number]] | null = null;

  for (const polygon of polygons) {
    const polygonFeature: GeoFeature = {
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: polygon },
    };
    const area = Math.max(0, generator.area(polygonFeature));
    totalArea += area;

    if (area > largestArea) {
      largestArea = area;
      largestPolygon = polygon;
      largestBounds = generator.bounds(polygonFeature);
    }
  }

  if (!largestPolygon || !largestBounds || totalArea <= 0) {
    return feature;
  }

  const fullBounds = generator.bounds(feature);
  const fullWidth = Math.max(0, fullBounds[1][0] - fullBounds[0][0]);
  const fullHeight = Math.max(0, fullBounds[1][1] - fullBounds[0][1]);
  const largestWidth = Math.max(0, largestBounds[1][0] - largestBounds[0][0]);
  const largestHeight = Math.max(0, largestBounds[1][1] - largestBounds[0][1]);
  const fullMaxDimension = Math.max(fullWidth, fullHeight);
  const largestMaxDimension = Math.max(largestWidth, largestHeight);
  const isMuchMoreSpreadThanLargest = largestMaxDimension > 0 && fullMaxDimension / largestMaxDimension > 2.5;

  const leftOffset = Math.max(0, largestBounds[0][0] - fullBounds[0][0]);
  const rightOffset = Math.max(0, fullBounds[1][0] - largestBounds[1][0]);
  const maxHorizontalOffset = Math.max(leftOffset, rightOffset);
  const hasDateLineOutlier = fullMaxDimension > 0 && maxHorizontalOffset / fullMaxDimension > 0.18;
  const largestAreaShare = largestArea / totalArea;

  if ((!isMuchMoreSpreadThanLargest && !hasDateLineOutlier) || largestAreaShare < 0.55) {
    return feature;
  }

  return {
    type: 'Feature',
    properties: feature.properties,
    geometry: { type: 'Polygon', coordinates: largestPolygon },
  };
}

async function loadGeoJson(): Promise<GeoJSON.FeatureCollection> {
  const filePath = join(process.cwd(), 'public/maps/world-countries-110m.geojson');
  const rawGeoData = await readFile(filePath, 'utf8');
  return JSON.parse(rawGeoData) as GeoJSON.FeatureCollection;
}

function buildFeatureLookup(features: GeoFeature[]) {
  const byCode = new Map<string, GeoFeature>();
  const byName = new Map<string, { feature: GeoFeature; priority: number }>();

  for (const feature of features) {
    const properties = (feature.properties || {}) as FeatureProperties;

    for (const code of getFeatureCodeCandidates(properties)) {
      if (/^[A-Z]{2}$/.test(code) && !byCode.has(code)) {
        byCode.set(code, feature);
      }
    }

    for (const candidate of getFeatureNameCandidates(properties)) {
      const normalized = normalizeText(candidate.value);
      if (!normalized) continue;

      const existing = byName.get(normalized);
      if (!existing || candidate.priority > existing.priority) {
        byName.set(normalized, { feature, priority: candidate.priority });
      }
    }
  }

  return {
    byCode,
    byName: new Map(Array.from(byName.entries(), ([key, value]) => [key, value.feature])),
  };
}

function resolveFeature(country: Country, lookup: ReturnType<typeof buildFeatureLookup>): GeoFeature | null {
  const code = country.cca2?.toUpperCase();
  if (code && lookup.byCode.has(code)) {
    return lookup.byCode.get(code) || null;
  }

  for (const candidate of getCountryNameCandidates(country)) {
    const feature = lookup.byName.get(normalizeText(candidate));
    if (feature) {
      return feature;
    }
  }

  return null;
}

function getCurrencies(country: Country): string[] {
  return Object.values(country.currencies || {})
    .map((currency) => currency?.name || '')
    .filter(Boolean);
}

function getLanguages(country: Country): string[] {
  return Object.values(country.languages || {})
    .map((language) => String(language))
    .filter(Boolean);
}

function getPopulation(country: Country): number {
  const populationCandidate = (country as Country & { population?: number }).population;

  if (typeof populationCandidate === 'number' && Number.isFinite(populationCandidate)) {
    return populationCandidate;
  }

  const countryCode = country.cca2?.toUpperCase();
  const fallbackPopulation = countryCode ? populationByCode[countryCode as keyof typeof populationByCode] : undefined;

  return typeof fallbackPopulation === 'number' && Number.isFinite(fallbackPopulation)
    ? fallbackPopulation
    : 0;
}

function toCatalogCountry(
  country: Country,
  locale: string,
  generator: ReturnType<typeof geoPath>,
  lookup: ReturnType<typeof buildFeatureLookup>,
): CatalogCountry | null {
  if (!country.cca2 || !country.cca3 || !country.flag || !country.name?.common) {
    return null;
  }

  const countryWithMetadata = country as Country & {
    continents?: string[];
  };
  const population = getPopulation(country);
  const matchedFeature = resolveFeature(country, lookup);
  let path: string | null = null;
  let focusBounds: CatalogCountry['focusBounds'] = null;

  if (matchedFeature) {
    const rawFeature = normalizeAntimeridianGeometry(matchedFeature, generator);
    const renderFeature = getFeatureFocusGeometry(rawFeature, generator);
    path = generator(renderFeature);

    if (path) {
      const bounds = generator.bounds(renderFeature);
      const width = Math.max(0, bounds[1][0] - bounds[0][0]);
      const height = Math.max(0, bounds[1][1] - bounds[0][1]);

      if (width >= MIN_SHAPE_SIZE || height >= MIN_SHAPE_SIZE) {
        focusBounds = {
          x: bounds[0][0],
          y: bounds[0][1],
          width,
          height,
        };
      }
    }
  }

  return {
    code: country.cca2.toUpperCase(),
    cca3: country.cca3.toUpperCase(),
    name: getLocalizedCountryName(country, locale),
    officialName: getLocalizedOfficialName(country, locale),
    capital: country.capital?.[0] || '—',
    region: country.region || 'Other',
    subregion: country.subregion || '',
    continents: Array.isArray(countryWithMetadata.continents)
      ? countryWithMetadata.continents
      : [country.region].filter(Boolean),
    population,
    languages: getLanguages(country),
    currencies: getCurrencies(country),
    flagEmoji: country.flag,
    path,
    focusBounds,
  };
}

async function buildCountriesCatalog(locale: string): Promise<CatalogCountry[]> {
  const geoData = await loadGeoJson();
  const projection = geoNaturalEarth1();

  projection.fitExtent(
    [[24, 24], [CATALOG_VIEWBOX.width - 24, CATALOG_VIEWBOX.height - 24]],
    geoData as never,
  );

  const generator = geoPath(projection);
  const lookup = buildFeatureLookup((geoData.features || []) as GeoFeature[]);
  const seenCodes = new Set<string>();

  const catalog = countries
    .filter((country) => Boolean(country.cca2 && country.flag && country.name?.common && country.status !== 'user-assigned'))
    .map((country) => toCatalogCountry(country, locale, generator, lookup))
    .filter((country): country is CatalogCountry => {
      if (!country || seenCodes.has(country.code)) {
        return false;
      }

      seenCodes.add(country.code);
      return true;
    });

  catalog.sort((left, right) => left.name.localeCompare(right.name, locale));
  return catalog;
}

export async function getCountriesCatalog(locale: string): Promise<CatalogCountry[]> {
  if (locale === 'en') {
    if (!cachedEnglishCatalogPromise) {
      cachedEnglishCatalogPromise = buildCountriesCatalog('en');
    }

    return cachedEnglishCatalogPromise;
  }

  return buildCountriesCatalog(locale);
}
