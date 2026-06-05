import { encrypt, decrypt, generateIV, deriveKey } from './encryption.util';

describe('Encryption Utility', () => {
  const masterKey = 'test-master-key-32-char-long!!';

  it('should encrypt and decrypt data correctly', () => {
    const plaintext = 'my-secret-access-key-123';
    const iv = generateIV();
    const key = deriveKey(masterKey, iv);
    const encrypted = encrypt(plaintext, key, iv);
    const decrypted = decrypt(encrypted, key, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext with different IVs', () => {
    const plaintext = 'same-secret';
    const iv1 = generateIV();
    const iv2 = generateIV();
    const key1 = deriveKey(masterKey, iv1);
    const key2 = deriveKey(masterKey, iv2);
    const encrypted1 = encrypt(plaintext, key1, iv1);
    const encrypted2 = encrypt(plaintext, key2, iv2);
    // Two buffers with different content are not equal
    expect(Buffer.compare(encrypted1, encrypted2)).not.toBe(0);
  });

  it('should fail to decrypt with wrong key', () => {
    const plaintext = 'secret-data';
    const iv = generateIV();
    const correctKey = deriveKey(masterKey, iv);
    const wrongKey = deriveKey('wrong-master-key', iv);
    const encrypted = encrypt(plaintext, correctKey, iv);
    expect(() => decrypt(encrypted, wrongKey, iv)).toThrow();
  });

  it('should fail to decrypt with tampered ciphertext', () => {
    const plaintext = 'integrity-check';
    const iv = generateIV();
    const key = deriveKey(masterKey, iv);
    const encrypted = encrypt(plaintext, key, iv);
    // Tamper with one byte of ciphertext (after the auth tag)
    encrypted[20] ^= 0xff;
    expect(() => decrypt(encrypted, key, iv)).toThrow();
  });

  it('should produce deterministic key from same master key and IV', () => {
    const iv = generateIV();
    const key1 = deriveKey(masterKey, iv);
    const key2 = deriveKey(masterKey, iv);
    expect(Buffer.compare(key1, key2)).toBe(0);
  });

  it('should produce different keys from different IVs', () => {
    const iv1 = generateIV();
    const iv2 = generateIV();
    const key1 = deriveKey(masterKey, iv1);
    const key2 = deriveKey(masterKey, iv2);
    expect(Buffer.compare(key1, key2)).not.toBe(0);
  });
});
