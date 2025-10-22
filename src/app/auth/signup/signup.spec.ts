import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ChangeDetectorRef, Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { SignupComponent } from './signup.component';
import { AuthService } from '../../services/auth.service';

// --- MOCK COMPONENTS ---
@Component({ template: '' })
class DummyLoginComponent {}

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    // Create spies for the injected services
    mockAuthService = jasmine.createSpyObj('AuthService', ['signInWithGoogle', 'signUp']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      // Since standalone: true, we import the component itself
      imports: [
        SignupComponent,
        ReactiveFormsModule,
        CommonModule,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyLoginComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        // Provide the mock CDR
        { provide: ChangeDetectorRef, useValue: mockCdr }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;

    // Manually assign the mock CDR to the component instance
    // This is necessary because the component injects its own
    component['cdr'] = mockCdr;

    // Trigger initial data binding (ngOnInit -> initializeForm)
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Signup Form Validation', () => {
    it('should initialize an invalid form with empty fields', () => {
      expect(component.signupForm.valid).toBeFalse();
    });

    it('should validate name field (required, minlength 2)', () => {
      const nameControl = component.signupForm.get('name');
      nameControl?.setValue('');
      expect(nameControl?.hasError('required')).toBeTrue();
      nameControl?.setValue('A');
      expect(nameControl?.hasError('minLength')).toBeTrue();
      nameControl?.setValue('Test User');
      expect(nameControl?.valid).toBeTrue();
    });

    it('should validate email field (required, email)', () => {
      const emailControl = component.signupForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBeTrue();
      emailControl?.setValue('not-an-email');
      expect(emailControl?.hasError('email')).toBeTrue();
      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBeTrue();
    });

    it('should validate password field (required, minlength 8)', () => {
      const passControl = component.signupForm.get('password');
      passControl?.setValue('');
      expect(passControl?.hasError('required')).toBeTrue();
      passControl?.setValue('1234567');
      expect(passControl?.hasError('minLength')).toBeTrue();
      passControl?.setValue('12345678');
      expect(passControl?.valid).toBeTrue();
    });

    it('should validate terms field (requiredTrue)', () => {
      const termsControl = component.signupForm.get('terms');
      expect(termsControl?.value).toBeFalse();
      expect(termsControl?.hasError('requiredTrue')).toBeTrue();
      termsControl?.setValue(true);
      expect(termsControl?.valid).toBeTrue();
    });

    it('should disable submit button when form is invalid', () => {
      const submitButton = nativeElement.querySelector('.submit-button') as HTMLButtonElement;
      expect(submitButton.disabled).toBeTrue();
    });

    it('should enable submit button when form is valid', () => {
      component.signupForm.setValue({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        terms: true
      });
      fixture.detectChanges();

      const submitButton = nativeElement.querySelector('.submit-button') as HTMLButtonElement;
      expect(submitButton.disabled).toBeFalse();
    });
  });

  describe('Email/Password onSubmit()', () => {
    beforeEach(() => {
      // Make the form valid before each test in this block
      component.signupForm.setValue({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        terms: true
      });
    });

    it('should call authService.signUp, show success, and navigate on success', fakeAsync(() => {
      mockAuthService.signUp.and.returnValue(Promise.resolve() as any);

      component.onSubmit();

      expect(component.isLoading).toBeTrue();
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');

      tick(); // Resolve the signUp promise
      fixture.detectChanges();

      expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      expect(component.isLoading).toBeFalse();
      expect(component.successMessage).toBe('Account created! Please check your email to verify.');
      expect(nativeElement.querySelector('.success-message')).toBeTruthy();
      expect(component.signupForm.value.name).toBeNull(); // Form should be reset

      tick(3000); // Advance time for the 3-second redirect

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        state: {
          message: component.successMessage,
          email: 'test@example.com'
        }
      });
    }));

    it('should map and display "Email already in use" error (code 23505)', fakeAsync(() => {
      const error = { code: '23505', message: 'User already registered' };
      mockAuthService.signUp.and.returnValue(Promise.reject(error));

      component.onSubmit();
      tick(); // Resolve the promise rejection
      fixture.detectChanges();

      expect(mockAuthService.signUp).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('This email is already registered');
      expect(component.successMessage).toBe('');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('should map and display "Weak password" error', fakeAsync(() => {
      const error = { message: 'Weak password' };
      mockAuthService.signUp.and.returnValue(Promise.reject(error));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('Password must be at least 8 characters');
    }));

    it('should display the "please verify" message for unmapped errors', fakeAsync(() => {
      const error = { code: '99999', message: 'Something else broke' };
      mockAuthService.signUp.and.returnValue(Promise.reject(error));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      // Per the component's getErrorMessage logic, this is the default
      expect(component.errorMessage).toBe('Account created! Please check your email to verify.');
    }));
  });

  describe('Google Sign-in', () => {
    it('should call authService.signInWithGoogle and show success message', fakeAsync(() => {
      mockAuthService.signInWithGoogle.and.returnValue(Promise.resolve({ data: {}, error: null }) as any);

      const googleButton = nativeElement.querySelector('.google-signin-button') as HTMLButtonElement;
      googleButton.click();

      expect(component.isLoading).toBeTrue();

      tick(); // Resolve the signInWithGoogle promise
      fixture.detectChanges();

      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
      expect(component.successMessage).toBe('Redirecting to Google...');
      // Note: isLoading is not set to false in the success path of this method
      expect(component.isLoading).toBeTrue();
    }));

    it('should handle Google sign-in error and display message', fakeAsync(() => {
      const error = { message: 'Google sign-in failed' };
      mockAuthService.signInWithGoogle.and.returnValue(Promise.reject(error));

      const googleButton = nativeElement.querySelector('.google-signin-button') as HTMLButtonElement;
      googleButton.click();

      expect(component.isLoading).toBeTrue();

      tick(); // Resolve the promise rejection
      fixture.detectChanges();

      expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('Google sign-in failed');
      expect(component.successMessage).toBe('');
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
      expect(mockCdr.detectChanges).toHaveBeenCalled();

      // Click to hide
      toggleButton.click();
      fixture.detectChanges();

      expect(component.passwordVisible).toBeFalse();
      expect(passwordInput.type).toBe('password');
    });
  });
});
