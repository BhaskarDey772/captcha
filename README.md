# captcha

> Canvas CAPTCHA generator with HMAC token verification.

[![npm version](https://img.shields.io/npm/v/%40bhaskardey772%2Fcaptcha.svg)](https://www.npmjs.com/package/@bhaskardey772/captcha)
[![license](https://img.shields.io/npm/l/%40bhaskardey772%2Fcaptcha.svg)](LICENSE)
[![node](https://img.shields.io/node/v/%40bhaskardey772%2Fcaptcha.svg)](package.json)

Generates distorted CAPTCHA images using the **Canvas 2D API** (via `node-canvas`) and verifies answers using stateless HMAC-signed tokens. No sessions, no databases. Written in TypeScript — types included.

**Architecture:** runs entirely on the backend. Your server generates `{ dataUrl, token }` and sends both to the browser. The browser draws the image onto a `<canvas>` and submits the typed answer + token back. Your server verifies — done.

---

## Install

```bash
npm install @bhaskardey772/captcha
```

> Requires the `node-canvas` native addon. Make sure your system has the [canvas build prerequisites](https://github.com/Automattic/node-canvas#compiling) (Cairo, Pango, etc.) installed.

---

## Quick start

```js
// CommonJS
const capta = require('@bhaskardey772/captcha');

// ESM / TypeScript
import * as capta from '@bhaskardey772/captcha';

// Generate
const { dataUrl, token } = capta.create({ secret: process.env.CAPTCHA_SECRET });
// → dataUrl: 'data:image/png;base64,...'  send to browser
// → token:   'eyJ0Ij...'                  send as hidden field or JSON

// Verify (on form submit) — case-sensitive
const result = capta.verify(token, userTypedAnswer, process.env.CAPTCHA_SECRET);
// → { valid: true,  reason: 'ok' }
// → { valid: false, reason: 'wrong_answer' | 'expired' | 'sig_mismatch' | 'malformed' }
```

---

## React + Express integration

### 1. Backend (Express)

```js
const express = require('express');
const capta   = require('@bhaskardey772/captcha');

const app = express();
app.use(express.json());

const captcha = capta.configure({
  secret:     process.env.CAPTCHA_SECRET,
  ttl:        300,
  length:     5,
  distortion: 'medium',
});

// GET /api/captcha — send fresh PNG dataUrl + token
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

  res.json({ success: true });
});
```

### 2. Frontend — `<CaptchaField>` component (React)

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';

export function CaptchaField({ onChange }) {
  const [token, setToken] = useState('');
  const canvasRef = useRef(null);

  const refresh = useCallback(async () => {
    const { dataUrl, token } = await fetch('/api/captcha').then(r => r.json());
    setToken(token);
    onChange({ token, answer: '' });

    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 220, 70);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, [onChange]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <canvas ref={canvasRef} width={220} height={70} style={{ borderRadius: 4 }} />
      <button type="button" onClick={refresh} aria-label="Refresh CAPTCHA">↺</button>
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

## API

### `capta.create(options)` → `{ dataUrl, token }`

Generates random text, renders a distorted PNG via Canvas 2D, and returns a signed HMAC token.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secret` | `string` | **required** | HMAC signing key (server-side only) |
| `length` | `number` | `6` | Number of characters |
| `ttl` | `number` | `300` | Token expiry in seconds |
| `width` | `number` | `220` | Canvas width (px) |
| `height` | `number` | `70` | Canvas height (px) |
| `fontSize` | `number` | `34` | Base font size (px) |
| `background` | `string` | `'#f4f4f4'` | Background colour |
| `charset` | `string` | unambiguous alphanumeric | Characters to draw from |
| `noise` | `boolean` | `true` | Add noise lines, ellipses, and dots |
| `distortion` | `'low'\|'medium'\|'high'` | `'medium'` | Distortion intensity |

### `capta.verify(token, answer, secret)` → `{ valid, reason }`

Verifies a token against the user's typed answer. **Stateless** — no session or database needed.

> **Verification is case-sensitive.** The answer must match exactly as displayed.
> Leading/trailing whitespace is trimmed automatically.

| `reason` | Meaning |
|----------|---------|
| `'ok'` | Correct answer, token valid |
| `'wrong_answer'` | Signature valid but answer is incorrect |
| `'expired'` | Token TTL has elapsed |
| `'sig_mismatch'` | Token was tampered with or signed with a different secret |
| `'malformed'` | Not a valid token |

### `capta.configure(options)` → `{ create, verify }`

Returns a reusable instance with `secret` and defaults baked in — avoids repeating options on every call.

```js
const captcha = capta.configure({ secret: process.env.CAPTCHA_SECRET, ttl: 600 });

const { dataUrl, token } = captcha.create();
const result             = captcha.verify(token, userAnswer);
```

### `capta.createCanvasImage(text, options)` → `string`

Low-level: render a PNG dataUrl from arbitrary text without creating a token. Useful when you store the answer yourself (session, Redis, etc.).

```js
const dataUrl = capta.createCanvasImage('AB3K7', { width: 220, height: 70 });
req.session.captchaAnswer = 'AB3K7';
```

### `capta.createToken(text, secret, options)` → `string`

Low-level: sign text into an HMAC token without rendering an image.

---

## How distortion works

Three independent layers:

1. **Per-character geometry** — random `rotate` (±20°), `skewX` (±16°), vertical jitter (±16 px), font-size variation (80–110%), random font family and weight
2. **Ghost layers** — each character is drawn 1–2 extra times at slight random offsets with low opacity, simulating SVG turbulence displacement
3. **Structural noise** — wavy polyline strokes, random ellipses, and dot scatter rendered over the text

**Token format:** `BASE64URL(JSON_PAYLOAD).BASE64URL(HMAC_SHA256)`

The payload contains the normalized answer, expiry timestamp, and a random nonce. The HMAC signature is verified with `crypto.timingSafeEqual` before the payload is decoded, preventing timing attacks.

---

## How it stops bots

| Attack vector | Protection |
|---------------|-----------|
| Simple form bots | Must visually solve the distorted canvas challenge |
| Automated token replay | Token expires after `ttl` seconds; combine with a Redis nonce denylist for strict one-time-use |
| Token forgery | HMAC-SHA256 signed with a server-only secret |
| Answer brute-force | Default 5-char mixed-case charset = ~52^5 ≈ 380 million combinations; pair with rate-limiting |
| Token tampering | Payload verified with `crypto.timingSafeEqual` — any modification is detected |
| OCR bots | Per-character rotation, skew, jitter, ghost layers, and noise break optical recognition |

---

## Security notes

- Store `CAPTCHA_SECRET` in an environment variable — never hardcode it or expose it to the client
- Generate a strong secret: `openssl rand -hex 32`
- For strict one-time-use enforcement, maintain a short-lived Redis SET of used nonces (the `n` field in the decoded payload) matching the token `ttl`
- The default charset excludes visually ambiguous characters (0/O, 1/I/l, 5/S, 8/B, 2/Z, 6/G, 9/q, U/V, u/v)
- `capta` does not provide rate-limiting — add that at the API layer (e.g. `express-rate-limit`)

---

## License

MIT
