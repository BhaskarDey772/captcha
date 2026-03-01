'use strict';

const { generateText } = require('./generate');
const { buildSvg }     = require('./svg');
const { createToken, verify: verifyToken } = require('./token');

/**
 * Generate an SVG CAPTCHA and a signed HMAC token in one call.
 * @param {object} options
 * @returns {{ svg: string, token: string }}
 */
function create(options) {
  const opts   = options || {};
  const secret = opts.secret;
  if (!secret) throw new TypeError('options.secret is required');

  const text = generateText(opts.length, opts.charset);
  const svg  = buildSvg(text, opts);
  const token = createToken(text, secret, { ttl: opts.ttl });

  return { svg, token };
}

/**
 * Verify a token against the user's answer.
 * @param {string} token
 * @param {string} answer
 * @param {string} secret
 * @returns {{ valid: boolean, reason: string }}
 */
function verify(token, answer, secret) {
  return verifyToken(token, answer, secret);
}

/**
 * Create a bound instance with a baked-in secret and default options.
 * @param {object} options  Must include `secret`
 * @returns {{ create: Function, verify: Function }}
 */
function configure(options) {
  const opts = options || {};
  if (!opts.secret) throw new TypeError('options.secret is required');

  return {
    create:  (overrides) => create(Object.assign({}, opts, overrides)),
    verify:  (token, answer) => verifyToken(token, answer, opts.secret),
  };
}

/**
 * Low-level: build an SVG string from arbitrary text without creating a token.
 * @param {string} text
 * @param {object} [options]
 * @returns {string}
 */
function createSvg(text, options) {
  if (!text || typeof text !== 'string') {
    throw new TypeError('text must be a non-empty string');
  }
  return buildSvg(text, options || {});
}

/**
 * Low-level: sign text into an HMAC token without generating an SVG.
 * @param {string} text
 * @param {string} secret
 * @param {{ ttl?: number }} [options]
 * @returns {string}
 */
function createTokenFn(text, secret, options) {
  return createToken(text, secret, options);
}

module.exports = {
  create,
  verify,
  configure,
  createSvg,
  createToken: createTokenFn,
};
