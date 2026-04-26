import { createCanvas } from 'canvas';
import crypto from 'crypto';

export type DistortionLevel = 'low' | 'medium' | 'high';

export interface CanvasOptions {
  width?:      number;
  height?:     number;
  fontSize?:   number;
  background?: string;
  noise?:      boolean;
  distortion?: DistortionLevel;
}

interface DistortionConfig {
  rotateRange:  number;
  skewRange:    number;
  jitterY:      number;
  sizeRange:    number;
  lines:        number;
  dots:         number;
  ghostLayers:  number;
}

const DISTORTION: Record<DistortionLevel, DistortionConfig> = {
  low:    { rotateRange: 8,  skewRange: 6,  jitterY: 8,  sizeRange: 10, lines: 2, dots: 25, ghostLayers: 0 },
  medium: { rotateRange: 14, skewRange: 10, jitterY: 12, sizeRange: 20, lines: 4, dots: 40, ghostLayers: 1 },
  high:   { rotateRange: 20, skewRange: 16, jitterY: 16, sizeRange: 30, lines: 6, dots: 60, ghostLayers: 2 },
};

const FONTS = [
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
];

export function buildCanvas(text: string, options: CanvasOptions = {}): string {
  const width      = options.width      ?? 220;
  const height     = options.height     ?? 70;
  const fontSize   = options.fontSize   ?? 34;
  const background = options.background ?? '#f4f4f4';
  const noiseOn    = options.noise !== false;
  const level      = DISTORTION[options.distortion ?? 'medium'];

  const rngBuf = crypto.randomBytes(1024);
  let cur = 0;
  const rng      = (): number => rngBuf[cur++ % 1024];
  const rngRange = (min: number, max: number): number => min + (((rng() << 8) | rng()) % (max - min + 1));
  const rngFloat = (min: number, max: number): number => min + (rng() / 255) * (max - min);

  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // background
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const chars = Array.from(text);
  const n     = chars.length;
  const padX  = fontSize * 0.55;
  const slotW = (width - padX * 2) / n;
  const midY  = height / 2;

  // noise dots (behind characters)
  if (noiseOn) {
    for (let i = 0; i < level.dots; i++) {
      const cx   = rng() % width;
      const cy   = rng() % height;
      const r    = 0.4 + (rng() % 12) / 10;
      const op   = 0.08 + (rng() % 22) / 100;
      const gray = 80 + (rng() % 120);
      ctx.save();
      ctx.globalAlpha = op;
      ctx.fillStyle   = `rgb(${gray},${gray},${gray})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // draw each character
  for (let i = 0; i < n; i++) {
    const cx      = padX + slotW * i + slotW / 2 + rngRange(-2, 2);
    const dy      = rngRange(-level.jitterY, level.jitterY);
    const baseY   = midY + fontSize * 0.35 + dy;
    const rotate  = rngRange(-level.rotateRange, level.rotateRange) * (Math.PI / 180);
    const skewX   = rngRange(-level.skewRange, level.skewRange) * (Math.PI / 180);
    const sizeVar = 0.80 + (rng() % level.sizeRange) / 100;
    const fs      = Math.round(fontSize * sizeVar);
    const darkness = 20 + (rng() % 60);
    const font     = FONTS[rng() % FONTS.length];
    const weight   = (rng() % 3 === 0) ? 'bold' : 'normal';

    // ghost layers simulate turbulence displacement
    if (noiseOn && level.ghostLayers > 0) {
      for (let g = 0; g < level.ghostLayers; g++) {
        const gx = cx + rngRange(-3, 3);
        const gy = baseY + rngRange(-3, 3);
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(rotate + rngFloat(-0.05, 0.05));
        ctx.transform(1, 0, Math.tan(skewX), 1, 0, 0);
        ctx.globalAlpha = 0.08 + (rng() % 8) / 100;
        ctx.font        = `${weight} ${fs}px "${font}"`;
        ctx.fillStyle   = `rgb(${darkness},${darkness},${darkness})`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }
    }

    // main character
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(rotate);
    ctx.transform(1, 0, Math.tan(skewX), 1, 0, 0);
    ctx.globalAlpha  = 1;
    ctx.font         = `${weight} ${fs}px "${font}"`;
    ctx.fillStyle    = `rgb(${darkness},${darkness},${darkness})`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }

  // noise lines (on top of characters)
  if (noiseOn) {
    for (let i = 0; i < level.lines; i++) {
      const anchorY   = midY + rngRange(-10, 10);
      const amplitude = 2 + (rng() % 6);
      const freq      = 1 + (rng() % 4) * 0.5;
      const steps     = 22;
      const sw        = 0.6 + (rng() % 12) / 10;
      const gray      = 40 + (rng() % 120);
      const op        = 0.18 + (rng() % 35) / 100;

      ctx.save();
      ctx.globalAlpha   = op;
      ctx.strokeStyle   = `rgb(${gray},${gray},${gray})`;
      ctx.lineWidth     = sw;
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = t * width;
        const y = anchorY + amplitude * Math.sin(t * freq * 2 * Math.PI);
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ellipses
    for (let i = 0; i < n; i++) {
      if (rng() % 3 !== 0) continue;
      const cx   = padX + slotW * i + slotW / 2 + rngRange(-8, 8);
      const cy   = midY + rngRange(-8, 8);
      const rx   = 4 + (rng() % 8);
      const ry   = 3 + (rng() % 6);
      const rot  = rngRange(0, 180) * (Math.PI / 180);
      const sw   = 0.5 + (rng() % 10) / 10;
      const op   = 0.15 + (rng() % 25) / 100;
      const gray = 30 + (rng() % 80);

      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = `rgb(${gray},${gray},${gray})`;
      ctx.lineWidth   = sw;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}
