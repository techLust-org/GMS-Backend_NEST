import { webcrypto } from 'crypto';

// On this Node 16 runtime, globalThis.crypto is (incorrectly) bound to the
// classic `crypto` module instead of WebCrypto, so it has no getRandomValues.
// The AWS SDK v3's checksum middleware reads globalThis.crypto once at
// module-load time and calls getRandomValues unconditionally, crashing.
// This must be imported before any @aws-sdk package anywhere in the app —
// hence importing it as the very first line of main.ts.
if (typeof (globalThis as any).crypto?.getRandomValues !== 'function') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
