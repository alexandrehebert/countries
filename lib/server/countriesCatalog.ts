import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import countries, { type Country } from 'world-countries';
import populationByCode from '~/lib/data/countryPopulationByCode.json';

export const CATALOG_VIEWBOX = { width: 1000, height: 560 };
const MIN_SHAPE_SIZE = 4;
const MIN_SIGNIFICANT_POLYGON_SHARE = 0.25;
const MIN_SIGNIFICANT_POLYGON_RATIO = 0.35;

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
  mapCenter: { x: number; y: number } | null;
}

let cachedEnglishCatalogPromise: Promise<CatalogCountry[]> | null = null;
let cachedBackdropPromise: Promise<string> | null = null;

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

  type PolygonSummary = {
    polygon: GeoJSON.Position[][];
    area: number;
    bounds: [[number, number], [number, number]];
  };

  let totalArea = 0;
  let largestPolygonSummary: PolygonSummary | null = null;
  const polygonSummaries: PolygonSummary[] = [];

  for (const polygon of polygons) {
    const polygonFeature: GeoFeature = {
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: polygon },
    };
    const area = Math.max(0, generator.area(polygonFeature));
    const bounds = generator.bounds(polygonFeature);
    totalArea += area;

    const summary: PolygonSummary = { polygon, area, bounds };

    if (!largestPolygonSummary || area > largestPolygonSummary.area) {
      largestPolygonSummary = summary;
    }

    polygonSummaries.push(summary);
  }

  if (!largestPolygonSummary || totalArea <= 0) {
    return feature;
  }

  const fullBounds = generator.bounds(feature);
  const fullWidth = Math.max(0, fullBounds[1][0] - fullBounds[0][0]);
  const fullHeight = Math.max(0, fullBounds[1][1] - fullBounds[0][1]);
  const largestWidth = Math.max(0, largestPolygonSummary.bounds[1][0] - largestPolygonSummary.bounds[0][0]);
  const largestHeight = Math.max(0, largestPolygonSummary.bounds[1][1] - largestPolygonSummary.bounds[0][1]);
  const fullMaxDimension = Math.max(fullWidth, fullHeight);
  const largestMaxDimension = Math.max(largestWidth, largestHeight);
  const isMuchMoreSpreadThanLargest = largestMaxDimension > 0 && fullMaxDimension / largestMaxDimension > 2.5;

  const leftOffset = Math.max(0, largestPolygonSummary.bounds[0][0] - fullBounds[0][0]);
  const rightOffset = Math.max(0, fullBounds[1][0] - largestPolygonSummary.bounds[1][0]);
  const maxHorizontalOffset = Math.max(leftOffset, rightOffset);
  const hasDateLineOutlier = fullMaxDimension > 0 && maxHorizontalOffset / fullMaxDimension > 0.18;
  const largestAreaShare = largestPolygonSummary.area / totalArea;

  if ((!isMuchMoreSpreadThanLargest && !hasDateLineOutlier) || largestAreaShare < 0.55) {
    return feature;
  }

  const significantPolygons = polygonSummaries.filter(({ area }) => {
    const totalShare = area / totalArea;
    const largestRatio = area / largestPolygonSummary.area;

    return totalShare >= MIN_SIGNIFICANT_POLYGON_SHARE || largestRatio >= MIN_SIGNIFICANT_POLYGON_RATIO;
  });

  if (significantPolygons.length > 1) {
    return {
      type: 'Feature',
      properties: feature.properties,
      geometry: {
        type: 'MultiPolygon',
        coordinates: significantPolygons.map(({ polygon }) => polygon),
      },
    };
  }

  return {
    type: 'Feature',
    properties: feature.properties,
    geometry: { type: 'Polygon', coordinates: largestPolygonSummary.polygon },
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

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  );
}

function getCurrencies(country: Country): string[] {
  return uniqueStrings(Object.values(country.currencies || {}).map((currency) => currency?.name || ''));
}

function getLanguages(country: Country): string[] {
  return uniqueStrings(Object.values(country.languages || {}).map((language) => String(language)));
}

function getContinents(country: Country): string[] {
  const countryWithMetadata = country as Country & {
    continents?: string[];
  };
  const explicitContinents = Array.isArray(countryWithMetadata.continents)
    ? uniqueStrings(countryWithMetadata.continents)
    : [];

  if (explicitContinents.length > 0) {
    return explicitContinents;
  }

  const region = country.region?.trim();
  const normalizedSubregion = country.subregion?.trim().toLowerCase();

  if (region === 'Americas') {
    if (normalizedSubregion?.includes('south')) {
      return ['South America'];
    }

    if (
      normalizedSubregion?.includes('north')
      || normalizedSubregion?.includes('central')
      || normalizedSubregion?.includes('caribbean')
    ) {
      return ['North America'];
    }

    return ['North America', 'South America'];
  }

  if (region === 'Antarctic') {
    return ['Antarctica'];
  }

  return region ? [region] : [];
}

function getMapCenter(
  country: Country,
  feature: GeoFeature | null,
  generator: ReturnType<typeof geoPath>,
): CatalogCountry['mapCenter'] {
  if (feature) {
    const [x, y] = generator.centroid(feature);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }
  }

  const latlng = Array.isArray(country.latlng) ? country.latlng : [];
  const projection = generator.projection();

  if (typeof projection === 'function' && latlng.length >= 2) {
    const [latitude, longitude] = latlng;
    const projectedPoint = projection([longitude, latitude]);

    if (projectedPoint && Number.isFinite(projectedPoint[0]) && Number.isFinite(projectedPoint[1])) {
      return {
        x: projectedPoint[0],
        y: projectedPoint[1],
      };
    }
  }

  return null;
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

  const population = getPopulation(country);
  const continents = getContinents(country);
  const matchedFeature = resolveFeature(country, lookup);
  const rawFeature = matchedFeature ? normalizeAntimeridianGeometry(matchedFeature, generator) : null;
  const mapCenter = getMapCenter(country, rawFeature, generator);
  let path: string | null = null;
  let focusBounds: CatalogCountry['focusBounds'] = null;

  if (rawFeature) {
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
    continents,
    population,
    languages: getLanguages(country),
    currencies: getCurrencies(country),
    flagEmoji: country.flag,
    path,
    focusBounds,
    mapCenter,
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

export async function getCatalogMapBackdrop(): Promise<string> {
  if (!cachedBackdropPromise) {
    cachedBackdropPromise = (async () => {
      const geoData = await loadGeoJson();
      const projection = geoNaturalEarth1();

      projection.fitExtent(
        [[24, 24], [CATALOG_VIEWBOX.width - 24, CATALOG_VIEWBOX.height - 24]],
        geoData as never,
      );

      const generator = geoPath(projection);

      return ((geoData.features || []) as GeoFeature[])
        .map((feature) => generator(normalizeAntimeridianGeometry(feature, generator)) || '')
        .filter(Boolean)
        .join(' ');
    })();
  }

  return cachedBackdropPromise;
}

export async function getCountryDetails(locale: string, code: string): Promise<CatalogCountry | null> {
  const normalizedCode = code.trim().toUpperCase();
  const countries = await getCountriesCatalog(locale);

  return countries.find((country) => country.code === normalizedCode || country.cca3 === normalizedCode) || null;
}
