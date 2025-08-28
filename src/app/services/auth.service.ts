// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient, User, Session, AuthResponse, AuthError, UserResponse } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private router = inject(Router);
  private apiUrl = 'http://localhost:3001/api';

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.setupAuthStateListener();
  }

  get supabaseClient(): SupabaseClient {
    return this.supabase;
  }

  async handleAuthCallback(): Promise<any> {
    return await this.supabase.auth.getSession();
  }

  private setupAuthStateListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN') {
        this.router.navigate(['/login-success']);
      } else if (event === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });
  }

  async signInWithGoogle(): Promise<{ data: any; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      return { data, error };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { data: null, error };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, displayName: string): Promise<AuthResponse> {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    return await this.supabase.auth.signOut();
  }


  async getCurrentUser(): Promise<UserResponse> {
    return await this.supabase.auth.getUser();
  }

  async getSession(): Promise<any> {
    return await this.supabase.auth.getSession();
  }

  
  private async createBackendUser(userId: string, email: string, displayName: string) {
    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUserId: userId,
          email: email,
          displayName: displayName
        })
      });

      if (!response.ok) {
        console.warn('Backend user creation failed');
      }
    } catch (error) {
      console.warn('Backend user creation error:', error);
    }
  }
}