'use strict';

const { test, run, assert } = require('./runner');
const { buildSvg } = require('../src/svg');

test('buildSvg returns a string', () => {
  const svg = buildSvg('HELLO', {});
  assert.strictEqual(typeof svg, 'string');
});

test('buildSvg output starts with <svg', () => {
  const svg = buildSvg('ABC', {});
  assert.ok(svg.startsWith('<svg'), 'SVG should start with <svg');
});

test('buildSvg output ends with </svg>', () => {
  const svg = buildSvg('ABC', {});
  assert.ok(svg.trimRight().endsWith('</svg>'), 'SVG should end with </svg>');
});

test('buildSvg embeds all characters', () => {
  const text = 'XY34';
  const svg  = buildSvg(text, {});
  for (const ch of text) {
    assert.ok(svg.includes('>' + ch + '<'), 'SVG missing character: ' + ch);
  }
});

test('buildSvg respects width and height options', () => {
  const svg = buildSvg('A', { width: 300, height: 100 });
  assert.ok(svg.includes('width="300"'), 'Wrong width');
  assert.ok(svg.includes('height="100"'), 'Wrong height');
});

test('buildSvg omits filter and noise when noise=false', () => {
  const svg = buildSvg('AB', { noise: false });
  assert.ok(!svg.includes('<filter'), 'Filter present when noise=false');
  assert.ok(!svg.includes('<circle'), 'Dots present when noise=false');
  assert.ok(!svg.includes('<path'), 'Lines present when noise=false');
});

test('buildSvg includes filter when noise=true', () => {
  const svg = buildSvg('AB', { noise: true });
  assert.ok(svg.includes('<filter'), 'Filter missing when noise=true');
});

test('buildSvg escapes XML special chars in text', () => {
  const svg = buildSvg('A<B', { noise: false });
  assert.ok(!svg.includes('><B<'), 'Raw < not escaped in SVG text');
  assert.ok(svg.includes('&lt;'), 'Missing &lt; escape');
});

test('buildSvg different outputs for same input (random seed)', () => {
  const a = buildSvg('TEST', {});
  const b = buildSvg('TEST', {});
  assert.notStrictEqual(a, b, 'Two SVGs with same text should differ (random seed)');
});

run();
