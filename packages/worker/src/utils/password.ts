/**
 * Password Hashing Utilities using Web Crypto API
 *
 * Uses PBKDF2 with SHA-256 — Workers-native, no external dependencies.
 * Salt is generated per-password and stored with the hash.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password with PBKDF2
 * Returns format: base64(salt):base64(hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  // Encode salt and hash as base64
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));

  return `${saltBase64}:${hashBase64}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) {
    return false;
  }

  // Decode stored salt
  const salt = new Uint8Array(
    atob(saltBase64).split('').map((c) => c.charCodeAt(0))
  );

  // Decode stored hash
  const expectedHash = new Uint8Array(
    atob(hashBase64).split('').map((c) => c.charCodeAt(0))
  );

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2 with same salt
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const derivedHash = new Uint8Array(derivedBits);

  // Constant-time comparison
  if (derivedHash.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < derivedHash.length; i++) {
    result |= derivedHash[i] ^ expectedHash[i];
  }

  return result === 0;
}
