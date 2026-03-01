'use strict';

const crypto = require('crypto');

// Unambiguous characters — excludes 0/O, 1/I/l, etc.
const DEFAULT_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateText(length, charset) {
  const chars = charset || DEFAULT_CHARSET;
  const len = length || 6;
  const buf = crypto.randomBytes(len * 2);
  let result = '';
  for (let i = 0; i < len; i++) {
    // Use two bytes per char to reduce modulo bias
    const idx = ((buf[i * 2] << 8) | buf[i * 2 + 1]) % chars.length;
    result += chars[idx];
  }
  return result;
}

module.exports = { generateText, DEFAULT_CHARSET };
