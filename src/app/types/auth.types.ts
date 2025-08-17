// src/app/types/auth.types.ts
import { AuthError, User, Session } from '@supabase/supabase-js';

export type AuthResponse = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
};