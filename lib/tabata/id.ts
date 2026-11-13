let sequence = 0;

/** Local record identifiers, never authentication tokens or security nonces. */
export function createId(): string {
  const cryptography = globalThis.crypto;
  if (typeof cryptography?.randomUUID === "function") {
    try {
      return cryptography.randomUUID();
    } catch {
      /* Try the broader Web Crypto API. */
    }
  }
  if (typeof cryptography?.getRandomValues === "function") {
    try {
      const bytes = cryptography.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      /* A restricted browser must still be able to start a local workout. */
    }
  }
  sequence += 1;
  return `local-${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}
