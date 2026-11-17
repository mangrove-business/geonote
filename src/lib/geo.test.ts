import { describe, expect, it } from 'vitest';
import {
  bboxContains,
  bboxFromBounds,
  clampLat,
  defaultScopeForZoom,
  padBbox,
  previewOf,
  splitAntimeridian,
  tiltFor,
} from './geo';

describe('clampLat', () => {
  it('clamps to the web-mercator limit', () => {
    expect(clampLat(90)).toBe(85.0511);
    expect(clampLat(-90)).toBe(-85.0511);
    expect(clampLat(10)).toBe(10);
  });
});

describe('bboxFromBounds', () => {
  it('returns the whole world when the span is >= 360', () => {
    const b = bboxFromBounds(-250, -10, 250, 10);
    expect(b.west).toBe(-180);
    expect(b.east).toBe(180);
  });
  it('wraps longitudes that spill past ±180', () => {
    const b = bboxFromBounds(170, 0, 190, 10);
    expect(b.west).toBe(170);
    expect(b.east).toBe(-170);
  });
});

describe('splitAntimeridian', () => {
  it('leaves normal boxes alone', () => {
    const b = { west: -10, south: 0, east: 10, north: 5 };
    expect(splitAntimeridian(b)).toEqual([b]);
  });
  it('splits a Pacific viewport into two valid envelopes', () => {
    const parts = splitAntimeridian({ west: 170, south: 0, east: -170, north: 5 });
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ west: 170, east: 180 });
    expect(parts[1]).toMatchObject({ west: -180, east: -170 });
    for (const p of parts) expect(p.west).toBeLessThan(p.east);
  });
});

describe('padBbox', () => {
  it('pads by 25% on each side', () => {
    const p = padBbox({ west: 0, south: 0, east: 10, north: 10 });
    expect(p).toEqual({ west: -2.5, south: -2.5, east: 12.5, north: 12.5 });
  });
  it('clamps latitude and falls back to the world when too wide', () => {
    const p = padBbox({ west: -170, south: 80, east: 170, north: 85 });
    expect(p.west).toBe(-180);
    expect(p.east).toBe(180);
    expect(p.north).toBeLessThanOrEqual(85.0511);
  });
  it('wraps across the antimeridian', () => {
    const p = padBbox({ west: 170, south: 0, east: 179, north: 8 });
    expect(p.east).toBeCloseTo(-178.75); // 179 + 2.25 wraps past 180
    expect(p.west).toBeCloseTo(167.75);
    expect(splitAntimeridian(p)).toHaveLength(2);
  });
});

describe('bboxContains', () => {
  const outer = { west: -10, south: -10, east: 10, north: 10 };
  it('detects containment', () => {
    expect(bboxContains(outer, { west: -5, south: -5, east: 5, north: 5 })).toBe(true);
    expect(bboxContains(outer, { west: -5, south: -5, east: 15, north: 5 })).toBe(false);
    expect(bboxContains(outer, { west: -5, south: -5, east: 5, north: 11 })).toBe(false);
  });
  it('handles antimeridian outers', () => {
    const pacific = { west: 170, south: -10, east: -170, north: 10 };
    expect(bboxContains(pacific, { west: 175, south: 0, east: 179, north: 5 })).toBe(true);
    expect(bboxContains(pacific, { west: -179, south: 0, east: -175, north: 5 })).toBe(true);
    expect(bboxContains(pacific, { west: 0, south: 0, east: 5, north: 5 })).toBe(false);
  });
  it('world contains everything', () => {
    const world = { west: -180, south: -85.0511, east: 180, north: 85.0511 };
    expect(bboxContains(world, { west: 170, south: 0, east: -170, north: 5 })).toBe(true);
  });
});

describe('defaultScopeForZoom', () => {
  it('follows the plan thresholds', () => {
    expect(defaultScopeForZoom(15)).toBe('spot');
    expect(defaultScopeForZoom(14.9)).toBe('street');
    expect(defaultScopeForZoom(12)).toBe('street');
    expect(defaultScopeForZoom(11.9)).toBe('area');
  });
});

describe('tiltFor', () => {
  it('is deterministic and within [-5, 5]', () => {
    const id = '3f2b0a1e-6d52-4b5e-9d65-0c1d3b8c2a11';
    expect(tiltFor(id)).toBe(tiltFor(id));
    for (let i = 0; i < 500; i++) {
      const t = tiltFor(`note-${i}`);
      expect(t).toBeGreaterThanOrEqual(-5);
      expect(t).toBeLessThanOrEqual(5);
    }
  });
});

describe('previewOf', () => {
  it('flattens whitespace and truncates', () => {
    expect(previewOf('hello\n\n  world')).toBe('hello world');
    const long = 'x'.repeat(100);
    const p = previewOf(long, 20);
    expect(p).toHaveLength(20);
    expect(p.endsWith('…')).toBe(true);
  });
});
