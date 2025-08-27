// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public supabase: SupabaseClient;
  private apiUrl = 'http://localhost:3001/api'; // Your Express server

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Sign up with Supabase + register in your backend
  async signUp(email: string, password: string, displayName: string): Promise<any> {
    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (authError) throw authError;

      // 2. Create user in your Express backend
      if (authData.user) {
        const response = await fetch(`${this.apiUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supabaseUserId: authData.user.id,
            email: authData.user.email,
            displayName: displayName
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user in database');
        }

        return await response.json();
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<any> {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  // Google sign in
  async signInWithGoogle(): Promise<any> {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  // Sign out
  async signOut(): Promise<any> {
    return this.supabase.auth.signOut();
  }

  // Get current user from Supabase - CORRECTED
  async getCurrentUser(): Promise<{ data: { user: User | null }; error: any }> {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      return { data: { user: data.user }, error };
    } catch (error: any) {
      return { data: { user: null }, error };
    }
  }

  // Get current session - CORRECTED
  async getSession(): Promise<{ data: { session: Session | null }; error: any }> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      return { data: { session: data.session }, error };
    } catch (error: any) {
      return { data: { session: null }, error };
    }
  }

  // 🔐 PROTECTED API CALLS

  // Get user profile from your Express API
  async getUserProfile(): Promise<any> {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${this.apiUrl}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return await response.json();

    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(updates: { displayName?: string; email?: string }): Promise<any> {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${this.apiUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return await response.json();

    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  // Get current user data from your API
  async getCurrentUserData(): Promise<any> {
    try {
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${this.apiUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      return await response.json();

    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }

  // Helper method to get JWT token
  async getJwtToken(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }
}