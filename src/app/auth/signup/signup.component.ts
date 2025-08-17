import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, Validators.requiredTrue]
    });
  }

  togglePasswordVisibility() {
    console.log('Toggle password visibility clicked. Current state:', this.passwordVisible);
    this.passwordVisible = !this.passwordVisible;
    this.cdr.detectChanges();
    console.log('New password visibility state:', this.passwordVisible);
  }

  async signInWithGoogle() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      console.log('Starting Google sign in...');
      const result: any = await this.authService.signInWithGoogle();
      const error = result?.error;
      const data = result?.data;
      
      if (error) {
        throw error;
      }

      console.log('Google sign in successful:', data);
      this.successMessage = 'Redirecting to Google...';
      this.cdr.detectChanges();

      // Note: After Google OAuth, user will be redirected back to your app
      // The actual navigation will be handled by the OAuth callback
      
    } catch (error: any) {
      console.error('Google sign in error:', error);
      this.errorMessage = error.message || 'Failed to sign in with Google';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private getErrorMessage(error: any): string {
  const errorMap: Record<string, string> = {
    '42501': 'Account created! Please check your email to verify before logging in.',
    '23505': 'This email is already registered',
    'User already registered': 'Email already in use',
    'Invalid email': 'Please enter a valid email address',
    'Weak password': 'Password must be at least 8 characters'
  };

  // Special case for RLS errors after successful signup
  if (String(error?.code) === '42501' && this.signupForm.valid) {
    return errorMap['42501'];
  }

  const codeKey = String(error?.code);
  const messageKey = String(error?.message);

  return errorMap[codeKey] ||
         errorMap[messageKey] ||
         'Account created! Please check your email to verify.';
}

async onSubmit() {
  if (this.signupForm.invalid || this.isLoading) return;

  this.isLoading = true;
  this.errorMessage = '';
  this.successMessage = '';
  this.cdr.detectChanges();

  try {
    const { email, password, name } = this.signupForm.value;
    await this.authService.signUp(email, password, name);

    // Success handling
    this.successMessage = 'Account created! Please check your email to verify.';
    this.signupForm.reset();
    this.cdr.detectChanges();

    // Redirect after delay
    setTimeout(() => {
      this.router.navigate(['/login'], {
        state: { 
          message: this.successMessage,
          email: email // Optional: pass email for display
        }
      });
    }, 3000); // 3 second delay to show message

  } catch (error: any) {
    this.errorMessage = this.getErrorMessage(error);
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}