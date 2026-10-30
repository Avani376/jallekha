/**
 * Small deterministic string hash (djb2-style) for stable IDs and import
 * idempotency keys. NOT cryptographic and not used for security.
 */
export function stableHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
