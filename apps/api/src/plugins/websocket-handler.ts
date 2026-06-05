import { Socket } from 'socket.io';
import { AIService, ProcessMessageOptions } from '../services/ai/ai.service';
import { VaultService } from '../services/vault/vault.service';

export interface WebSocketMessage {
  type: 'message' | 'ping' | 'disconnect';
  content: string;
  mode?: 'plan' | 'ask' | 'auto';
  userId?: string;
}

export interface WebSocketResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export class WebSocketHandler {
  private aiService: AIService;
  private vaultService: VaultService;
  private connectedClients: Map<string, { socket: Socket; userId?: string; lastActivity: Date }> = new Map();

  constructor(aiService: AIService, vaultService: VaultService) {
    this.aiService = aiService;
    this.vaultService = vaultService;
  }

  handleConnection(socket: Socket): void {
    console.log('Client connected:', socket.id);

    // Track client connection
    this.connectedClients.set(socket.id, {
      socket,
      lastActivity: new Date(),
    });

    // Handle incoming messages
    socket.on('message', async (data: WebSocketMessage) => {
      try {
        await this.handleMessage(socket, data);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(socket, error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      this.connectedClients.delete(socket.id);
    });

    // Handle ping/pong for keepalive
    socket.on('ping', () => {
      this.updateClientActivity(socket.id);
      socket.emit('pong', { timestamp: new Date() });
    });

    // Send connection confirmation
    this.sendResponse(socket, {
      success: true,
      data: {
        message: 'Connected successfully',
        socketId: socket.id,
      },
      timestamp: new Date(),
    });
  }

  private async handleMessage(socket: Socket, data: WebSocketMessage): Promise<void> {
    this.updateClientActivity(socket.id);

    if (data.type === 'ping') {
      socket.emit('pong', { timestamp: new Date() });
      return;
    }

    if (data.type === 'disconnect') {
      socket.disconnect();
      return;
    }

    if (!data.content || data.content.trim() === '') {
      this.sendError(socket, new Error('Message content cannot be empty'));
      return;
    }

    const result = await this.processMessage(data);
    this.sendResponse(socket, result);
  }

  async processMessage(data: WebSocketMessage): Promise<WebSocketResponse> {
    const { content, mode, userId } = data;

    const options: ProcessMessageOptions = {
      mode: mode || 'ask',
      userId: userId,
    };

    try {
      const result = await this.aiService.processMessage(content, options);

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  private sendResponse(socket: Socket, response: WebSocketResponse): void {
    socket.emit('response', response);
  }

  private sendError(socket: Socket, error: Error): void {
    this.sendResponse(socket, {
      success: false,
      error: error.message,
      timestamp: new Date(),
    });
  }

  private updateClientActivity(socketId: string): void {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  disconnectAllClients(): void {
    this.connectedClients.forEach((client) => {
      client.socket.disconnect();
    });
    this.connectedClients.clear();
  }
}
