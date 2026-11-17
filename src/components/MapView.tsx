import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type IControl,
  type MapGeoJSONFeature,
  type MapMouseEvent,
  type PointLike,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  INK,
  MAP_STYLE_URL,
  MAX_ZOOM,
  MIN_ZOOM,
  NOTE_COLORS,
} from '../lib/config';
import { bboxFromBounds, notesToFeatures } from '../lib/geo';
import { registerSprites } from '../lib/sprites';
import type { Note, PickedPoint, ViewState } from '../types';

// MapLibre 6 runs its tile worker from a separate file; without this the map
// can stay blank in production builds.
setWorkerUrl(workerUrl);

export interface MapHandle {
  flyTo: (lng: number, lat: number, zoom: number) => void;
  locate: () => void;
  /** On narrow screens, pan so a point isn't hidden behind the bottom sheet. */
  ensureVisible: (lng: number, lat: number) => void;
  toggleSatellite: () => void;
}

export interface MapHighlight {
  lat: number;
  lng: number;
  kind: 'selected' | 'draft';
}

interface Props {
  ref?: Ref<MapHandle>;
  notes: Note[] | undefined;
  highlight: MapHighlight | null;
  onViewChange: (view: ViewState) => void;
  onMapClick: (point: PickedPoint) => void;
  onNoteClick: (id: string) => void;
  onLoaded: () => void;
  onLoadError: () => void;
  onLocateError: (message: string) => void;
}

const HIT_LAYERS = ['notes-clusters', 'notes-postits', 'notes-dots'];
const OWN_SOURCES = new Set(['notes', 'highlight']);

const EMPTY = { type: 'FeatureCollection', features: [] } as const;

// Which tile layers carry the most useful human label, best first.
const PLACE_RANK: Record<string, number> = {
  poi: 0,
  aerodrome_label: 0,
  mountain_peak: 0,
  building: 1,
  park: 2,
  water_name: 2,
  waterway: 2,
  transportation_name: 3,
  place: 4,
};

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function box(point: { x: number; y: number }, r: number): [PointLike, PointLike] {
  return [
    [point.x - r, point.y - r],
    [point.x + r, point.y + r],
  ];
}

/** Best-effort label from the rendered style. Failure is fine; it's display sugar. */
function lookupPlace(
  map: MapLibreMap,
  point: { x: number; y: number },
): { placeName: string | null; placeKind: string | null } {
  try {
    const candidates = map
      .queryRenderedFeatures(box(point, 20))
      .filter((f) => !OWN_SOURCES.has(f.source))
      .filter((f) => typeof f.properties?.name === 'string' && f.properties.name.trim() !== '')
      .sort(
        (a, b) =>
          (PLACE_RANK[a.sourceLayer ?? ''] ?? 9) - (PLACE_RANK[b.sourceLayer ?? ''] ?? 9),
      );
    const best = candidates[0];
    if (!best) return { placeName: null, placeKind: null };
    const name = String(best.properties.name).trim().slice(0, 120);
    const rawKind = best.properties.class ?? best.properties.subclass ?? best.sourceLayer;
    const kind = typeof rawKind === 'string' && rawKind ? rawKind.slice(0, 40) : null;
    return { placeName: name || null, placeKind: kind };
  } catch {
    return { placeName: null, placeKind: null };
  }
}

const colorMatch = (fallback: string) =>
  [
    'match',
    ['get', 'color'],
    ...Object.entries(NOTE_COLORS).flat(),
    fallback,
  ] as unknown as string;

class LocateControl implements IControl {
  private container: HTMLDivElement | null = null;
  private readonly onClick: () => void;

  constructor(onClick: () => void) {
    this.onClick = onClick;
  }

