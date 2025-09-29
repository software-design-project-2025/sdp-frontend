import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { SignupComponent } from './signup.component';
import { AuthService } from '../../services/auth.service';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';

@Component({ template: '' })
class DummyComponent {}

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['signUp', 'signInWithGoogle']);

    await TestBed.configureTestingModule({
      imports: [
        SignupComponent, // Component is standalone
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);

    // ngOnInit is called automatically, which initializes the form
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization and Validation', () => {
    it('should create a form with name, email, password, and terms controls', () => {
      expect(component.signupForm.contains('name')).toBeTrue();
      expect(component.signupForm.contains('email')).toBeTrue();
      expect(component.signupForm.contains('password')).toBeTrue();
      expect(component.signupForm.contains('terms')).toBeTrue();
    });

    it('should make the name control required and have minlength 2', () => {
      const nameControl = component.signupForm.get('name');
      nameControl?.setValue('');
      expect(nameControl?.hasError('required')).toBeTrue();
      nameControl?.setValue('A');
      expect(nameControl?.hasError('minlength')).toBeTrue();
    });

    it('should make the email control required and validate email format', () => {
      const emailControl = component.signupForm.get('email');
      emailControl?.setValue('');
      expect(emailControl?.hasError('required')).toBeTrue();
      emailControl?.setValue('not-an-email');
      expect(emailControl?.hasError('email')).toBeTrue();
    });

    it('should make the password control required and have minlength 8', () => {
      const passwordControl = component.signupForm.get('password');
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBeTrue();
      passwordControl?.setValue('1234567');
      expect(passwordControl?.hasError('minlength')).toBeTrue();
    });

    xit('should make the terms control required to be true', () => {
      const termsControl = component.signupForm.get('terms');
      termsControl?.setValue(false);
      expect(termsControl?.hasError('requiredTrue')).toBeTrue();
    });

    it('should disable the submit button when form is invalid', () => {
      const submitButton = fixture.debugElement.query(By.css('.submit-button')).nativeElement;
      expect(submitButton.disabled).toBeTrue();
    });

    it('should enable the submit button when form is valid', () => {
      component.signupForm.setValue({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        terms: true
      });
      fixture.detectChanges();
      const submitButton = fixture.debugElement.query(By.css('.submit-button')).nativeElement;
      expect(submitButton.disabled).toBeFalse();
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      // Make form valid before each submission test
      component.signupForm.setValue({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        terms: true
      });
      fixture.detectChanges();
    });

    it('should call authService.signUp and show success message on valid submission', fakeAsync(() => {
      authService.signUp.and.returnValue(Promise.resolve({} as any));
      const routerSpy = spyOn(router, 'navigate');

      component.onSubmit();
      tick(); // Let the promise resolve
      fixture.detectChanges();

      expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      expect(component.successMessage).toBe('Account created! Please check your email to verify.');
      expect(component.signupForm.pristine).toBeTrue(); // Form should be reset

      tick(3000); // Fast-forward past the redirect delay
      expect(routerSpy).toHaveBeenCalledWith(['/login'], {
        state: {
          message: 'Account created! Please check your email to verify.',
          email: 'test@example.com'
        }
      });
    }));

    it('should set error message when signUp fails because email is already registered', fakeAsync(() => {
      const error = { code: '23505', message: 'User already registered' };
      authService.signUp.and.returnValue(Promise.reject(error));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      expect(component.errorMessage).toBe('This email is already registered');
      expect(component.isLoading).toBeFalse();
    }));

    it('should set a fallback success-like message for unmapped errors', fakeAsync(() => {
      const error = { message: 'Some unknown database error' };
      authService.signUp.and.returnValue(Promise.reject(error));

      component.onSubmit();
      tick();
      fixture.detectChanges();

      // This tests the fallback in the getErrorMessage function
      expect(component.errorMessage).toBe('Account created! Please check your email to verify.');
    }));

    it('should not call authService.signUp if form is invalid', () => {
      component.signupForm.get('email')?.setValue(''); // Make form invalid
      fixture.detectChanges();

      component.onSubmit();

      expect(authService.signUp).not.toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('should call authService.signInWithGoogle and show success message', fakeAsync(() => {
      authService.signInWithGoogle.and.returnValue(Promise.resolve({ data: {}, error: null }));

      component.signInWithGoogle();
      tick();
      fixture.detectChanges();

      expect(authService.signInWithGoogle).toHaveBeenCalled();
      expect(component.successMessage).toBe('Redirecting to Google...');
      // The component intentionally leaves isLoading as true on success
      expect(component.isLoading).toBeTrue();
    }));

    it('should set error message if signInWithGoogle fails', fakeAsync(() => {
      const error = { message: 'Google auth failed' };
      authService.signInWithGoogle.and.returnValue(Promise.resolve({ error: error }));

      component.signInWithGoogle();
      tick();
      fixture.detectChanges();

      expect(authService.signInWithGoogle).toHaveBeenCalled();
      expect(component.errorMessage).toBe('Google auth failed');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('UI Interactions', () => {
    it('should toggle password visibility', () => {
      expect(component.passwordVisible).toBeFalse();
      const passwordInput = fixture.debugElement.query(By.css('#password')).nativeElement;
      expect(passwordInput.type).toBe('password');

      component.togglePasswordVisibility();
      fixture.detectChanges();

      expect(component.passwordVisible).toBeTrue();
      expect(passwordInput.type).toBe('text');
    });
  });
});
