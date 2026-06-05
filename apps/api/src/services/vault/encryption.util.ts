import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export function generateIV(): Buffer {
  return randomBytes(IV_LENGTH);
}

export function deriveKey(masterKey: string, iv: Buffer): Buffer {
  return pbkdf2Sync(masterKey, iv, ITERATIONS, KEY_LENGTH, 'sha512');
}

export function encrypt(plaintext: string, key: Buffer, iv: Buffer): Buffer {
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Prepend auth tag to ciphertext so it can be extracted during decryption
  return Buffer.concat([authTag, encrypted]);
}

export function decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer): string {
  const authTag = ciphertext.subarray(0, AUTH_TAG_LENGTH);
  const encryptedData = ciphertext.subarray(AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}
