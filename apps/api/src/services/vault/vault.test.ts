import { VaultService, StoreCredentialInput } from './vault.service';
import { encrypt, generateIV, deriveKey } from './encryption.util';
import { Pool } from 'pg';

describe('VaultService', () => {
  let vaultService: VaultService;
  let mockDb: Pool;
  const masterKey = 'test-master-key';

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;
    vaultService = new VaultService(mockDb, masterKey);
  });

  describe('storeCredential', () => {
    it('should store credential encrypted', async () => {
      const credential: StoreCredentialInput = {
        name: 'AWS Production',
        cloudPlatform: 'aws',
        credentialType: 'access_key',
        data: {
          accessKeyId: 'AKIA1234567890',
          secretAccessKey: 'secret123',
        },
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'cred-1' }] });

      const result = await vaultService.storeCredential('user-1', credential);

      expect(result).toHaveProperty('id', 'cred-1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO credentials'),
        expect.arrayContaining([
          'user-1',
          'AWS Production',
          'aws',
          'access_key',
          expect.any(Buffer),
          expect.any(Buffer),
        ])
      );
    });
  });

  describe('getTemporaryCredential', () => {
    it('should return temp credential without exposing secrets', async () => {
      const credId = 'cred-1';
      const userId = 'user-1';

      // Create properly encrypted test data so decryption succeeds
      const iv = generateIV();
      const key = deriveKey(masterKey, iv);
      const secretPayload = JSON.stringify({ accessKeyId: 'AKIA1234567890', secretAccessKey: 'secret123' });
      const encrypted = encrypt(secretPayload, key, iv);

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: credId,
            encrypted_data: encrypted,
            iv: iv,
            cloud_platform: 'aws',
            credential_type: 'access_key',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE last_used_at

      const result = await vaultService.getTemporaryCredential(userId, credId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('cloudPlatform', 'aws');
      expect(result).not.toHaveProperty('secretAccessKey');
      expect(result).not.toHaveProperty('accessKeyId');
    });

    it('should reject access if credential not owned by user', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(
        vaultService.getTemporaryCredential('wrong-user', 'cred-1')
      ).rejects.toThrow('Credential not found');
    });
  });

  describe('listCredentials', () => {
    it('should return list of credentials for user', async () => {
      const mockRows = [
        {
          id: 'cred-1',
          name: 'AWS Prod',
          cloud_platform: 'aws',
          credential_type: 'access_key',
          created_at: new Date(),
          last_used_at: null,
        },
        {
          id: 'cred-2',
          name: 'Azure Dev',
          cloud_platform: 'azure',
          credential_type: 'service_principal',
          created_at: new Date(),
          last_used_at: new Date(),
        },
      ];

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await vaultService.listCredentials('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'cred-1');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-1']
      );
    });

    it('should return empty array when no credentials exist', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await vaultService.listCredentials('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential by id and user id', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await vaultService.deleteCredential('user-1', 'cred-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM credentials'),
        ['cred-1', 'user-1']
      );
    });
  });
});
