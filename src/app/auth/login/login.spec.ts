import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

// Dummy components for testing routerLinks
@Component({ template: '' })
class DummyLoginSuccessComponent {}
@Component({ template: '' })
class DummySignupComponent {}
@Component({ template: '' })
class DummyForgotComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    // Create spies for the injected services
    mockAuthService = jasmine.createSpyObj('AuthService', ['signInWithGoogle', 'signOut', 'signIn']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      // Since standalone: false, we declare the component
      declarations: [
        LoginComponent,
        DummyLoginSuccessComponent,
        DummySignupComponent,
        DummyForgotComponent
      ],
      // Import modules required by the component's template
      imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'login-success', component: DummyLoginSuccessComponent },
          { path: 'signup', component: DummySignupComponent },
          { path: 'forgot-password', component: DummyForgotComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter } // Use the spy for Router
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;

    // Trigger initial data binding and form setup from constructor
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Login Form Validation', () => {
    it('should initialize an invalid form with empty fields', () => {
      expect(component.loginForm.valid).toBeFalse();
      expect(component.email?.value).toBe('');
      expect(component.password?.value).toBe('');
    });

    it('should validate email field as required and for correct format', () => {
      component.email?.setValue('notanemail');
      expect(component.email?.hasError('required')).toBeFalse();
      expect(component.email?.hasError('email')).toBeTrue();

      component.email?.setValue('test@example.com');
      expect(component.email?.valid).toBeTrue();
    });

    it('should validate password field as required and for minLength(6)', () => {
      component.password?.setValue('123');
      expect(component.password?.hasError('required')).toBeFalse();
      expect(component.password?.hasError('minLength')).toBeTrue();

      component.password?.setValue('123456');
      expect(component.password?.valid).toBeTrue();
    });

    it('should disable the submit button when the form is invalid', () => {
      const submitButton = nativeElement.querySelector('.submit-button') as HTMLButtonElement;
      expect(submitButton.disabled).toBeTrue();

      // Fill only email
      component.email?.setValue('test@example.com');
      fixture.detectChanges();
      expect(submitButton.disabled).toBeTrue();
    });

    it('should enable the submit button when the form is valid', () => {
      component.email?.setValue('test@example.com');
      component.password?.setValue('password123');
      fixture.detectChanges();

      const submitButton = nativeElement.querySelector('.submit-button') as HTMLButtonElement;
      expect(submitButton.disabled).toBeFalse();
    });
  });

  describe('Email/Password onSubmit()', () => {
    beforeEach(() => {
      component.email?.setValue('test@example.com');
      component.password?.setValue('password123');
      fixture.detectChanges();
    });

    it('should call authService.signIn and navigate on successful login', fakeAsync(() => {
      mockAuthService.signIn.and.returnValue(Promise.resolve({ data: {}, error: null }) as any);

      component.onSubmit();
      expect(component.isLoading).toBeTrue();

      tick(); // Resolve the promise
      fixture.detectChanges();

      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login-success']);
      expect(component.errorMessage).toBeNull();
      expect(component.isLoading).toBeFalse();
    }));

    it('should display a mapped error message on failed login', fakeAsync(() => {
      mockAuthService.signIn.and.returnValue(Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } }) as any);

      component.onSubmit();
      expect(component.isLoading).toBeTrue();

      tick(); // Resolve the promise
      fixture.detectChanges();

      expect(mockAuthService.signIn).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('Invalid email or password');
      expect(component.isLoading).toBeFalse();
    }));

    it('should display a generic error message for unmapped errors', fakeAsync(() => {
      mockAuthService.signIn.and.returnValue(Promise.resolve({ data: null, error: { message: 'Some other error' } }) as any);

      component.onSubmit();
      tick();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Login failed. Please try again.');
    }));

    it('should show loading state on submit button', fakeAsync(() => {
      mockAuthService.signIn.and.returnValue(new Promise(() => {})); // Never resolves

      component.onSubmit();
      fixture.detectChanges();

      const submitButton = nativeElement.querySelector('.submit-button') as HTMLButtonElement;
      expect(submitButton.disabled).toBeTrue();
      expect(nativeElement.querySelector('.loading-dots')).toBeTruthy();

      // Cleanup
      tick();
    }));
  });

  describe('Google Sign-in', () => {
    it('should call authService.signInWithGoogle and set timeout on success', fakeAsync(() => {
      mockAuthService.signOut.and.returnValue(Promise.resolve() as any);
      mockAuthService.signInWithGoogle.and.returnValue(Promise.resolve({ data: {}, error: null }) as any);

      const googleButton = nativeElement.querySelector('.google-signin-button') as HTMLButtonElement;
      googleButton.click();

      expect(component.isLoading).toBeTrue();

      tick(); // Resolve signOut and signInWithGoogle promises

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
      expect(component.isLoading).toBeTrue(); // Still true because of timeout

      tick(10000); // Advance time by 10 seconds

      expect(component.isLoading).toBeFalse();
    }));

    it('should display error message on Google sign-in failure', fakeAsync(() => {
      const googleError = { message: 'Google sign-in failed' };
      mockAuthService.signOut.and.returnValue(Promise.resolve() as any);
      mockAuthService.signInWithGoogle.and.returnValue(Promise.resolve({ data: null, error: googleError }) as any);

      const googleButton = nativeElement.querySelector('.google-signin-button') as HTMLButtonElement;
      googleButton.click();

      expect(component.isLoading).toBeTrue();

      tick(); // Resolve promises
      fixture.detectChanges();

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe(googleError.message);
      expect(nativeElement.querySelector('.error-message')?.textContent).toContain(googleError.message);
    }));
  });

  describe('UI Toggles', () => {
    it('should toggle password visibility and input type', () => {
      const passwordInput = nativeElement.querySelector('#password') as HTMLInputElement;
      const toggleButton = nativeElement.querySelector('.toggle-password') as HTMLButtonElement;

      // Initial state
      expect(component.passwordVisible).toBeFalse();
      expect(passwordInput.type).toBe('password');
      expect(toggleButton.textContent).toContain('👁️');

      // Click to show
      toggleButton.click();
      fixture.detectChanges();

      expect(component.passwordVisible).toBeTrue();
      expect(passwordInput.type).toBe('text');
      expect(toggleButton.textContent).toContain('🙈');

      // Click to hide
      toggleButton.click();
      fixture.detectChanges();

      expect(component.passwordVisible).toBeFalse();
      expect(passwordInput.type).toBe('password');
    });
  });
});
