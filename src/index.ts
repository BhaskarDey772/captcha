import { generateText } from './generate';
import { buildSvg, SvgOptions, DistortionLevel } from './svg';
import { createToken, verify as verifyToken, VerifyResult } from './token';

export { DistortionLevel };

export interface CaptaOptions extends SvgOptions {
  secret?: string;
  length?: number;
  ttl?: number;
  charset?: string;
}

export interface CaptaResult {
  svg: string;
  token: string;
}

export interface BoundCapta {
  create(overrides?: Partial<CaptaOptions>): CaptaResult;
  verify(token: string, answer: string): VerifyResult;
}

export { VerifyResult };

export function create(options: CaptaOptions & { secret: string }): CaptaResult {
  const text  = generateText(options.length, options.charset);
  const svg   = buildSvg(text, options);
  const token = createToken(text, options.secret, { ttl: options.ttl });
  return { svg, token };
}

export function verify(token: string, answer: string, secret: string): VerifyResult {
  return verifyToken(token, answer, secret);
}

export function configure(options: CaptaOptions & { secret: string }): BoundCapta {
  if (!options.secret) throw new TypeError('options.secret is required');
  return {
    create:  (overrides?) => create({ ...options, ...overrides, secret: options.secret }),
    verify:  (token, answer) => verifyToken(token, answer, options.secret),
  };
}

export function createSvg(text: string, options?: Omit<CaptaOptions, 'secret' | 'ttl' | 'length'>): string {
  if (!text || typeof text !== 'string') {
    throw new TypeError('text must be a non-empty string');
  }
  return buildSvg(text, options);
}

export { createToken };
