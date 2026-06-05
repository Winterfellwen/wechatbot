import { z } from 'zod';

export const ResourceSchema = z.object({
  id: z.number(),
  userId: z.number().optional(),
  credentialId: z.number().optional(),
  cloudProvider: z.string(),
  resourceType: z.string(),
  name: z.string(),
  providerId: z.string().optional(),
  status: z.string(),
  region: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateResourceSchema = z.object({
  cloudProvider: z.string().min(1),
  resourceType: z.string().min(1),
  name: z.string().min(1),
  status: z.string().optional().default('pending'),
  region: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RegisterUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type ResourceType = z.infer<typeof ResourceSchema>;
export type CreateResourceType = z.infer<typeof CreateResourceSchema>;
export type UserType = z.infer<typeof UserSchema>;
export type RegisterUserType = z.infer<typeof RegisterUserSchema>;
export type LoginUserType = z.infer<typeof LoginUserSchema>;
