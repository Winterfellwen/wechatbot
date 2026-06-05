import { Pool } from 'pg';
import { encrypt, decrypt, generateIV, deriveKey } from './encryption.util';
import { randomBytes } from 'crypto';

export interface StoreCredentialInput {
  name: string;
  cloudPlatform: string;
  credentialType: string;
  data: Record<string, any>;
}

export interface TemporaryCredential {
  token: string;
  cloudPlatform: string;
  credentialType: string;
  credentialId: string;
  expiresAt: Date;
}

export interface VaultCredential {
  id: string;
  name: string;
  cloudPlatform: string;
  credentialType: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export class VaultService {
  private db: Pool;
  private masterKey: string;

  constructor(db: Pool, masterKey: string) {
    this.db = db;
    this.masterKey = masterKey;
  }

  async storeCredential(userId: string, input: StoreCredentialInput): Promise<{ id: string }> {
    const iv = generateIV();
    const key = deriveKey(this.masterKey, iv);
    const plaintext = JSON.stringify(input.data);
    const encrypted = encrypt(plaintext, key, iv);

    const result = await this.db.query(
      `INSERT INTO credentials (user_id, name, cloud_platform, credential_type, encrypted_data, iv)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, input.name, input.cloudPlatform, input.credentialType, encrypted, iv]
    );

    return { id: result.rows[0].id };
  }

  async getTemporaryCredential(userId: string, credentialId: string): Promise<TemporaryCredential> {
    const result = await this.db.query(
      `SELECT * FROM credentials WHERE id = $1 AND user_id = $2`,
      [credentialId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Credential not found');
    }

    const cred = result.rows[0];
    const key = deriveKey(this.masterKey, cred.iv);
    const decrypted = decrypt(cred.encrypted_data, key, cred.iv);
    const credentialData = JSON.parse(decrypted);

    const token = `sess_${randomBytes(16).toString('hex')}`;

    await this.db.query(
      `UPDATE credentials SET last_used_at = NOW() WHERE id = $1`,
      [credentialId]
    );

    return {
      token,
      cloudPlatform: cred.cloud_platform,
      credentialType: cred.credential_type,
      credentialId: cred.id,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }

  async listCredentials(userId: string): Promise<VaultCredential[]> {
    const result = await this.db.query(
      `SELECT id, name, cloud_platform, credential_type, created_at, last_used_at
       FROM credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async deleteCredential(userId: string, credentialId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM credentials WHERE id = $1 AND user_id = $2`,
      [credentialId, userId]
    );
  }
}
