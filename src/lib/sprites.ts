import type { Map as MapLibreMap } from 'maplibre-gl';
import { COLOR_ORDER, INK, NOTE_COLORS } from './config';

const SIZE = 72; // 2x canvas; registered with pixelRatio 2 => 36 css px

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawPostIt(fill: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const pad = 9;
  const x = pad;
  const y = pad - 1;
  const w = SIZE - pad * 2;
  const h = SIZE - pad * 2;
  const r = 6;
  const f = 16; // folded corner size

  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - f);
    ctx.lineTo(x + w - f, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  // body + soft drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  outline();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  // faint "handwriting" lines
  ctx.strokeStyle = 'rgba(43, 42, 40, 0.28)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const [i, len] of [[0, 30], [1, 24], [2, 14]] as const) {
    const ly = y + 16 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x + 9, ly);
    ctx.lineTo(x + 9 + len, ly);
    ctx.stroke();
  }

  // folded corner
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - f);
  ctx.lineTo(x + w - f, y + h);
  ctx.lineTo(x + w - f, y + h - f);
  ctx.closePath();
  ctx.fillStyle = shade(fill, 0.14);
  ctx.fill();

  // 1px dark edge
  outline();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Draw the five post-it sprites at runtime and register them as note-<color>. */
export function registerSprites(map: MapLibreMap): void {
  for (const color of COLOR_ORDER) {
    const name = `note-${color}`;
    if (map.hasImage(name)) continue;
    map.addImage(name, drawPostIt(NOTE_COLORS[color]), { pixelRatio: 2 });
  }
}
