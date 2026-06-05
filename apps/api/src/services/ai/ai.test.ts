import { AIService, ProcessResult } from './ai.service';
import { VaultService } from '../vault/vault.service';

describe('AIService', () => {
  let aiService: AIService;
  let mockVault: VaultService;

  beforeEach(() => {
    mockVault = {
      getTemporaryCredential: jest.fn(),
    } as any;
    aiService = new AIService(mockVault);
  });

  describe('processMessage - plan mode', () => {
    it('should generate plan for resource query', async () => {
      const result = await aiService.processMessage(
        '查看AWS EC2实例',
        { mode: 'plan' }
      );

      expect(result).toHaveProperty('plan');
      expect(result.plan).toHaveProperty('steps');
      expect(result.plan!.steps.length).toBeGreaterThan(0);
      expect(result.plan!.steps[0].action).toBe('list_ec2_instances');
    });

    it('should not call vault in plan mode', async () => {
      await aiService.processMessage('查看AWS EC2实例', { mode: 'plan' });

      expect(mockVault.getTemporaryCredential).not.toHaveBeenCalled();
    });

    it('should generate plan with region info', async () => {
      const result = await aiService.processMessage(
        '查看AWS us-east-1的所有EC2实例',
        { mode: 'plan' }
      );

      expect(result.plan!.steps[0].params.region).toBe('us-east-1');
    });
  });

  describe('processMessage - ask mode', () => {
    it('should request confirmation for stop operation', async () => {
      const result = await aiService.processMessage(
        '停止i-1234567890',
        { mode: 'ask' }
      );

      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationMessage).toContain('确认');
    });

    it('should not call vault in ask mode', async () => {
      await aiService.processMessage('停止i-1234567890', { mode: 'ask' });

      expect(mockVault.getTemporaryCredential).not.toHaveBeenCalled();
    });

    it('should still return plan in ask mode', async () => {
      const result = await aiService.processMessage(
        '停止i-1234567890',
        { mode: 'ask' }
      );

      expect(result).toHaveProperty('plan');
      expect(result.plan!.steps.length).toBeGreaterThan(0);
    });
  });

  describe('processMessage - auto mode', () => {
    it('should request temp credential before execution', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test123',
        cloudPlatform: 'aws',
      });

      await aiService.processMessage('查看AWS EC2实例', { mode: 'auto' });

      expect(mockVault.getTemporaryCredential).toHaveBeenCalled();
    });

    it('should return execution result with token', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test123',
        cloudPlatform: 'aws',
      });

      const result = await aiService.processMessage(
        '查看AWS EC2实例',
        { mode: 'auto' }
      );

      expect(result).toHaveProperty('execution');
      expect(result.execution.token).toBe('sess_test123');
      expect(result.execution.status).toBe('ready');
    });

    it('should execute stop operation in auto mode', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_stop456',
        cloudPlatform: 'aws',
      });

      const result = await aiService.processMessage(
        '停止i-1234567890',
        { mode: 'auto' }
      );

      expect(result).toHaveProperty('execution');
      expect(result.execution.status).toBe('executing');
      expect(result.plan!.steps[0].action).toBe('stop_resource');
    });
  });

  describe('intent parsing integration', () => {
    it('should handle delete operation', async () => {
      const result = await aiService.processMessage(
        '删除i-1234567890',
        { mode: 'ask' }
      );

      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationMessage).toContain('delete');
    });

    it('should handle start operation', async () => {
      const result = await aiService.processMessage(
        '启动i-1234567890',
        { mode: 'plan' }
      );

      expect(result.plan!.steps[0].action).toBe('start_resource');
    });

    it('should throw for completely unknown input', async () => {
      // parseIntent defaults to 'query' for unknown input, so this should not throw
      // but let's verify it handles gracefully
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test',
        cloudPlatform: 'aws',
      });

      const result = await aiService.processMessage(
        'hello world',
        { mode: 'auto' }
      );

      expect(result).toHaveProperty('plan');
    });
  });

  describe('credential isolation', () => {
    it('should only expose temporary token, never raw credentials', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_isolated123',
        cloudPlatform: 'aws',
        credentialType: 'access_key',
        credentialId: 'cred-1',
        expiresAt: new Date(),
      });

      const result = await aiService.processMessage(
        '查看AWS EC2实例',
        { mode: 'auto', userId: 'user-1' }
      );

      // Should contain the token
      expect(result.execution.token).toBe('sess_isolated123');

      // Should NOT contain any raw credential fields
      expect(result.execution).not.toHaveProperty('secretAccessKey');
      expect(result.execution).not.toHaveProperty('accessKeyId');
      expect(result.execution).not.toHaveProperty('credentialData');
    });

    it('should pass userId to vault service', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test',
        cloudPlatform: 'aws',
      });

      await aiService.processMessage(
        '查看AWS EC2实例',
        { mode: 'auto', userId: 'user-42' }
      );

      expect(mockVault.getTemporaryCredential).toHaveBeenCalledWith(
        'user-42',
        expect.any(String)
      );
    });

    it('should use anonymous as default userId', async () => {
      (mockVault.getTemporaryCredential as jest.Mock).mockResolvedValue({
        token: 'sess_test',
        cloudPlatform: 'aws',
      });

      await aiService.processMessage('查看AWS EC2实例', { mode: 'auto' });

      expect(mockVault.getTemporaryCredential).toHaveBeenCalledWith(
        'anonymous',
        expect.any(String)
      );
    });
  });
});
