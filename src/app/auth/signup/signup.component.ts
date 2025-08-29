// src/app/auth/signup/signup.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  isLoading = false;
  passwordVisible = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, Validators.requiredTrue]
    });
  }
  // Add this method to your SignupComponent class
async signInWithGoogle() {
  if (this.isLoading) return;
  this.isLoading = true;
  this.errorMessage = '';
  
  try {
    console.log('Starting Google sign in...');
    const result = await this.authService.signInWithGoogle();
    
    if (result.error) {
      throw result.error;
    }
    
    console.log('Google sign in successful:', result.data);
    this.successMessage = 'Redirecting to Google...';
    
  } catch (error: any) {
    console.error('Google sign in error:', error);
    this.errorMessage = error.message || 'Failed to sign in with Google';
  } finally {
    this.isLoading = false;
  }
}

  async onSubmit() {
  if (this.signupForm.invalid || this.isLoading) return;

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';

  try {
    const { email, password, name } = this.signupForm.value;
    
    console.log('Starting signup process...');

    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await (this.authService as any).supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name
        },
        emailRedirectTo: `${window.location.origin}/auth/callback` // Important for email confirmation
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      throw authError;
    }

    console.log('Supabase signup successful:', authData);

    // 2. Create user in your Express backend WITHOUT token (since user isn't verified yet)
    if (authData.user) {
      console.log('Creating user in backend...');

      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supabaseUserId: authData.user.id,
          email: authData.user.email,
          displayName: name
        })
      });

      const result = await response.json();
      console.log('Backend response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user in database');
      }

      this.successMessage = 'Account created successfully! Please check your email to verify your account. You can login after verification.';
      this.signupForm.reset();

      // Redirect to login with message
      setTimeout(() => {
        this.router.navigate(['/login'], {
          state: { 
            message: this.successMessage,
            email: email 
          }
        });
      }, 3000);
    }

  } catch (error: any) {
    console.error('Signup failed:', error);
    this.errorMessage = this.getErrorMessage(error);
  } finally {
    this.isLoading = false;
  }
}

  private getErrorMessage(error: any): string {
    const errorMap: Record<string, string> = {
      'Database error saving new user': 'Database error. Please try again.',
      'For security purposes, you can only request this after': 'Please wait a minute before trying again.',
      'new row violates row-level security policy': 'Server configuration error. Please contact support.',
      'User already registered': 'This email is already registered.',
      'Invalid email': 'Please enter a valid email address.',
      'Weak password': 'Password must be at least 8 characters long.'
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.message?.includes(key)) {
        return message;
      }
    }

    return error.message || 'Signup failed. Please try again.';
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }
}