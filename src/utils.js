'use strict';

function toBase64url(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64url(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str + '='.repeat(padLen);
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );
}

module.exports = { toBase64url, fromBase64url };
