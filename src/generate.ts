import crypto from 'crypto';

// Excludes visually ambiguous characters: 0/O, 1/I/l, 5/S, 8/B, 2/Z, 6/G, 9/q, U/V, u/v
export const DEFAULT_CHARSET = 'ACDEFHJKMNPRTWXYacdefhjkmnprtxy3479';

export function generateText(length?: number, charset?: string): string {
  const chars = charset ?? DEFAULT_CHARSET;
  const len = length ?? 6;
  const buf = crypto.randomBytes(len * 2);
  let result = '';
  for (let i = 0; i < len; i++) {
    const idx = ((buf[i * 2] << 8) | buf[i * 2 + 1]) % chars.length;
    result += chars[idx];
  }
  return result;
}
