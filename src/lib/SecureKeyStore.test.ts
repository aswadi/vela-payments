import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { SecureKeyStore } from './SecureKeyStore';
import { SECURE_KEYS } from './SecureKeyStore.types';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  canUseBiometricAuthentication: jest.fn(),
}));

describe('SecureKeyStore platform storage capability checks', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOS,
    });
  });

  it('reports supported capabilities on iOS when expo-secure-store is available', async () => {
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);
    (SecureStore.canUseBiometricAuthentication as jest.Mock).mockReturnValueOnce(true);

    const capabilities = await SecureKeyStore.getStorageCapabilities('ios');

    expect(capabilities).toEqual({
      platform: 'ios',
      available: true,
      supportsKeychainService: true,
      supportsBiometricAuthentication: true,
      reason: 'supported',
    });
    expect(SecureKeyStore.isAvailable()).toBe(true);
  });

  it('reports supported capabilities on Android and reflects biometric hardware status', async () => {
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);
    (SecureStore.canUseBiometricAuthentication as jest.Mock).mockReturnValueOnce(false);

    const capabilities = await SecureKeyStore.getStorageCapabilities('android');

    expect(capabilities).toEqual({
      platform: 'android',
      available: true,
      supportsKeychainService: true,
      supportsBiometricAuthentication: false,
      reason: 'supported',
    });
  });

  it('returns web_unsupported on web without invoking native storage probes', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    const capabilities = await SecureKeyStore.getStorageCapabilities();

    expect(capabilities).toEqual({
      platform: 'web',
      available: false,
      supportsKeychainService: false,
      supportsBiometricAuthentication: false,
      reason: 'web_unsupported',
    });
    expect(SecureKeyStore.isAvailable()).toBe(false);
    expect(SecureStore.isAvailableAsync).not.toHaveBeenCalled();
  });

  it('returns runtime_unavailable when the device reports secure storage is unavailable', async () => {
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

    const capabilities = await SecureKeyStore.getStorageCapabilities('android');

    expect(capabilities).toEqual({
      platform: 'android',
      available: false,
      supportsKeychainService: false,
      supportsBiometricAuthentication: false,
      reason: 'runtime_unavailable',
    });
  });

  it('returns probe_failed when isAvailableAsync rejects', async () => {
    (SecureStore.isAvailableAsync as jest.Mock).mockRejectedValueOnce(new Error('Keystore locked'));

    const capabilities = await SecureKeyStore.getStorageCapabilities('ios');

    expect(capabilities).toEqual({
      platform: 'ios',
      available: false,
      supportsKeychainService: false,
      supportsBiometricAuthentication: false,
      reason: 'probe_failed',
    });
  });

  it('preserves existing get, set, and delete behavior for secure keys', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-id');
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

    await SecureKeyStore.set(SECURE_KEYS.PASSKEY_CREDENTIAL_ID, 'stored-id');
    const value = await SecureKeyStore.get(SECURE_KEYS.PASSKEY_CREDENTIAL_ID);
    await SecureKeyStore.delete(SECURE_KEYS.PASSKEY_CREDENTIAL_ID);

    expect(value).toBe('stored-id');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SECURE_KEYS.PASSKEY_CREDENTIAL_ID,
      'stored-id',
      expect.objectContaining({
        requireAuthentication: true,
        keychainService: 'ding-payments',
      })
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.PASSKEY_CREDENTIAL_ID, {
      keychainService: 'ding-payments',
    });
  });
});