  onAdd(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Show my location';
    button.setAttribute('aria-label', 'Show my location');
    button.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="margin:auto"><circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
    button.addEventListener('click', this.onClick);
    container.appendChild(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.remove();
    this.container = null;
  }
}

export function MapView({
  ref,
  notes,
  highlight,
  onViewChange,
  onMapClick,
  onNoteClick,
  onLoaded,
  onLoadError,
  onLocateError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const notesRef = useRef<Note[] | undefined>(notes);
  const highlightRef = useRef<MapHighlight | null>(highlight);
  const userMarkerRef = useRef<Marker | null>(null);
  const locateRef = useRef<() => void>(() => {});
  const satelliteRef = useRef(false);

  // Keep the latest callbacks in a ref so map handlers never go stale
  // and the map is never re-created because a prop changed.
  const cb = useRef({ onViewChange, onMapClick, onNoteClick, onLoaded, onLoadError, onLocateError });
  cb.current = { onViewChange, onMapClick, onNoteClick, onLoaded, onLoadError, onLocateError };

  const applyNotes = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !notesRef.current) return;
    (map.getSource('notes') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: notesToFeatures(notesRef.current),
    });
  };

  const applyHighlight = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const h = highlightRef.current;
    (map.getSource('highlight') as GeoJSONSource | undefined)?.setData(
      h
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
                properties: { kind: h.kind },
              },
            ],
          }
        : EMPTY,
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (lng, lat, zoom) => {
        const map = mapRef.current;
        if (!map) return;
        if (prefersReducedMotion()) map.jumpTo({ center: [lng, lat], zoom });
        else map.flyTo({ center: [lng, lat], zoom, essential: true });
      },
      locate: () => locateRef.current(),
      toggleSatellite: () => {
        const map = mapRef.current;
        if (!map || !map.getLayer('satellite')) return;
        satelliteRef.current = !satelliteRef.current;
        map.setLayoutProperty('satellite', 'visibility', satelliteRef.current ? 'visible' : 'none');
      },
      ensureVisible: (lng, lat) => {
        const map = mapRef.current;
        const el = containerRef.current;
        if (!map || !el || el.clientWidth >= 768) return;
        const p = map.project([lng, lat]);
        const h = el.clientHeight;
        if (p.y > h * 0.38) {
          map.panBy([0, p.y - h * 0.22], { duration: prefersReducedMotion() ? 0 : 250 });
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    loadedRef.current = false;

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new LocateControl(() => locateRef.current()), 'top-right');
    // OpenFreeMap / OpenMapTiles / OSM attribution is a condition of the free tiles.
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');

    const emitView = () => {
      const b = map.getBounds();
      cb.current.onViewChange({
        bbox: bboxFromBounds(b.getWest(), b.getSouth(), b.getEast(), b.getNorth()),
        zoom: map.getZoom(),
      });
    };

    let moveTimer: ReturnType<typeof setTimeout> | undefined;
    map.on('moveend', () => {
      if (!loadedRef.current) return;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(emitView, 250);
    });

    let errorReported = false;
    map.on('error', () => {
      if (!loadedRef.current && !errorReported) {
        errorReported = true;
        cb.current.onLoadError();
      }
    });

    map.on('load', () => {
      registerSprites(map);

      map.addSource('satellite', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Tiles © Esri',
      });
      map.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 1 },
      });
      map.addSource('notes', {
        type: 'geojson',
        data: EMPTY,
        cluster: true,
        clusterRadius: 60,
        clusterMaxZoom: 16,
        promoteId: 'id',
      });
      map.addSource('highlight', { type: 'geojson', data: EMPTY });

      map.addLayer({
        id: 'notes-clusters',
        type: 'circle',
        source: 'notes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': NOTE_COLORS.yellow,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26, 200, 32],
          'circle-stroke-width': 2,
          'circle-stroke-color': INK,
        },
      });
      map.addLayer({
        id: 'notes-cluster-count',
        type: 'symbol',
        source: 'notes',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': INK },
      });
      map.addLayer({
        id: 'notes-dots',
        type: 'circle',
        source: 'notes',
        filter: ['!', ['has', 'point_count']],
        maxzoom: 13.5,
        paint: {
          'circle-color': colorMatch(NOTE_COLORS.yellow),
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': INK,
        },
      });
      map.addLayer({
        id: 'notes-postits',
        type: 'symbol',
        source: 'notes',
        filter: ['!', ['has', 'point_count']],
        minzoom: 13.5,
        layout: {
          'icon-image': ['concat', 'note-', ['get', 'color']],
          'icon-rotate': ['get', 'tilt'],
          'icon-rotation-alignment': 'viewport',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 13.5, 0.6, 16, 1, 19, 1.3],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });
      map.addLayer({
        id: 'notes-labels',
        type: 'symbol',
        source: 'notes',
        filter: ['!', ['has', 'point_count']],
        minzoom: 16,
        layout: {
          'text-field': ['get', 'preview'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-max-width': 7,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-optional': true,
        },
        paint: {
          'text-color': INK,
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
      map.addLayer({
        id: 'note-highlight',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 24,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 3,
          'circle-stroke-color': ['match', ['get', 'kind'], 'draft', '#E8612C', INK],
          'circle-pitch-alignment': 'viewport',
        },
      });

      loadedRef.current = true;
      applyNotes();
      applyHighlight();
      emitView();
      cb.current.onLoaded();
    });

    const hitAt = (point: { x: number; y: number }): MapGeoJSONFeature | undefined =>
      map.queryRenderedFeatures(box(point, 10), { layers: HIT_LAYERS })[0];

    map.on('mousemove', (e: MapMouseEvent) => {
      if (!loadedRef.current) return;
      map.getCanvas().style.cursor = hitAt(e.point) ? 'pointer' : '';
    });

    map.on('click', (e: MapMouseEvent) => {
      if (!loadedRef.current) return;
      const hit = hitAt(e.point);

      if (hit) {
        const props = hit.properties ?? {};
        if (props.cluster_id !== undefined && hit.geometry.type === 'Point') {
          const center = hit.geometry.coordinates as [number, number];
          const source = map.getSource('notes') as GeoJSONSource;
          source
            .getClusterExpansionZoom(Number(props.cluster_id))
            .then((zoom) => map.easeTo({ center, zoom: Math.min(zoom, MAX_ZOOM) }))
            .catch(() => map.easeTo({ center, zoom: map.getZoom() + 2 }));
          return;
        }
        if (typeof props.id === 'string') {
          cb.current.onNoteClick(props.id);
          return;
        }
      }

      // Empty map: open the composer here. MapLibre doesn't fire click for drags.
      const { lat, lng } = e.lngLat.wrap();
      const { placeName, placeKind } = lookupPlace(map, e.point);
      cb.current.onMapClick({ lat, lng, zoom: map.getZoom(), placeName, placeKind });
    });

    locateRef.current = () => {
      if (!navigator.geolocation) {
        cb.current.onLocateError('Location isn’t available in this browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          const zoom = Math.max(map.getZoom(), 15);
          if (prefersReducedMotion()) map.jumpTo({ center: lngLat, zoom });
          else map.flyTo({ center: lngLat, zoom, essential: true });

          if (!userMarkerRef.current) {
            const dot = document.createElement('div');
            dot.className = 'user-dot';
            dot.setAttribute('aria-hidden', 'true');
            userMarkerRef.current = new Marker({ element: dot });
          }
          userMarkerRef.current.setLngLat(lngLat).addTo(map);
        },
        (err) => {
          cb.current.onLocateError(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. The map stays where it is.'
              : 'Couldn’t find your location. Try again in a moment.',
          );
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      );
    };

    return () => {
      clearTimeout(moveTimer);
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // The map is created exactly once; everything it needs comes through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    notesRef.current = notes;
    applyNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  useEffect(() => {
    highlightRef.current = highlight;
    applyHighlight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight]);

  return (
    // MapLibre's CSS forces position:relative on its container, so the container
    // fills an absolutely-positioned wrapper instead of being positioned itself.
    <div
      className="absolute inset-0"
      role="application"
      aria-label="Map of notes. Tap an empty spot to leave a note."
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
