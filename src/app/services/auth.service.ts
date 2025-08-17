import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthResponse } from '@supabase/supabase-js';
import { Router } from '@angular/router';

export interface AuthResult {
  data: any;
  error: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  public isLoading: boolean = false;
  public errorMessage: string | null = null;
  private authStateSub: any;
  constructor(private router: Router) {

    this.supabase = createClient(
      'https://cixdigfxjvranfleyamm.supabase.co', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGRpZ2Z4anZyYW5mbGV5YW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDkyNzAsImV4cCI6MjA3MDc4NTI3MH0.ZgbRo8kxPZzhJe0BEw56seYrUlf3UiylCkeRPzdGWEQ'
    );
    
  }
  
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        return { data: null, error: { message: error.message } };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
  async signInWithGoogle(): Promise<{ error: any }> {
  const { error } = await this.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/login-success'
    }
  });
  return { error };
}

async signUp(email: string, password: string, name: string) {
  try {
    // 1. Create auth user first
    const { data: { user }, error: authError } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name } // Store in auth.user_metadata
      }
    });

    if (authError) throw authError;
    if (!user) throw new Error('User creation failed');

    // 2. Get fresh session (critical for RLS)
    const { data: { session }, error: sessionError } = 
      await this.supabase.auth.refreshSession();
    
    if (sessionError) throw sessionError;

    // 3. Create profile record
    const { error: profileError } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    return { user, session };
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}
async getCurrentUser() {
  // Use getSession() instead of getUser() for better reliability
  const { data, error } = await this.supabase.auth.getSession();
  
  return {
    data: {
      user: data?.session?.user || null
    },
    error
  };
}
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (!error) {
      this.router.navigate(['/login']);
    }
    return error;
  }

  // Removed duplicate getCurrentUser implementation; the async getCurrentUser() above (which uses getSession) is kept.
  isAuthenticated() {
    return this.supabase.auth.getSession();
  }
}