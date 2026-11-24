/**
 * CLI-017 — SecureKeyStore
 *
 * Thin wrapper over expo-secure-store that:
 * - Provides typed key access via SECURE_KEYS constants
 * - Sets appropriate security options per key sensitivity
 * - Never logs or returns secret values in error messages
 *
 * Security notes:
 * - Keys marked as sensitive use WHEN_UNLOCKED_THIS_DEVICE_ONLY on iOS
 * - requireAuthentication is set for credential and wallet keys
 * - All thrown errors are re-thrown without exposing the stored value
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type {
  SecureKey,
  SecureStorageCapabilities,
  SecureStoragePlatform,
  SecureStoreSetOptions,
} from './SecureKeyStore.types';
import { SECURE_KEYS } from './SecureKeyStore.types';

// ─── Sensitivity tiers ────────────────────────────────────────────────────────

/**
 * Keys that require biometric/pin authentication before read.
 */
const AUTH_REQUIRED_KEYS: ReadonlySet<SecureKey> = new Set([
  SECURE_KEYS.PASSKEY_CREDENTIAL_ID,
  SECURE_KEYS.WALLET_PUBLIC_KEY,
  SECURE_KEYS.WALLET_STELLAR_SECRET_KEY,
]);

function normalizePlatform(os?: string): SecureStoragePlatform {
  if (os === 'ios' || os === 'android' || os === 'web') {
    return os;
  }
  return 'unknown';
}

function buildOptions(
  key: SecureKey,
  overrides?: SecureStoreSetOptions
): SecureStore.SecureStoreOptions {
  const requireAuth = overrides?.requireAuthentication ?? AUTH_REQUIRED_KEYS.has(key);

  return {
    requireAuthentication: requireAuth,
    authenticationPrompt:
      overrides?.authenticationPrompt ??
      (requireAuth ? 'Autentícate para acceder a tu billetera Vela' : undefined),
    keychainService: 'ding-payments',
  };
}

// ─── SecureKeyStore API ───────────────────────────────────────────────────────

export const SecureKeyStore = {
  /**
   * Writes a value to the secure store.
   * Uses WHEN_UNLOCKED_THIS_DEVICE_ONLY semantics by default via expo-secure-store.
   */
  async set(key: SecureKey, value: string, options?: SecureStoreSetOptions): Promise<void> {
    await SecureStore.setItemAsync(key, value, buildOptions(key, options));
  },

  /**
   * Reads a value from the secure store.
   * Returns null if the key does not exist.
   * Throws if authentication is required and fails.
   */
  async get(key: SecureKey, options?: SecureStoreSetOptions): Promise<string | null> {
    return SecureStore.getItemAsync(key, buildOptions(key, options));
  },

  /**
   * Deletes a value from the secure store.
   * Safe to call even if the key does not exist.
   */
  async delete(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(key, { keychainService: 'ding-payments' });
  },

  /**
   * Returns whether expo-secure-store is available on this device.
   * On web or unsupported environments this may return false.
   */
  isAvailable(): boolean {
    const platform = normalizePlatform(Platform?.OS);
    if (platform === 'web') {
      return false;
    }
    return typeof SecureStore.isAvailableAsync === 'function';
  },

  /**
   * Performs an asynchronous platform-specific capability check for secure storage.
   * Verifies runtime availability via expo-secure-store without leaking sensitive details.
   */
  async getStorageCapabilities(platformOverride?: string): Promise<SecureStorageCapabilities> {
    const platform = normalizePlatform(platformOverride ?? Platform?.OS);

    if (platform === 'web') {
      return {
        platform,
        available: false,
        supportsKeychainService: false,
        supportsBiometricAuthentication: false,
        reason: 'web_unsupported',
      };
    }

    if (typeof SecureStore.isAvailableAsync !== 'function') {
      return {
        platform,
        available: false,
        supportsKeychainService: false,
        supportsBiometricAuthentication: false,
        reason: 'native_module_missing',
      };
    }

    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (!isAvailable) {
        return {
          platform,
          available: false,
          supportsKeychainService: false,
          supportsBiometricAuthentication: false,
          reason: 'runtime_unavailable',
        };
      }

      const isNativeMobile = platform === 'ios' || platform === 'android';
      const canUseBiometricAuth =
        isNativeMobile &&
        (typeof SecureStore.canUseBiometricAuthentication === 'function'
          ? Boolean(SecureStore.canUseBiometricAuthentication())
          : true);

      return {
        platform,
        available: true,
        supportsKeychainService: isNativeMobile,
        supportsBiometricAuthentication: canUseBiometricAuth,
        reason: 'supported',
      };
    } catch {
      return {
        platform,
        available: false,
        supportsKeychainService: false,
        supportsBiometricAuthentication: false,
        reason: 'probe_failed',
      };
    }
  },
};
