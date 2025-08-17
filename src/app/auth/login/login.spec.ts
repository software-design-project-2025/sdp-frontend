import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['signIn']);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        RouterTestingModule.withRoutes([
          { path: 'login-success', component: {} as any }
        ])
      ],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
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

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should validate email field', () => {
    const emailControl = component.loginForm.get('email');
    
    // Test required validation
    expect(emailControl?.hasError('required')).toBeTruthy();
    
    // Test email validation
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    // Test valid email
    emailControl?.setValue('test@example.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should validate password field', () => {
    const passwordControl = component.loginForm.get('password');
    
    // Test required validation
    expect(passwordControl?.hasError('required')).toBeTruthy();
    
    // Test minlength validation
    passwordControl?.setValue('12345');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();
    
    // Test valid password
    passwordControl?.setValue('123456');
    expect(passwordControl?.hasError('minlength')).toBeFalsy();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBeFalsy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTruthy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeFalsy();
  });

  it('should handle successful login', fakeAsync(() => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: '',
      created_at: new Date().toISOString()
    } as User;

    authService.signIn.and.returnValue(Promise.resolve({
      data: {
        user: mockUser,
        session: null
      },
      error: null
    }));

    spyOn(router, 'navigate');
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'validpassword'
    });

    component.onSubmit();
    tick();

    expect(authService.signIn).toHaveBeenCalledWith(
      'test@example.com',
      'validpassword'
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login-success']);
    expect(component.errorMessage).toBeNull();
  }));

  it('should handle login error', fakeAsync(() => {
    authService.signIn.and.returnValue(Promise.resolve({
      data: {
        user: null,
        session: null
      },
      error: {
        message: 'Invalid login credentials'
      }
    }));

    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid email or password');
    expect(component.isLoading).toBeFalsy();
  }));

  it('should handle unknown error', fakeAsync(() => {
    authService.signIn.and.returnValue(Promise.resolve({
      data: {
        user: null,
        session: null
      },
      error: {
        message: 'Some unknown error'
      }
    }));

    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123'
    });

    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Login failed. Please try again.');
  }));

  it('should not submit if form is invalid', () => {
    spyOn(authService, 'signIn');
    
    component.loginForm.setValue({
      email: 'invalid-email',
      password: '123' // too short
    });

    component.onSubmit();

    expect(authService.signIn).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalsy();
  });

  it('should not submit if already loading', fakeAsync(() => {
    spyOn(authService, 'signIn');
    
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'validpassword'
    });

    component.isLoading = true;
    component.onSubmit();
    tick();

    expect(authService.signIn).not.toHaveBeenCalled();
  }));

  it('should handle unexpected errors', fakeAsync(() => {
    authService.signIn.and.returnValue(Promise.reject(new Error('Network error')));

    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'validpassword'
    });

    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('An unexpected error occurred. Please try again.');
    expect(component.isLoading).toBeFalsy();
  }));
});