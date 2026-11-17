import { BBOX_PAD, SCOPES } from './config';
import type { Bbox, Note, NoteFeature, NoteScope } from '../types';

export const MAX_LAT = 85.0511;

export function clampLat(lat: number): number {
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}

function wrapLng(lng: number): number {
  if (lng > 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
}

export function crossesAntimeridian(b: Bbox): boolean {
  return b.west > b.east;
}

const WORLD: Bbox = { west: -180, south: -MAX_LAT, east: 180, north: MAX_LAT };

/** Build a normalized bbox from raw map bounds (longitudes may be outside ±180). */
export function bboxFromBounds(west: number, south: number, east: number, north: number): Bbox {
  const s = clampLat(south);
  const n = clampLat(north);
  if (east - west >= 360) return { west: -180, south: s, east: 180, north: n };
  return { west: wrapLng(west), south: s, east: wrapLng(east), north: n };
}

/** Grow a bbox by `ratio` of its size on every side. */
export function padBbox(b: Bbox, ratio: number = BBOX_PAD): Bbox {
  const width = crossesAntimeridian(b) ? b.east + 360 - b.west : b.east - b.west;
  const height = b.north - b.south;
  const south = clampLat(b.south - height * ratio);
  const north = clampLat(b.north + height * ratio);
  if (width * (1 + 2 * ratio) >= 360) return { west: -180, south, east: 180, north };
  const pad = width * ratio;
  return { west: wrapLng(b.west - pad), south, east: wrapLng(b.east + pad), north };
}

/** Split at ±180° so each part is a valid PostGIS envelope. */
export function splitAntimeridian(b: Bbox): Bbox[] {
  if (!crossesAntimeridian(b)) return [b];
  return [
    { west: b.west, south: b.south, east: 180, north: b.north },
    { west: -180, south: b.south, east: b.east, north: b.north },
  ];
}

/** True when `inner` lies fully inside `outer`. */
export function bboxContains(outer: Bbox, inner: Bbox): boolean {
  if (inner.south < outer.south || inner.north > outer.north) return false;
  if (outer.west === -180 && outer.east === 180) return true;
  const oc = crossesAntimeridian(outer);
  const ic = crossesAntimeridian(inner);
  if (!oc && !ic) return inner.west >= outer.west && inner.east <= outer.east;
  if (!oc && ic) return false;
  if (oc && !ic) return inner.west >= outer.west || inner.east <= outer.east;
  return inner.west >= outer.west && inner.east <= outer.east;
}

export function zoomBucket(zoom: number): number {
  return Math.floor(zoom);
}

export function defaultScopeForZoom(zoom: number): NoteScope {
  if (zoom >= 15) return 'spot';
  if (zoom >= 12) return 'street';
  return 'area';
}

export function isScopeVisibleAt(scope: NoteScope, zoom: number): boolean {
  return zoom >= SCOPES[scope].minZoom;
}

/** Small stable string hash (FNV-1a), non-negative. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic tilt in [-5, 5] degrees so post-its look hand-placed. */
export function tiltFor(id: string): number {
  return ((hashString(id) % 1001) / 1000) * 10 - 5;
}

export function previewOf(body: string, max = 44): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function notesToFeatures(notes: Note[]): NoteFeature[] {
  return notes.map((n) => ({
    type: 'Feature',
    id: n.id,
    geometry: { type: 'Point', coordinates: [n.lng, n.lat] },
    properties: {
      id: n.id,
      color: n.color,
      scope: n.scope,
      tilt: tiltFor(n.id),
      preview: previewOf(n.body),
    },
  }));
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export { WORLD };
