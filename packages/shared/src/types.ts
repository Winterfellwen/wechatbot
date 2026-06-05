export interface Resource {
  id: number;
  userId?: number;
  credentialId?: number;
  cloudProvider: string;
  resourceType: string;
  name: string;
  providerId?: string;
  status: string;
  region?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Credential {
  id: number;
  userId: number;
  cloudProvider: string;
  name: string;
  encryptedData: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  resourceId?: number;
  resourceType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oci';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
