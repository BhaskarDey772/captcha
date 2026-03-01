'use strict';

const { test, run, assert } = require('./runner');
const { createToken, verify } = require('../src/token');

const SECRET = 'test-secret-key-123';

test('createToken returns a string with a dot separator', () => {
  const token = createToken('abc123', SECRET);
  assert.equal(typeof token, 'string');
  assert.ok(token.includes('.'), 'Token should contain a dot separator');
});

test('verify returns valid:true for correct answer', () => {
  const text  = 'xk3m7p';
  const token = createToken(text, SECRET);
  const result = verify(token, text, SECRET);
  assert.equal(result.valid, true);
  assert.equal(result.reason, 'ok');
});

test('verify is case-insensitive', () => {
  const token  = createToken('AbCdEf', SECRET);
  const result = verify(token, 'abcdef', SECRET);
  assert.equal(result.valid, true);
});

test('verify trims whitespace from answer', () => {
  const token  = createToken('abc', SECRET);
  const result = verify(token, '  abc  ', SECRET);
  assert.equal(result.valid, true);
});

test('verify returns wrong_answer for incorrect answer', () => {
  const token  = createToken('correct', SECRET);
  const result = verify(token, 'wrong', SECRET);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'wrong_answer');
});

test('verify returns sig_mismatch for wrong secret', () => {
  const token  = createToken('abc', SECRET);
  const result = verify(token, 'abc', 'wrong-secret');
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'sig_mismatch');
});

test('verify returns expired for TTL=0 token', (_, done) => {
  const token = createToken('abc', SECRET, { ttl: 0 });
  // TTL=0 means expiry = now, so by the time verify runs it's expired
  setTimeout(() => {
    const result = verify(token, 'abc', SECRET);
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'expired');
    done();
  }, 5);
});

test('verify returns malformed for garbage token', () => {
  const result = verify('notavalidtoken', 'abc', SECRET);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'malformed');
});

test('verify returns malformed for non-string inputs', () => {
  assert.equal(verify(null, 'abc', SECRET).reason, 'malformed');
  assert.equal(verify('tok', null, SECRET).reason, 'malformed');
  assert.equal(verify('tok', 'abc', null).reason, 'malformed');
});

test('createToken throws for empty text', () => {
  assert.throws(() => createToken('', SECRET), TypeError);
});

test('createToken throws for empty secret', () => {
  assert.throws(() => createToken('abc', ''), TypeError);
});

test('verify detects tampered payload', () => {
  const token = createToken('abc', SECRET);
  // Flip a char in the payload portion
  const [payload, sig] = token.split('.');
  const tampered = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A') + '.' + sig;
  const result = verify(tampered, 'abc', SECRET);
  assert.equal(result.valid, false);
});

run();
