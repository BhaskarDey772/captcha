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
  warpAmp:      number;
  warpFreq:     number;
  confusers:    number;
}

const DISTORTION: Record<DistortionLevel, DistortionConfig> = {
  low:    { rotateRange: 10, skewRange: 6,  jitterY: 6,  sizeRange: 12, lines: 2,  dots: 40,  ghostLayers: 1, warpAmp: 2,  warpFreq: 0.06, confusers: 2 },
  medium: { rotateRange: 18, skewRange: 12, jitterY: 12, sizeRange: 22, lines: 5,  dots: 65,  ghostLayers: 2, warpAmp: 3,  warpFreq: 0.09, confusers: 3 },
  high:   { rotateRange: 24, skewRange: 16, jitterY: 14, sizeRange: 28, lines: 7,  dots: 90,  ghostLayers: 2, warpAmp: 4,  warpFreq: 0.11, confusers: 5 },
};

const FONTS = [
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
];

export function buildCanvas(text: string, options: CanvasOptions = {}): string {
  const width      = options.width      ?? 260;
  const height     = options.height     ?? 85;
  const fontSize   = options.fontSize   ?? 34;
  const background = options.background ?? '#f4f4f4';
  const noiseOn    = options.noise !== false;
  const level      = DISTORTION[options.distortion ?? 'high'];

  const rngBuf = crypto.randomBytes(2048);
  const now    = Date.now();
  const nowHi  = Math.floor(now / 0x100000000);
  for (let i = 0; i < 4; i++) {
    rngBuf[i]     ^= (now   >>> (i * 8)) & 0xff;
    rngBuf[i + 4] ^= (nowHi >>> (i * 8)) & 0xff;
  }

  let cur = 0;
  const rng      = (): number => rngBuf[cur++ % 2048];
  const rngRange = (min: number, max: number): number => min + (((rng() << 8) | rng()) % (max - min + 1));
  const rngFloat = (min: number, max: number): number => min + (rng() / 255) * (max - min);
  const rngHue   = (): number => ((rng() << 8) | rng()) % 360;
  const rngHsl   = (sMin: number, sMax: number, lMin: number, lMax: number): string =>
    `hsl(${rngHue()},${sMin + rng() % (sMax - sMin + 1)}%,${lMin + rng() % (lMax - lMin + 1)}%)`;

  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, background);
  grad.addColorStop(0.45, `hsl(${rngHue()},${10 + rng() % 15}%,${88 + rng() % 8}%)`);
  grad.addColorStop(1, background);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // diagonal hatching
  if (noiseOn) {
    const spacing = 8 + rng() % 5;
    ctx.save();
    ctx.globalAlpha = 0.04 + (rng() % 5) / 100;
    ctx.strokeStyle = '#444';
    ctx.lineWidth   = 0.5;
    for (let x = -height; x < width + height; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  const chars = Array.from(text);
  const n     = chars.length;
  // padX: used only for slot/ellipse layout (visual centering)
  const padX  = fontSize * 0.45;
  const slotW = (width - padX * 2) / n;
  const midY  = height / 2;

  // bezier spine for character path
  // spineMargin accounts for font half-width + max rotation overhang + warp amplitude
  const spineMargin = Math.ceil(fontSize * 0.55 + level.warpAmp + 4);
  const sj  = height * 0.12;
  const spW = width - 2 * spineMargin;
  const sp0 = { x: spineMargin,               y: midY + rngRange(-sj, sj) };
  const sp1 = { x: spineMargin + spW / 3,     y: midY + rngRange(-sj, sj) };
  const sp2 = { x: spineMargin + spW * 2 / 3, y: midY + rngRange(-sj, sj) };
  const sp3 = { x: spineMargin + spW,         y: midY + rngRange(-sj, sj) };

  const bezierAt = (t: number) => {
    const u = 1 - t;
    return {
      x: u*u*u*sp0.x + 3*u*u*t*sp1.x + 3*u*t*t*sp2.x + t*t*t*sp3.x,
      y: u*u*u*sp0.y + 3*u*u*t*sp1.y + 3*u*t*t*sp2.y + t*t*t*sp3.y,
    };
  };
  const bezierTangentAt = (t: number) => {
    const u = 1 - t;
    return {
      x: 3 * (u*u*(sp1.x - sp0.x) + 2*u*t*(sp2.x - sp1.x) + t*t*(sp3.x - sp2.x)),
      y: 3 * (u*u*(sp1.y - sp0.y) + 2*u*t*(sp2.y - sp1.y) + t*t*(sp3.y - sp2.y)),
    };
  };

  // noise dots behind characters
  if (noiseOn) {
    for (let i = 0; i < level.dots; i++) {
      const cx = rng() % width;
      const cy = rng() % height;
      const r  = 0.5 + (rng() % 18) / 10;
      const op = 0.10 + (rng() % 28) / 100;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.fillStyle   = rngHsl(20, 70, 30, 75);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // draw characters along bezier spine
  for (let i = 0; i < n; i++) {
    const t      = (i + 0.5) / n;
    const pt     = bezierAt(t);
    const tan    = bezierTangentAt(t);
    const spine  = Math.atan2(tan.y, tan.x);

    const cx     = pt.x + rngRange(-3, 3);
    const baseY  = pt.y + fontSize * 0.35 + rngRange(-Math.round(level.jitterY / 2), Math.round(level.jitterY / 2));
    const rotate = spine + rngRange(-level.rotateRange, level.rotateRange) * (Math.PI / 180);
    const skewX  = rngRange(-level.skewRange, level.skewRange) * (Math.PI / 180);
    // random vertical scale to further distort shape
    const scaleY = rngFloat(0.85, 1.15);

    const sizeVar   = 0.78 + (rng() % level.sizeRange) / 100;
    const fs        = Math.round(fontSize * sizeVar);
    const charColor = rngHsl(30, 90, 10, 42);
    const font      = FONTS[rng() % FONTS.length];
    const weight    = (rng() % 2 === 0) ? 'bold' : 'normal';

    // ghost layers (chromatic-aberration style displacement)
    if (noiseOn && level.ghostLayers > 0) {
      for (let g = 0; g < level.ghostLayers; g++) {
        const gx = cx + rngRange(-5, 5);
        const gy = baseY + rngRange(-5, 5);
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(rotate + rngFloat(-0.08, 0.08));
        ctx.transform(1, 0, Math.tan(skewX + rngFloat(-0.05, 0.05)), scaleY, 0, 0);
        ctx.globalAlpha  = 0.10 + (rng() % 12) / 100;
        ctx.font         = `${weight} ${fs}px "${font}"`;
        ctx.fillStyle    = rngHsl(10, 90, 10, 60);
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(chars[i], 0, 0);
        ctx.restore();
      }
    }

    // main character with outline to break clean edges
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(rotate);
    ctx.transform(1, 0, Math.tan(skewX), scaleY, 0, 0);
    ctx.globalAlpha  = 1;
    ctx.font         = `${weight} ${fs}px "${font}"`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    // thin outline in contrasting hue to fragment OCR edge detection
    ctx.strokeStyle = rngHsl(0, 60, 60, 85);
    ctx.lineWidth   = 0.6 + (rng() % 8) / 10;
    ctx.strokeText(chars[i], 0, 0);
    ctx.fillStyle   = charColor;
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }

  // --- pixel-level wave warp (applied after characters, before overlay lines) ---
  // this bends every pixel with two-axis sine displacement, very hard for OCR to undo
  {
    const amp   = level.warpAmp;
    const freq  = level.warpFreq;
    const ph1   = rngFloat(0, Math.PI * 2);
    const ph2   = rngFloat(0, Math.PI * 2);
    const ph3   = rngFloat(0, Math.PI * 2); // second harmonic

    const imageData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imageData.data);
    const dst = new Uint8ClampedArray(imageData.data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // two-harmonic displacement for more complex warp
        const dx = amp * Math.sin(y * freq + ph1) + (amp * 0.4) * Math.sin(y * freq * 2.3 + ph3);
        const dy = amp * Math.sin(x * freq + ph2) + (amp * 0.4) * Math.sin(x * freq * 1.7 + ph1);
        const sx = Math.round(x + dx);
        const sy = Math.round(y + dy);
        const clampedSx = Math.max(0, Math.min(width - 1, sx));
        const clampedSy = Math.max(0, Math.min(height - 1, sy));
        const si = (clampedSy * width + clampedSx) * 4;
        const di = (y * width + x) * 4;
        dst[di]     = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }
    imageData.data.set(dst);
    ctx.putImageData(imageData, 0, 0);
  }

  // overlay bezier noise lines (drawn ON TOP of warped characters)
  if (noiseOn) {
    for (let i = 0; i < level.lines; i++) {
      const y0 = rngRange(4, height - 4);
      const y3 = rngRange(4, height - 4);
      const x1 = rngRange(0, Math.round(width / 2));
      const y1 = rngRange(4, height - 4);
      const x2 = rngRange(Math.round(width / 2), width);
      const y2 = rngRange(4, height - 4);
      const sw  = 1.0 + (rng() % 18) / 10; // thicker lines
      const op  = 0.28 + (rng() % 40) / 100; // higher opacity

      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = rngHsl(0, 80, 10, 55);
      ctx.lineWidth   = sw;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.bezierCurveTo(x1, y1, x2, y2, width, y3);
      ctx.stroke();
      ctx.restore();
    }

    // confuser strokes: short arcs/curves that mimic character fragments, disrupt segmentation
    for (let i = 0; i < level.confusers; i++) {
      const cx  = rngRange(10, width - 10);
      const cy  = rngRange(8, height - 8);
      const rx  = 6 + rng() % 14;
      const ry  = 5 + rng() % 10;
      const rot = rngFloat(0, Math.PI);
      const startA = rngFloat(0, Math.PI);
      const endA   = startA + rngFloat(0.5, Math.PI * 1.5);
      const sw  = 0.8 + (rng() % 14) / 10;
      const op  = 0.22 + (rng() % 30) / 100;

      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = rngHsl(0, 70, 10, 50);
      ctx.lineWidth   = sw;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, startA, endA);
      ctx.stroke();
      ctx.restore();
    }

    // ellipse overlays
    for (let i = 0; i < n; i++) {
      if (rng() % 3 !== 0) continue;
      const cx  = padX + slotW * i + slotW / 2 + rngRange(-8, 8);
      const cy  = midY + rngRange(-10, 10);
      const rx  = 5 + (rng() % 10);
      const ry  = 4 + (rng() % 7);
      const rot = rngRange(0, 180) * (Math.PI / 180);
      const sw  = 0.6 + (rng() % 12) / 10;
      const op  = 0.18 + (rng() % 30) / 100;

      ctx.save();
      ctx.globalAlpha = op;
      ctx.strokeStyle = rngHsl(0, 70, 10, 50);
      ctx.lineWidth   = sw;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}
