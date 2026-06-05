import { VaultService } from '../vault/vault.service';
import { parseIntent, IntentResult } from './intent-parser';

export interface ProcessMessageOptions {
  mode: 'plan' | 'ask' | 'auto';
  userId?: string;
}

export interface PlanStep {
  action: string;
  params: Record<string, any>;
}

export interface ProcessResult {
  plan?: { steps: PlanStep[] };
  execution?: any;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export class AIService {
  private vault: VaultService;

  constructor(vault: VaultService) {
    this.vault = vault;
  }

  async processMessage(message: string, options: ProcessMessageOptions): Promise<ProcessResult> {
    const intent = parseIntent(message);

    if (intent.action === 'query') {
      return this.handleQuery(intent, options);
    } else if (['stop', 'start', 'delete', 'restart'].includes(intent.action)) {
      return this.handleOperation(intent, options);
    }

    throw new Error('Unknown action type');
  }

  private async handleQuery(intent: IntentResult, options: ProcessMessageOptions): Promise<ProcessResult> {
    const plan: PlanStep[] = [];

    if (intent.resourceType === 'ec2') {
      plan.push({
        action: 'list_ec2_instances',
        params: {
          region: intent.region || 'us-east-1',
          cloudPlatform: intent.cloudPlatform,
        },
      });
    } else if (intent.resourceType === 'vpc') {
      plan.push({
        action: 'list_vpcs',
        params: {
          region: intent.region || 'us-east-1',
          cloudPlatform: intent.cloudPlatform,
        },
      });
    } else if (intent.resourceType === 's3') {
      plan.push({
        action: 'list_s3_buckets',
        params: {
          cloudPlatform: intent.cloudPlatform,
        },
      });
    } else if (intent.resourceType === 'rds') {
      plan.push({
        action: 'list_rds_instances',
        params: {
          region: intent.region || 'us-east-1',
          cloudPlatform: intent.cloudPlatform,
        },
      });
    } else {
      plan.push({
        action: 'list_all_resources',
        params: {
          region: intent.region,
          cloudPlatform: intent.cloudPlatform,
        },
      });
    }

    if (options.mode === 'plan') {
      return { plan: { steps: plan } };
    }

    // For 'ask' and 'auto' modes, get temp credential and execute
    const tempCred = await this.vault.getTemporaryCredential(
      options.userId || 'anonymous',
      'cred-placeholder'
    );

    return {
      plan: { steps: plan },
      execution: {
        token: tempCred.token,
        status: 'ready',
      },
    };
  }

  private async handleOperation(intent: IntentResult, options: ProcessMessageOptions): Promise<ProcessResult> {
    const plan: PlanStep[] = [
      {
        action: `${intent.action}_resource`,
        params: {
          resourceId: intent.resourceId,
          resourceType: intent.resourceType,
          region: intent.region,
          cloudPlatform: intent.cloudPlatform,
        },
      },
    ];

    if (options.mode === 'plan') {
      return { plan: { steps: plan } };
    }

    if (options.mode === 'ask') {
      return {
        plan: { steps: plan },
        requiresConfirmation: true,
        confirmationMessage: `确认${intent.action}资源 ${intent.resourceId || intent.resourceType || 'unknown'}？`,
      };
    }

    // Auto mode - execute directly
    const tempCred = await this.vault.getTemporaryCredential(
      options.userId || 'anonymous',
      'cred-placeholder'
    );

    return {
      plan: { steps: plan },
      execution: {
        token: tempCred.token,
        status: 'executing',
      },
    };
  }
}
