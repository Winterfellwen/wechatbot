import { WebSocketHandler, WebSocketMessage, WebSocketResponse } from './websocket-handler';
import { AIService } from '../services/ai/ai.service';
import { VaultService } from '../services/vault/vault.service';

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;
  let mockAIService: jest.Mocked<AIService>;
  let mockVaultService: jest.Mocked<VaultService>;
  let mockSocket: any;

  beforeEach(() => {
    mockAIService = {
      processMessage: jest.fn(),
    } as any;

    mockVaultService = {} as any;

    handler = new WebSocketHandler(mockAIService, mockVaultService);

    mockSocket = {
      id: 'test-socket-id',
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should set up connection handlers correctly', () => {
      handler.handleConnection(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function));
    });

    it('should send connection confirmation on connect', () => {
      handler.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('response', {
        success: true,
        data: {
          message: 'Connected successfully',
          socketId: 'test-socket-id',
        },
        timestamp: expect.any(Date),
      });
    });

    it('should track connected clients', () => {
      handler.handleConnection(mockSocket);

      expect(handler.getConnectedClientsCount()).toBe(1);
    });
  });

  describe('handleMessage', () => {
    beforeEach(() => {
      handler.handleConnection(mockSocket);
    });

    it('should process message event and emit response', async () => {
      const mockResult = {
        plan: {
          steps: [
            {
              action: 'list_ec2_instances',
              params: { region: 'us-east-1', cloudPlatform: 'aws' },
            },
          ],
        },
      };

      mockAIService.processMessage.mockResolvedValue(mockResult);

      // Get the message handler that was registered
      const messageHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message'
      )?.[1];

      expect(messageHandler).toBeDefined();

      const testMessage: WebSocketMessage = {
        type: 'message',
        content: '查看AWS EC2实例',
        mode: 'ask',
        userId: 'user-123',
      };

      await messageHandler(testMessage);

      expect(mockAIService.processMessage).toHaveBeenCalledWith('查看AWS EC2实例', {
        mode: 'ask',
        userId: 'user-123',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('response', {
        success: true,
        data: mockResult,
        timestamp: expect.any(Date),
      });
    });

    it('should handle empty message content', async () => {
      const messageHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message'
      )?.[1];

      const testMessage: WebSocketMessage = {
        type: 'message',
        content: '',
      };

      await messageHandler(testMessage);

      expect(mockSocket.emit).toHaveBeenCalledWith('response', {
        success: false,
        error: 'Message content cannot be empty',
        timestamp: expect.any(Date),
      });
    });

    it('should handle ping messages', async () => {
      const messageHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message'
      )?.[1];

      const testMessage: WebSocketMessage = {
        type: 'ping',
        content: 'ping',
      };

      await messageHandler(testMessage);

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(Date),
      });
    });

    it('should handle AI service errors gracefully', async () => {
      mockAIService.processMessage.mockRejectedValue(new Error('AI service unavailable'));

      const messageHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'message'
      )?.[1];

      const testMessage: WebSocketMessage = {
        type: 'message',
        content: 'test message',
        mode: 'ask',
      };

      await messageHandler(testMessage);

      expect(mockSocket.emit).toHaveBeenCalledWith('response', {
        success: false,
        error: 'AI service unavailable',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('processMessage', () => {
    it('should process dialogue message and return result', async () => {
      const mockResult = {
        plan: {
          steps: [
            {
              action: 'list_ec2_instances',
              params: { region: 'us-east-1', cloudPlatform: 'aws' },
            },
          ],
        },
      };

      mockAIService.processMessage.mockResolvedValue(mockResult);

      const result = await handler.processMessage({
        type: 'message',
        content: '查看AWS EC2',
        mode: 'ask',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('plan');
    });

    it('should use default mode when not provided', async () => {
      mockAIService.processMessage.mockResolvedValue({ plan: { steps: [] } });

      await handler.processMessage({
        type: 'message',
        content: 'test',
      });

      expect(mockAIService.processMessage).toHaveBeenCalledWith('test', {
        mode: 'ask',
        userId: undefined,
      });
    });

    it('should handle errors from AI service', async () => {
      mockAIService.processMessage.mockRejectedValue(new Error('Processing failed'));

      const result = await handler.processMessage({
        type: 'message',
        content: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('disconnectAllClients', () => {
    it('should disconnect all connected clients', () => {
      handler.handleConnection(mockSocket);

      expect(handler.getConnectedClientsCount()).toBe(1);

      handler.disconnectAllClients();

      expect(handler.getConnectedClientsCount()).toBe(0);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('getConnectedClientsCount', () => {
    it('should return correct count of connected clients', () => {
      expect(handler.getConnectedClientsCount()).toBe(0);

      handler.handleConnection(mockSocket);
      expect(handler.getConnectedClientsCount()).toBe(1);

      const anotherSocket = {
        ...mockSocket,
        id: 'another-socket-id',
        on: jest.fn(),
        emit: jest.fn(),
      };
      handler.handleConnection(anotherSocket);
      expect(handler.getConnectedClientsCount()).toBe(2);
    });
  });
});
