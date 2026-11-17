import type { NoteColor, NoteScope } from '../types';

export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
export const HAS_BACKEND = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '' && !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_PUBLISHABLE_KEY');

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const DEFAULT_CENTER: [number, number] = [-34.877, -8.0476];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 19;

export const NOTE_MAX_LENGTH = 280;
export const COUNTER_VISIBLE_AT = 240;
export const NOTES_CAP = 2000;
export const BBOX_PAD = 0.25;
export const INK = '#2B2A28';
export const NOTE_COLORS: Record<NoteColor, string> = {
  yellow: '#FFE27A', peach: '#FFC9A3', green: '#C7E8B0', blue: '#B7D8F2', pink: '#F7C1D9',
};
export const COLOR_ORDER: NoteColor[] = ['yellow', 'peach', 'green', 'blue', 'pink'];
export const SCOPES: Record<NoteScope,{label:string;hint:string;minZoom:number;shareZoom:number}> = {
  spot:{label:'Spot',hint:'Shows when zoomed in close',minZoom:14,shareZoom:17},
  street:{label:'Street',hint:'Shows from city view',minZoom:11,shareZoom:15},
  area:{label:'Area',hint:'Shows from anywhere',minZoom:0,shareZoom:13},
};
export const SCOPE_ORDER: NoteScope[] = ['spot','street','area'];
export const INTRO_STORAGE_KEY = 'geonote.intro-dismissed';
