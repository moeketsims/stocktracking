/**
 * PIN auth utilities — local-only 4-digit unlock that gates the app on
 * cold start once the user has signed in with email/password.
 *
 * Threat model: a casual attacker who picks up an unlocked phone. We do
 * NOT defend against an attacker with full SecureStore access — they
 * already have the bearer tokens too, so the PIN is moot at that point.
 *
 * Storage: all values live in SecureStore (Android Keystore / iOS Keychain).
 * Wrong-attempt counter is persisted so it survives an app kill.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const KEY_PIN_HASH = 'pin_hash';
const KEY_PIN_SALT = 'pin_salt';
const KEY_PIN_ATTEMPTS = 'pin_attempts';

/** Maximum wrong attempts before we wipe the PIN + tokens. */
export const MAX_PIN_ATTEMPTS = 5;
/** Required PIN length. */
export const PIN_LENGTH = 4;

function generateSalt(): string {
  // 16 random bytes hex-encoded — 32 chars. Per-device, set once on PIN
  // creation, never changes thereafter (until PIN is cleared).
  const bytes = Crypto.getRandomBytes(16);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Returns true if a PIN has been configured for this device. */
export async function hasPin(): Promise<boolean> {
  const hash = await getStoredValue(KEY_PIN_HASH);
  return !!hash;
}

/** Set a new PIN. Replaces any existing PIN. Resets the attempt counter. */
export async function setPin(pin: string): Promise<void> {
  if (pin.length !== PIN_LENGTH) {
    throw new Error(`PIN must be ${PIN_LENGTH} digits`);
  }
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  await setStoredValue(KEY_PIN_SALT, salt);
  await setStoredValue(KEY_PIN_HASH, hash);
  await deleteStoredValue(KEY_PIN_ATTEMPTS);
}

/**
 * Verify a PIN against the stored hash.
 *
 * Returns:
 *   - { ok: true } on success — also resets the attempt counter.
 *   - { ok: false, attemptsLeft } on wrong PIN — increments counter.
 *   - { ok: false, locked: true } when the counter has hit MAX_PIN_ATTEMPTS.
 *
 * Callers should clear PIN + tokens when `locked` is returned.
 */
export async function verifyPin(
  pin: string,
): Promise<
  | { ok: true }
  | { ok: false; attemptsLeft: number; locked?: false }
  | { ok: false; locked: true; attemptsLeft?: never }
> {
  const [storedHash, salt] = await Promise.all([
    getStoredValue(KEY_PIN_HASH),
    getStoredValue(KEY_PIN_SALT),
  ]);

  if (!storedHash || !salt) {
    // No PIN set — treat as locked so the gate falls back to login.
    return { ok: false, locked: true };
  }

  const candidate = await hashPin(pin, salt);
  if (candidate === storedHash) {
    await deleteStoredValue(KEY_PIN_ATTEMPTS);
    return { ok: true };
  }

  const prior = parseInt((await getStoredValue(KEY_PIN_ATTEMPTS)) ?? '0', 10);
  const next = Number.isFinite(prior) ? prior + 1 : 1;

  if (next >= MAX_PIN_ATTEMPTS) {
    await clearPin();
    return { ok: false, locked: true };
  }

  await setStoredValue(KEY_PIN_ATTEMPTS, String(next));
  return { ok: false, attemptsLeft: MAX_PIN_ATTEMPTS - next };
}

/** Wipe the stored PIN + salt + attempt counter. */
export async function clearPin(): Promise<void> {
  await Promise.all([
    deleteStoredValue(KEY_PIN_HASH),
    deleteStoredValue(KEY_PIN_SALT),
    deleteStoredValue(KEY_PIN_ATTEMPTS),
  ]);
}

/** Read the current wrong-attempt count without modifying it. */
export async function getAttemptCount(): Promise<number> {
  const raw = await getStoredValue(KEY_PIN_ATTEMPTS);
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}
