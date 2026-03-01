'use strict';

const crypto = require('crypto');

const DISTORTION = {
  low:    { scale: 3,  baseFreqX: 0.020, baseFreqY: 0.030, lines: 3,  dots: 30  },
  medium: { scale: 6,  baseFreqX: 0.035, baseFreqY: 0.050, lines: 5,  dots: 60  },
  high:   { scale: 10, baseFreqX: 0.050, baseFreqY: 0.070, lines: 7,  dots: 100 },
};

function buildSvg(text, options) {
  const opts = options || {};
  const width      = opts.width      || 200;
  const height     = opts.height     || 70;
  const fontSize   = opts.fontSize   || 36;
  const background = opts.background || '#f0f0f0';
  const color      = opts.color      || '#333333';
  const noiseOn    = opts.noise !== false;
  const level      = DISTORTION[opts.distortion] || DISTORTION.medium;

  // One crypto call for all randomness
  const rngBuf = crypto.randomBytes(512);
  let cur = 0;
  const rng = () => rngBuf[cur++ % 512];

  // feTurbulence seed (0–9999)
  const filterSeed = ((rng() << 8) | rng()) % 9999;

  // --- Layer 1: per-character <text> elements ---
  const chars = Array.from(text);
  const charWidth = width / (chars.length + 1);
  const midY = height / 2;

  const charEls = chars.map((ch, i) => {
    const x = charWidth * (i + 1);
    const baseY = midY + fontSize * 0.35; // baseline offset

    // Per-char random transforms (keep ranges readable)
    const rotate   = (rng() % 37) - 18;                    // ±18°
    const skewX    = (rng() % 25) - 12;                    // ±12°
    const dy       = (rng() % 17) - 8;                     // ±8px vertical jitter
    const sizeVar  = 0.82 + (rng() % 37) / 100;            // 0.82–1.18
    const fs       = (fontSize * sizeVar).toFixed(1);
    const yPos     = (baseY + dy).toFixed(1);

    return (
      `<text x="${x.toFixed(1)}" y="${yPos}"` +
      ` font-family="'Courier New',Courier,monospace"` +
      ` font-size="${fs}" fill="${color}" text-anchor="middle"` +
      ` transform="rotate(${rotate},${x.toFixed(1)},${midY.toFixed(1)}) skewX(${skewX})"` +
      `>${escapeXml(ch)}</text>`
    );
  }).join('\n    ');

  // --- Layer 2: SVG filter (declarative, rendered by browser) ---
  const filter = noiseOn
    ? `<defs>
    <filter id="warp" x="-5%" y="-10%" width="110%" height="120%">
      <feTurbulence type="fractalNoise"
        baseFrequency="${level.baseFreqX} ${level.baseFreqY}"
        numOctaves="3" seed="${filterSeed}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise"
        scale="${level.scale}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>`
    : '';

  const filterAttr = noiseOn ? ' filter="url(#warp)"' : '';

  // --- Layer 3a: wavy noise lines ---
  let noiseLines = '';
  if (noiseOn) {
    for (let i = 0; i < level.lines; i++) {
      noiseLines += '\n  ' + wavyPath(rng, width, height);
    }
  }

  // --- Layer 3b: dot scatter ---
  let dots = '';
  if (noiseOn) {
    for (let i = 0; i < level.dots; i++) {
      const cx = rng() % width;
      const cy = rng() % height;
      const r  = (0.4 + (rng() % 21) / 10).toFixed(1);
      const op = (0.2 + (rng() % 51) / 100).toFixed(2);
      dots += `\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#444" opacity="${op}"/>`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg"` +
    ` width="${width}" height="${height}"` +
    ` viewBox="0 0 ${width} ${height}"` +
    ` role="img" aria-label="CAPTCHA image">` +
    `\n  ${filter}` +
    `\n  <rect width="100%" height="100%" fill="${background}"/>` +
    `\n  <g${filterAttr}>` +
    `\n    ${charEls}` +
    `\n  </g>` +
    noiseLines +
    dots +
    `\n</svg>`
  );
}

function wavyPath(rng, width, height) {
  const y0        = 10 + (rng() % (height - 20));
  const amplitude = 3 + (rng() % 8);
  const frequency = 2 + (rng() % 4);
  const steps     = 20;
  const points    = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (t * width).toFixed(1);
    const y = (y0 + amplitude * Math.sin(t * frequency * 2 * Math.PI)).toFixed(1);
    points.push(`${x},${y}`);
  }

  const sw  = (0.5 + (rng() % 16) / 10).toFixed(1);
  const op  = (0.25 + (rng() % 41) / 100).toFixed(2);
  const d   = 'M ' + points.join(' L ');
  return `<path d="${d}" stroke="#555" stroke-width="${sw}" fill="none" opacity="${op}"/>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { buildSvg };
