// src/app/test-utils/auth-mocks.ts
import { User } from '@supabase/supabase-js';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123456789',
  aud: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockUserResponse = (overrides?: Partial<User>) => ({
  data: { user: createMockUser(overrides) },
  error: null
});