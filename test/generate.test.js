'use strict';

const { test, run, assert } = require('./runner');
const { generateText, DEFAULT_CHARSET } = require('../src/generate');

test('generateText returns a string', () => {
  const t = generateText(6, DEFAULT_CHARSET);
  assert.strictEqual(typeof t, 'string');
});

test('generateText returns correct length', () => {
  assert.strictEqual(generateText(4).length, 4);
  assert.strictEqual(generateText(8).length, 8);
});

test('generateText defaults to length 6', () => {
  assert.strictEqual(generateText().length, 6);
});

test('generateText uses only chars from charset', () => {
  const charset = 'ABC';
  for (let i = 0; i < 20; i++) {
    const t = generateText(10, charset);
    for (const ch of t) {
      assert.ok(charset.includes(ch), `Unexpected char: ${ch}`);
    }
  }
});

test('generateText produces different values across calls', () => {
  const results = new Set(Array.from({ length: 20 }, () => generateText(6)));
  assert.ok(results.size > 1, 'All 20 generated texts were identical');
});

run();
