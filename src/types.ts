export type NoteColor = 'yellow' | 'peach' | 'green' | 'blue' | 'pink';
export type NoteScope = 'spot' | 'street' | 'area';
export type ReportReason = 'spam' | 'abuse' | 'other';

export interface Note {
  id: string;
  body: string;
  color: NoteColor;
  scope: NoteScope;
  lat: number;
  lng: number;
  place_name: string | null;
  place_kind: string | null;
  created_at: string;
  is_mine: boolean;
}

/** west > east means the box crosses the antimeridian. */
export interface Bbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ViewState {
  bbox: Bbox;
  zoom: number;
}

export interface PickedPoint {
  lat: number;
  lng: number;
  zoom: number;
  placeName: string | null;
  placeKind: string | null;
}

export interface NoteDraft {
  body: string;
  color: NoteColor;
  scope: NoteScope;
  lat: number;
  lng: number;
  place_name: string | null;
  place_kind: string | null;
}

export type SessionStatus = 'pending' | 'ready' | 'failed' | 'unconfigured';

export interface NoteFeature {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    color: NoteColor;
    scope: NoteScope;
    tilt: number;
    preview: string;
  };
}
