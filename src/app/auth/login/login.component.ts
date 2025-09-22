import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent {
  loginForm: FormGroup;
  passwordVisible = false;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  async signInWithGoogle() {
  this.isLoading = true;
  this.errorMessage = null;
  
  try {
    await this.authService.signOut();
    
    const { error } = await this.authService.signInWithGoogle();
    
    if (error) {
      throw error;
    }
    
    setTimeout(() => {
      this.isLoading = false;
    }, 10000); // 10 second timeout as fallback
  } catch (error: any) {
    this.isLoading = false;
    this.errorMessage = error.message || 'Google sign-in failed';
    console.error('Google sign-in error:', error);
  }
}
  async onSubmit() {
    if (this.loginForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const { email, password } = this.loginForm.value;
      const result = await this.authService.signIn(email, password);

      if (result.error) {
        this.handleLoginError(result.error);
      } else {

        this.router.navigate(['/login-success']);
      }
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  private handleLoginError(error: any) {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please check your email and confirm your account',
      'Too many requests': 'Too many login attempts. Please try again later.'
    };
    
    this.errorMessage = errorMap[error.message] || 'Login failed. Please try again.';
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}