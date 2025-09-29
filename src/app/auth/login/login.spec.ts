import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
// import { By } from '@angular/platform-browser';
import { AuthError } from '@supabase/supabase-js';

// Mock component for routing
@Component({ template: '' })
class DummyComponent {}

/**
 * Creates a mock AuthError object for testing purposes.
 * @param message The desired error message.
 * @returns An object that mimics the structure of a real AuthError.
 */
const createMockAuthError = (message: string): AuthError => {
  const error = new Error(message) as AuthError;
  error.name = 'AuthError';
  error.status = 400;
  return error;
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['signIn', 'signInWithGoogle', 'signOut']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'login-success', component: DummyComponent },
          { path: 'signup', component: DummyComponent },
          { path: 'forgot-password', component: DummyComponent }
        ]),
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization and Validation', () => {
    it('should initialize the login form with empty email and password fields', () => {
      expect(component.loginForm.value).toEqual({ email: '', password: '' });
    });

    it('should mark email as invalid if empty or incorrectly formatted', () => {
      const emailControl = component.email;
      expect(emailControl?.valid).toBeFalsy();
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBeTruthy();
      emailControl?.setValue('not-an-email');
      expect(emailControl?.hasError('email')).toBeTruthy();
    });

    it('should mark email as valid if correctly formatted', () => {
      const emailControl = component.email;
      emailControl?.setValue('test@example.com');
      expect(emailControl?.valid).toBeTruthy();
    });

    it('should mark password as invalid if empty or too short', () => {
      const passwordControl = component.password;
      expect(passwordControl?.valid).toBeFalsy();
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBeTruthy();
      passwordControl?.setValue('123');
      expect(passwordControl?.hasError('minlength')).toBeTruthy();
    });

    it('should mark password as valid if it meets length requirements', () => {
      const passwordControl = component.password;
      passwordControl?.setValue('password123');
      expect(passwordControl?.valid).toBeTruthy();
    });
  });

  describe('Email/Password Submission', () => {
    beforeEach(() => {
      component.email?.setValue('test@example.com');
      component.password?.setValue('password123');
      fixture.detectChanges();
    });

    it('should call authService.signIn and navigate on successful login', fakeAsync(() => {
      authService.signIn.and.returnValue(Promise.resolve({ data: {}, error: null }));
      const routerSpy = spyOn(router, 'navigate');
      component.onSubmit();
      tick();
      fixture.detectChanges();
      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(routerSpy).toHaveBeenCalledWith(['/login-success']);
      expect(component.isLoading).toBeFalsy();
      expect(component.errorMessage).toBeNull();
    }));

    it('should display a mapped error message for "Invalid login credentials"', fakeAsync(() => {
      const apiError = createMockAuthError('Invalid login credentials');
      authService.signIn.and.returnValue(Promise.resolve({ data: {}, error: apiError }));
      const routerSpy = spyOn(router, 'navigate');
      component.onSubmit();
      tick();
      fixture.detectChanges();
      expect(component.errorMessage).toBe('Invalid email or password');
      expect(routerSpy).not.toHaveBeenCalled();
      expect(component.isLoading).toBeFalsy();
    }));

    it('should display a generic error message for unmapped errors', fakeAsync(() => {
      const apiError = createMockAuthError('Some other error');
      authService.signIn.and.returnValue(Promise.resolve({ data: {}, error: apiError }));
      component.onSubmit();
      tick();
      fixture.detectChanges();
      expect(component.errorMessage).toBe('Login failed. Please try again.');
      expect(component.isLoading).toBeFalsy();
    }));

    it('should handle unexpected exceptions during submission', fakeAsync(() => {
      authService.signIn.and.returnValue(Promise.reject('Unexpected failure'));
      component.onSubmit();
      tick();
      fixture.detectChanges();
      expect(component.errorMessage).toBe('An unexpected error occurred. Please try again.');
      expect(component.isLoading).toBeFalsy();
    }));

    it('should not call authService.signIn if form is invalid', () => {
      component.email?.setValue('invalid-email');
      fixture.detectChanges();
      component.onSubmit();
      expect(authService.signIn).not.toHaveBeenCalled();
    });
  });

  describe('Google Sign-In', () => {
    it('should call signOut and signInWithGoogle on button click', fakeAsync(() => {
      authService.signOut.and.returnValue(Promise.resolve(createMockAuthError as any));
      authService.signInWithGoogle.and.returnValue(Promise.resolve({ data: {}, error: null }));
      component.signInWithGoogle();
      tick();
      expect(authService.signOut).toHaveBeenCalled();
      expect(authService.signInWithGoogle).toHaveBeenCalled();
      expect(component.errorMessage).toBeNull();
    }));

    it('should set error message if signInWithGoogle fails', fakeAsync(() => {
      authService.signOut.and.returnValue(Promise.resolve(createMockAuthError as any));
      const googleError = createMockAuthError('Google sign-in failed');
      authService.signInWithGoogle.and.returnValue(Promise.resolve({ data: {}, error: googleError }));
      component.signInWithGoogle();
      tick();
      expect(component.errorMessage).toBe('Google sign-in failed');
      expect(component.isLoading).toBeFalsy();
    }));

    it('should handle unexpected errors during Google sign-in', fakeAsync(() => {
      authService.signOut.and.returnValue(Promise.resolve(createMockAuthError as any));
      const rejectionError = { message: 'Network error' };
      authService.signInWithGoogle.and.returnValue(Promise.reject(rejectionError));
      component.signInWithGoogle();
      tick();
      expect(component.errorMessage).toBe('Network error');
      expect(component.isLoading).toBeFalsy();
    }));
  });
});
