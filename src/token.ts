import crypto from 'crypto';
import { toBase64url, fromBase64url } from './utils';

export interface VerifyResult {
  valid: boolean;
  reason: string;
}

interface TokenPayload {
  t: string;
  e: number;
  n: string;
}

export function createToken(text: string, secret: string, options?: { ttl?: number }): string {
  if (!text || typeof text !== 'string') {
    throw new TypeError('text must be a non-empty string');
  }
  if (!secret || typeof secret !== 'string') {
    throw new TypeError('secret must be a non-empty string');
  }

  const ttl = options?.ttl ?? 300;

  const payload: TokenPayload = {
    t: text.toLowerCase().trim(),
    e: Date.now() + ttl * 1000,
    n: crypto.randomBytes(8).toString('hex'),
  };

  const b64 = toBase64url(Buffer.from(JSON.stringify(payload)));
  const sig = toBase64url(
    crypto.createHmac('sha256', secret).update(b64).digest()
  );

  return b64 + '.' + sig;
}

export function verify(token: string, answer: string, secret: string): VerifyResult {
  if (
    typeof token !== 'string' ||
    typeof answer !== 'string' ||
    typeof secret !== 'string'
  ) {
    return { valid: false, reason: 'malformed' };
  }

  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) return { valid: false, reason: 'malformed' };

  const b64 = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const expectedSig = toBase64url(
    crypto.createHmac('sha256', secret).update(b64).digest()
  );

  const sigBuf = fromBase64url(sig);
  const expBuf = fromBase64url(expectedSig);

  if (sigBuf.length !== expBuf.length) {
    return { valid: false, reason: 'sig_mismatch' };
  }

  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'sig_mismatch' };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromBase64url(b64).toString('utf8')) as TokenPayload;
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (typeof payload.e !== 'number' || Date.now() > payload.e) {
    return { valid: false, reason: 'expired' };
  }

  const normalized = String(answer).toLowerCase().trim();
  const match = payload.t === normalized;
  return { valid: match, reason: match ? 'ok' : 'wrong_answer' };
}
