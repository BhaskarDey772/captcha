export type DistortionLevel = 'low' | 'medium' | 'high';

export type VerifyReason =
  | 'ok'
  | 'expired'
  | 'wrong_answer'
  | 'malformed'
  | 'sig_mismatch';

export interface CaptaOptions {
  /** HMAC signing secret. Required for `create()` and `configure()`. */
  secret?: string;
  /** Number of characters to generate (default: 6) */
  length?: number;
  /** Token time-to-live in seconds (default: 300) */
  ttl?: number;
  /** SVG width in pixels (default: 200) */
  width?: number;
  /** SVG height in pixels (default: 70) */
  height?: number;
  /** Base font size in pixels (default: 36) */
  fontSize?: number;
  /** SVG background fill (default: '#f0f0f0') */
  background?: string;
  /** Text fill color (default: '#333333') */
  color?: string;
  /** Character pool for text generation (default: unambiguous alphanumeric) */
  charset?: string;
  /** Whether to add noise lines and dots (default: true) */
  noise?: boolean;
  /** Distortion intensity preset (default: 'medium') */
  distortion?: DistortionLevel;
}

export interface CaptaResult {
  /** Complete SVG markup, ready to inline or serve as image/svg+xml */
  svg: string;
  /** Signed HMAC token to send to the client as a hidden field or JSON value */
  token: string;
}

export interface VerifyResult {
  valid: boolean;
  reason: VerifyReason;
}

export interface BoundCapta {
  create(overrides?: Partial<CaptaOptions>): CaptaResult;
  verify(token: string, answer: string): VerifyResult;
}

/**
 * Generate a CAPTCHA SVG and a signed HMAC token.
 * `options.secret` is required.
 */
export function create(options: CaptaOptions & { secret: string }): CaptaResult;

/**
 * Verify a previously issued token against the user's typed answer.
 */
export function verify(token: string, answer: string, secret: string): VerifyResult;

/**
 * Create a reusable bound instance with a baked-in secret and defaults.
 * Avoids passing `secret` on every call.
 */
export function configure(options: CaptaOptions & { secret: string }): BoundCapta;

/**
 * Low-level: build an SVG string from arbitrary text without creating a token.
 * Useful when you manage answer storage yourself (session, Redis, etc.).
 */
export function createSvg(
  text: string,
  options?: Omit<CaptaOptions, 'secret' | 'ttl' | 'length'>
): string;

/**
 * Low-level: sign text into an HMAC token without generating an SVG.
 */
export function createToken(
  text: string,
  secret: string,
  options?: { ttl?: number }
): string;
