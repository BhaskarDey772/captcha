import crypto from 'crypto';

export type DistortionLevel = 'low' | 'medium' | 'high';

export interface SvgOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  background?: string;
  noise?: boolean;
  distortion?: DistortionLevel;
}

interface DistortionConfig {
  charScale: number;
  baseFreqX: number;
  baseFreqY: number;
  octaves: number;
  lines: number;
  dots: number;
}

const DISTORTION: Record<DistortionLevel, DistortionConfig> = {
  low:    { charScale: 3,  baseFreqX: 0.015, baseFreqY: 0.022, octaves: 2, lines: 2, dots: 25 },
  medium: { charScale: 6,  baseFreqX: 0.025, baseFreqY: 0.035, octaves: 3, lines: 4, dots: 40 },
  high:   { charScale: 10, baseFreqX: 0.038, baseFreqY: 0.052, octaves: 3, lines: 6, dots: 60 },
};

const FONTS = [
  'Arial,Helvetica,sans-serif',
  "'Times New Roman',Times,serif",
  'Georgia,serif',
  'Verdana,Geneva,sans-serif',
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSvg(text: string, options: SvgOptions = {}): string {
  const width      = options.width      ?? 220;
  const height     = options.height     ?? 70;
  const fontSize   = options.fontSize   ?? 34;
  const background = options.background ?? '#f4f4f4';
  const noiseOn    = options.noise !== false;
  const level      = DISTORTION[options.distortion ?? 'medium'];

  const rngBuf = crypto.randomBytes(768);
  let cur = 0;
  const rng      = (): number => rngBuf[cur++ % 768];
  const rngRange = (min: number, max: number): number => min + (((rng() << 8) | rng()) % (max - min + 1));

  const chars = Array.from(text);
  const n     = chars.length;
  const padX  = fontSize * 0.55;
  const slotW = (width - padX * 2) / n;
  const midY  = height / 2;

  let filterDefs = '';
  if (noiseOn) {
    for (let i = 0; i < n; i++) {
      const s1 = ((rng() << 8) | rng()) % 9999;
      const bfx = (level.baseFreqX + (rng() % 15 - 7) / 1000).toFixed(4);
      const bfy = (level.baseFreqY + (rng() % 15 - 7) / 1000).toFixed(4);
      filterDefs +=
        `<filter id="f${i}" x="-25%" y="-25%" width="150%" height="150%">` +
        `<feTurbulence type="fractalNoise" baseFrequency="${bfx} ${bfy}" numOctaves="${level.octaves}" seed="${s1}" result="n"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="n" scale="${level.charScale}" xChannelSelector="R" yChannelSelector="G"/>` +
        `</filter>\n  `;
    }
  }

  const defs = noiseOn ? `<defs>\n  ${filterDefs}</defs>` : '';

  const charEls = chars.map((ch, i) => {
    const cx      = padX + slotW * i + slotW / 2 + rngRange(-2, 2);
    const dy      = rngRange(-12, 12);
    const baseY   = midY + fontSize * 0.35 + dy;
    const rotate  = rngRange(-14, 14);
    const skewX   = rngRange(-10, 10);
    const sizeVar = 0.80 + (rng() % 40) / 100;
    const fs      = (fontSize * sizeVar).toFixed(1);
    const darkness = 20 + (rng() % 60);
    const hex      = darkness.toString(16).padStart(2, '0');
    const fill     = `#${hex}${hex}${hex}`;
    const font     = FONTS[rng() % FONTS.length];
    const weight   = (rng() % 3 === 0) ? 'bold' : 'normal';
    const fAttr    = noiseOn ? ` filter="url(#f${i})"` : '';

    return (
      `<text x="${cx.toFixed(1)}" y="${baseY.toFixed(1)}"` +
      ` font-family="${font}" font-size="${fs}"` +
      ` fill="${fill}" font-weight="${weight}" text-anchor="middle"` +
      ` transform="rotate(${rotate},${cx.toFixed(1)},${midY.toFixed(1)}) skewX(${skewX})"` +
      `${fAttr}>${escapeXml(ch)}</text>`
    );
  }).join('\n    ');

  let strokes = '';
  if (noiseOn) {
    for (let i = 0; i < level.lines; i++) {
      const anchorY   = midY + rngRange(-10, 10);
      const amplitude = 2 + (rng() % 6);
      const freq      = 1 + (rng() % 4) * 0.5;
      const steps     = 22;
      const pts: string[] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = (t * width).toFixed(1);
        const y = (anchorY + amplitude * Math.sin(t * freq * 2 * Math.PI)).toFixed(1);
        pts.push(`${x},${y}`);
      }
      const sw    = (0.6 + (rng() % 12) / 10).toFixed(1);
      const gray  = 40 + (rng() % 120);
      const ghex  = gray.toString(16).padStart(2, '0');
      const color = `#${ghex}${ghex}${ghex}`;
      const op    = (0.18 + (rng() % 35) / 100).toFixed(2);
      strokes += `\n  <path d="M ${pts.join(' L ')}" stroke="${color}" stroke-width="${sw}" fill="none" opacity="${op}"/>`;
    }

    for (let i = 0; i < n; i++) {
      if (rng() % 3 !== 0) continue;
      const cx   = padX + slotW * i + slotW / 2 + rngRange(-8, 8);
      const cy   = midY + rngRange(-8, 8);
      const rx   = 4 + (rng() % 8);
      const ry   = 3 + (rng() % 6);
      const rot  = rngRange(0, 180);
      const sw   = (0.5 + (rng() % 10) / 10).toFixed(1);
      const op   = (0.15 + (rng() % 25) / 100).toFixed(2);
      const gray = 30 + (rng() % 80);
      const ghex = gray.toString(16).padStart(2, '0');
      strokes += `\n  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#${ghex}${ghex}${ghex}" stroke-width="${sw}" opacity="${op}" transform="rotate(${rot},${cx},${cy})"/>`;
    }
  }

  let dots = '';
  if (noiseOn) {
    for (let i = 0; i < level.dots; i++) {
      const cx   = rng() % width;
      const cy   = rng() % height;
      const r    = (0.4 + (rng() % 12) / 10).toFixed(1);
      const op   = (0.08 + (rng() % 22) / 100).toFixed(2);
      const gray = 80 + (rng() % 120);
      const ghex = gray.toString(16).padStart(2, '0');
      dots += `\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#${ghex}${ghex}${ghex}" opacity="${op}"/>`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${width}" height="${height}"` +
    ` viewBox="0 0 ${width} ${height}"` +
    ` role="img" aria-label="CAPTCHA image">` +
    `\n${defs}` +
    `\n  <rect width="100%" height="100%" fill="${background}"/>` +
    `\n  <g>` +
    `\n    ${charEls}` +
    `\n  </g>` +
    strokes +
    dots +
    `\n</svg>`
  );
}
