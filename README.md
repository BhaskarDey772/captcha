# captcha

> SVG CAPTCHA generator with HMAC token verification — **zero runtime dependencies.**

[![npm version](https://img.shields.io/npm/v/%40bhaskardey772%2Fcaptcha.svg)](https://www.npmjs.com/package/@bhaskardey772/captcha)
[![license](https://img.shields.io/npm/l/%40bhaskardey772%2Fcaptcha.svg)](LICENSE)
[![node](https://img.shields.io/node/v/%40bhaskardey772%2Fcaptcha.svg)](package.json)

Generates distorted SVG text CAPTCHAs on your **Node.js server** and verifies answers using stateless HMAC-signed tokens. No sessions, no databases, no native addons.

**Architecture:** `capta` runs entirely on the backend. Your server generates `{ svg, token }` and sends both to the browser. The browser displays the SVG and submits the typed answer + token back. Your server verifies — done.

---

## Install

```bash
npm install @bhaskardey772/captcha
```

---

## React + Express integration

This is the most common setup: a React frontend protected by an Express backend.

### 1. Backend (Express)

```js
// server.js
const express = require('express');
const capta   = require('@bhaskardey772/captcha');

const app = express();
app.use(express.json());

// Create once at startup — bakes in your secret and defaults
const captcha = capta.configure({
  secret:     process.env.CAPTCHA_SECRET, // keep server-side only
  ttl:        300,        // 5-minute expiry
  length:     5,
  distortion: 'medium',
});

// GET /api/captcha — send fresh SVG + token to the browser
app.get('/api/captcha', (req, res) => {
  res.json(captcha.create());
});

// POST /api/register — verify before processing
app.post('/api/register', (req, res) => {
  const { captchaToken, captchaAnswer, ...userData } = req.body;

  const result = captcha.verify(captchaToken, captchaAnswer);
  if (!result.valid) {
    // reason: 'wrong_answer' | 'expired' | 'sig_mismatch' | 'malformed'
    return res.status(422).json({ error: 'CAPTCHA failed', reason: result.reason });
  }

  // Bot check passed — create the user
  res.json({ success: true });
});
```

### 2. Frontend — `<CaptchaField>` component (React)

```jsx
// CaptchaField.jsx
import { useState, useEffect, useCallback } from 'react';

export function CaptchaField({ onChange }) {
  const [svg,   setSvg]   = useState('');
  const [token, setToken] = useState('');

  const refresh = useCallback(async () => {
    const data = await fetch('/api/captcha').then(r => r.json());
    setSvg(data.svg);
    setToken(data.token);
    onChange({ token: data.token, answer: '' });
  }, [onChange]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Render the SVG inline — no <img> or data URL needed */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />

      <button type="button" onClick={refresh} aria-label="Refresh CAPTCHA">
        ↺
      </button>

      <input
        type="text"
        placeholder="Type the characters above"
        autoComplete="off"
        onChange={e => onChange({ token, answer: e.target.value })}
      />
    </div>
  );
}
```

### 3. Wiring it into a form

```jsx
// RegisterForm.jsx
import { useState } from 'react';
import { CaptchaField } from './CaptchaField';

export function RegisterForm() {
  const [captcha, setCaptcha] = useState({ token: '', answer: '' });
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:         e.target.email.value,
        password:      e.target.password.value,
        captchaToken:  captcha.token,
        captchaAnswer: captcha.answer,
      }),
    });

    if (!res.ok) {
      const { reason } = await res.json();
      setError(reason === 'expired' ? 'CAPTCHA expired — please refresh.' : 'Wrong answer, try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email"    type="email"    placeholder="Email"    required />
      <input name="password" type="password" placeholder="Password" required />

      <CaptchaField onChange={setCaptcha} />
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit">Register</button>
    </form>
  );
}
```

---

## Quick start (minimal)

```js
const capta = require('@bhaskardey772/captcha');

// Generate
const { svg, token } = capta.create({ secret: process.env.CAPTCHA_SECRET });
// → svg:   '<svg ...>...</svg>'  send to browser for display
// → token: 'eyJ0Ij...'          send as hidden field or JSON

// Verify (on form submit)
const result = capta.verify(token, userTypedAnswer, process.env.CAPTCHA_SECRET);
// → { valid: true,  reason: 'ok' }
// → { valid: false, reason: 'wrong_answer' | 'expired' | 'sig_mismatch' | 'malformed' }
```

---

## API

### `capta.create(options)` → `{ svg, token }`

Generates random text, builds a distorted SVG, and returns a signed HMAC token.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | **required** | HMAC signing key (server-side only) |
| `length` | `number` | `6` | Number of characters |
| `ttl` | `number` | `300` | Token expiry in seconds |
| `width` | `number` | `200` | SVG width (px) |
| `height` | `number` | `70` | SVG height (px) |
| `fontSize` | `number` | `36` | Base font size (px) |
| `background` | `string` | `'#f0f0f0'` | SVG background color |
| `color` | `string` | `'#333333'` | Text color |
| `charset` | `string` | unambiguous alphanumeric | Characters to draw from |
| `noise` | `boolean` | `true` | Add noise lines and dots |
| `distortion` | `'low'\|'medium'\|'high'` | `'medium'` | Distortion intensity |

### `capta.verify(token, answer, secret)` → `{ valid, reason }`

Verifies a token against the user's typed answer. **Stateless** — no session or database needed.

Verification is **case-insensitive** and **trims whitespace** automatically.

| `reason` | Meaning |
|----------|---------|
| `'ok'` | Correct answer, token valid |
| `'wrong_answer'` | Signature valid but answer is incorrect |
| `'expired'` | Token TTL has elapsed |
| `'sig_mismatch'` | Token was tampered with or signed with a different secret |
| `'malformed'` | Not a valid capta token |

### `capta.configure(options)` → `{ create, verify }`

Returns a reusable instance with `secret` and defaults baked in — avoids repeating options on every call.

```js
const captcha = capta.configure({ secret: process.env.CAPTCHA_SECRET, ttl: 600 });

const { svg, token } = captcha.create();                  // no secret needed here
const result          = captcha.verify(token, userAnswer); // no secret needed here
```

### `capta.createSvg(text, options)` → `string`

Low-level: build an SVG from arbitrary text without creating a token. Useful when you store the answer yourself (session, Redis, etc.).

```js
const svg = capta.createSvg('AB3K7', { width: 200, height: 70 });
req.session.captchaAnswer = 'ab3k7';
```

### `capta.createToken(text, secret, options)` → `string`

Low-level: sign text into an HMAC token without generating an SVG.

---

## How it stops bots

| Attack vector | Protection |
|---------------|-----------|
| Simple form bots | Must visually solve the distorted SVG challenge |
| Automated token replay | Token expires after `ttl` seconds; combine with a Redis nonce denylist for strict one-time-use |
| Token forgery | HMAC-SHA256 signed with a server-only secret — impossible to fake without the key |
| Answer brute-force | Default 5-char charset = 54^5 ≈ 459 million combinations; pair with rate-limiting for extra protection |
| Token tampering | Payload verified with `crypto.timingSafeEqual` before decoding — any modification is detected |
| OCR bots | Per-character rotation, skew, jitter + SVG turbulence filter + noise lines/dots break optical recognition |

---

## How it works

**SVG distortion** — three independent layers rendered by the browser:

1. **Per-character transforms** — each character gets its own random `rotate` (±18°), `skewX` (±12°), vertical jitter (±8 px), and font-size variation (±18%)
2. **SVG filter** — `feTurbulence` + `feDisplacementMap` applied to the text group; a random `seed` ensures every CAPTCHA looks unique
3. **Structural noise** — wavy `<path>` lines and dot scatter `<circle>` elements overlaid on top of the text

**Token format:** `BASE64URL(JSON_PAYLOAD).BASE64URL(HMAC_SHA256)`

The payload contains the normalized answer, expiry timestamp, and a random nonce. The HMAC signature is verified with `crypto.timingSafeEqual` *before* the payload is decoded, preventing timing attacks.

---

## Security notes

- Store `CAPTCHA_SECRET` in an environment variable — never hardcode it or expose it to the client
- Generate a strong secret: `openssl rand -hex 32`
- For strict one-time-use enforcement, maintain a short-lived Redis SET of used nonces (the `n` field in the decoded payload) matching the token `ttl`
- The default charset excludes visually ambiguous characters (0/O, 1/I/l) to avoid frustrating real users
- `capta` does not provide rate-limiting — add that at the API layer (e.g., `express-rate-limit`)

---

## License

MIT
