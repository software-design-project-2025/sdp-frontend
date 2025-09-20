import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, AuthResponse } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment.prod';
import { BehaviorSubject } from 'rxjs';

export interface AuthResult {
  data: any;
  error: any;
}

export interface profiles {
  name?: string;
  email?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  public isLoading: boolean = false;
  public errorMessage: string | null = null;
  private authStateSub: any;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {

    this.supabase = createClient(
      environment.supabaseUrl, 
      environment.supabaseKey
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

async getSession() {
  try {
    return await this.supabase.auth.getSession();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Navigator LockManager')) {
      console.warn('Lock API unavailable, falling back to direct auth');
      return await this.supabase.auth.getSession();
    }
    throw error;
  }
}
  async getCurrentUser() {
    const { data, error } = await this.supabase.auth.getSession();
    const user = data?.session?.user || null;
    this.currentUserSubject.next(user);
    return { data: { user }, error };
  }

  async getUserById(userId: string): Promise<{ data: profiles | null; error: any }> {
    try {
      //console.log('🔍 Querying profiles for ID:', userId);
      
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      //console.log(data);

      return { data, error: null };
      
    } catch (error) {
      console.error('Error in getUserById:', error);
      return { data: null, error };
    }
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (!error) {
      this.router.navigate(['/login']);
    }
    return error;
  }
  isAuthenticated() {
    return this.supabase.auth.getSession();
  }
}