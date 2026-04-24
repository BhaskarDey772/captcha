export function toBase64url(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function fromBase64url(str: string): Buffer {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str + '='.repeat(padLen);
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );
}
