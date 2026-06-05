import { FastifyInstance } from 'fastify';
import { AIService } from '../services/ai/ai.service';
import { VaultService } from '../services/vault/vault.service';

export async function dialogueRoutes(fastify: FastifyInstance) {
  const getAIService = (): AIService => {
    const vault = fastify.vaultService as VaultService;
    return new AIService(vault);
  };

  // Process dialogue message
  fastify.post('/', async (request, reply) => {
    try {
      const { content, mode = 'plan' } = request.body as {
        content: string;
        mode?: 'plan' | 'ask' | 'auto';
      };

      if (!content || content.trim() === '') {
        return reply.status(400).send({
          success: false,
          error: 'Message content cannot be empty',
        });
      }

      const aiService = getAIService();
      const result = await aiService.processMessage(content, {
        mode,
        userId: (request as any).user?.id || 'anonymous',
      });

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
}