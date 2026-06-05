import {
  EC2Client,
  DescribeInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  Instance,
} from '@aws-sdk/client-ec2';

export interface AWSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface EC2Instance {
  id: string;
  name: string;
  status: string;
  type: string;
  region: string;
  privateIp?: string;
  publicIp?: string;
}

export class EC2Adapter {
  private client: EC2Client;

  constructor(config: AWSConfig) {
    this.client = new EC2Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
    });
  }

  async listInstances(options?: { region?: string }): Promise<EC2Instance[]> {
    const command = new DescribeInstancesCommand({});
    const response = await this.client.send(command);

    const instances: EC2Instance[] = [];

    for (const reservation of response.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        instances.push(this.mapInstance(instance));
      }
    }

    return instances;
  }

  async stopInstance(instanceId: string): Promise<{ success: boolean; status: string }> {
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId],
    });

    await this.client.send(command);

    return {
      success: true,
      status: 'stopping',
    };
  }

  async startInstance(instanceId: string): Promise<{ success: boolean; status: string }> {
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId],
    });

    await this.client.send(command);

    return {
      success: true,
      status: 'pending',
    };
  }

  private mapInstance(instance: Instance): EC2Instance {
    const nameTag = instance.Tags?.find((t: { Key?: string; Value?: string }) => t.Key === 'Name');

    return {
      id: instance.InstanceId || '',
      name: nameTag?.Value || 'unnamed',
      status: instance.State?.Name || 'unknown',
      type: instance.InstanceType || 'unknown',
      region: this.client.config.region || 'unknown',
      privateIp: instance.PrivateIpAddress,
      publicIp: instance.PublicIpAddress,
    };
  }
}
