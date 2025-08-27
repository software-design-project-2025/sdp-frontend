import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http'; 
import { provideHttpClientToStandalone } from '../../utils/http-provider';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  // REMOVE providers: [HttpClient] from here
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  errorMessage = '';
  successMessage = ''; // Add this missing property

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // Add this missing dependency
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
    this.cdr.detectChanges();
  }

  async signInWithGoogle() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Now cdr exists
    
    try {
      console.log('Starting Google sign in...');
      const result = await this.authService.signInWithGoogle();
      
      if (result.error) {
        throw result.error;
      }
      
      console.log('Google sign in successful:', result.data);
      this.successMessage = 'Redirecting to Google...'; // Now successMessage exists
      this.cdr.detectChanges();
      
    } catch (error: any) {
      console.error('Google sign in error:', error);
      this.errorMessage = error.message || 'Failed to sign in with Google';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = ''; // Now successMessage exists
    this.cdr.detectChanges(); // Now cdr exists

    try {
      const { email, password } = this.loginForm.value;
      const result = await this.authService.signIn(email, password);
      
      if (result.error) {
        this.handleLoginError(result.error);
        return;
      }

      // Success - redirect to dashboard or home
      console.log('✅ Login success, navigating...');
      this.router.navigate(['/login-success']);
    } catch (error: any) {
      this.handleLoginError(error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // Now cdr exists
    }
  }

  private handleLoginError(error: any) {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please verify your email before logging in',
      'Invalid email': 'Please enter a valid email address'
    };

    this.errorMessage = errorMap[error.message] || 'Login failed. Please try again.';
    this.isLoading = false;
    this.cdr.detectChanges(); // Now cdr exists
  }
}