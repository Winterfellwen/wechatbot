import { CreateResourceSchema, RegisterUserSchema } from '../src/schemas';

describe('Schemas', () => {
  describe('CreateResourceSchema', () => {
    it('should validate a valid resource', () => {
      const validResource = {
        cloudProvider: 'aws',
        resourceType: 'ec2',
        name: 'test-instance',
      };
      const result = CreateResourceSchema.safeParse(validResource);
      expect(result.success).toBe(true);
    });

    it('should reject invalid resource', () => {
      const invalidResource = {
        cloudProvider: '',
        resourceType: 'ec2',
        name: 'test-instance',
      };
      const result = CreateResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });
  });

  describe('RegisterUserSchema', () => {
    it('should validate a valid user registration', () => {
      const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      const result = RegisterUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const invalidUser = {
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      };
      const result = RegisterUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });
});
