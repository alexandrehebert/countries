import { describe, expect, it } from 'vitest';
import { getCountriesCatalog } from '~/lib/server/countriesCatalog';

describe('getCountriesCatalog', () => {
  it('returns an exhaustive deduplicated catalog with flags', async () => {
    const countries = await getCountriesCatalog('en');

    expect(countries.length).toBeGreaterThanOrEqual(240);
    expect(new Set(countries.map((country) => country.code)).size).toBe(countries.length);
    expect(countries.every((country) => country.code.length === 2)).toBe(true);
    expect(countries.every((country) => country.flagEmoji.length > 0)).toBe(true);
  });

  it('includes representative countries from multiple regions', async () => {
    const countries = await getCountriesCatalog('en');
    const codes = new Set(countries.map((country) => country.code));

    expect(codes.has('FR')).toBe(true);
    expect(codes.has('US')).toBe(true);
    expect(codes.has('BR')).toBe(true);
    expect(codes.has('JP')).toBe(true);
    expect(codes.has('ZA')).toBe(true);
  });

  it('provides population and area figures for representative countries', async () => {
    const countries = await getCountriesCatalog('en');
    const byCode = new Map(countries.map((country) => [country.code, country]));

    expect(byCode.get('FR')?.population).toBeGreaterThan(0);
    expect(byCode.get('US')?.population).toBeGreaterThan(0);
    expect(byCode.get('JP')?.population).toBeGreaterThan(0);
    expect(byCode.get('FR')?.area).toBeGreaterThan(0);
    expect(byCode.get('US')?.area).toBeGreaterThan(0);
    expect(byCode.get('JP')?.area).toBeGreaterThan(0);
  });

  it('derives continent values when the source dataset does not expose them', async () => {
    const countries = await getCountriesCatalog('en');
    const byCode = new Map(countries.map((country) => [country.code, country]));

    expect(byCode.get('US')?.continents).toEqual(['North America']);
    expect(byCode.get('BR')?.continents).toEqual(['South America']);
    expect(byCode.get('FR')?.continents).toEqual(['Europe']);
  });

  it('uses a focused mainland silhouette for France', async () => {
    const countries = await getCountriesCatalog('en');
    const france = countries.find((country) => country.code === 'FR');

    expect(france?.path).toBeTruthy();
    expect(france?.focusBounds).toBeTruthy();
    expect(france?.path?.match(/M/g)).toHaveLength(1);
    expect(france?.focusBounds?.width).toBeGreaterThan(20);
  });

  it('keeps both major landmasses for Malaysia', async () => {
    const countries = await getCountriesCatalog('en');
    const malaysia = countries.find((country) => country.code === 'MY');

    expect(malaysia?.path).toBeTruthy();
    expect(malaysia?.focusBounds).toBeTruthy();
    expect((malaysia?.path?.match(/M/g) || []).length).toBeGreaterThan(1);
    expect(malaysia?.focusBounds?.width).toBeGreaterThan(40);
  });
});
