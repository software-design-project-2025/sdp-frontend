// src/app/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  // Google OAuth Sign In (FIXED)
  async signInWithGoogle() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = 'Redirecting to Google...';

    try {
      const result = await this.authService.signInWithGoogle();
      
      if (result.error) {
        throw result.error;
      }

      // The actual redirection is handled by Supabase OAuth flow
      console.log('Google OAuth flow initiated successfully');

    } catch (error: any) {
      console.error('Google sign in error:', error);
      this.errorMessage = this.getErrorMessage(error) || 'Failed to sign in with Google. Please try again.';
      this.isLoading = false;
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      const result = await this.authService.signIn(email, password);
      
      if (result.error) {
        this.handleLoginError(result.error);
        return;
      }

      // Success - auth state listener will handle redirect
      this.successMessage = 'Login successful! Redirecting...';

    } catch (error: any) {
      this.handleLoginError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleLoginError(error: any) {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email before logging in',
      'Invalid email': 'Please enter a valid email address'
    };

    this.errorMessage = errorMap[error.message] || 'Login failed. Please try again.';
  }

  private getErrorMessage(error: any): string {
    const errorMap: Record<string, string> = {
      'User already registered': 'This email is already registered',
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email first'
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.message?.includes(key)) {
        return message;
      }
    }

    return error.message || 'An error occurred';
  }
}