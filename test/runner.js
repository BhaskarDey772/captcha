'use strict';

// Minimal test runner compatible with Node 10+
const assert = require('assert');

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  pending.push({ name, fn });
}

async function run() {
  for (const { name, fn } of pending) {
    try {
      await new Promise((resolve, reject) => {
        const result = fn(null, (err) => err ? reject(err) : resolve());
        if (result && typeof result.then === 'function') {
          result.then(resolve, reject);
        } else if (fn.length === 0) {
          resolve();
        }
        // If fn.length > 0 (uses done callback), wait for callback
      });
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

module.exports = { test, run, assert };
