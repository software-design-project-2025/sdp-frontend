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
        ]),
        LoginComponent // Import if standalone
      ],
      // declarations: [LoginComponent], // Only if not standalone
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

  it('should validate email field with various formats', () => {
    const emailControl = component.loginForm.get('email');
    
    // Test required validation
    expect(emailControl?.hasError('required')).toBeTruthy();
    
    // Test invalid email formats
    emailControl?.setValue('plainstring');
    expect(emailControl?.hasError('email')).toBeTruthy();
    
    // Test valid email formats
    const validEmails = [
      'user@yahoo.com',
      'admin@company.net',
      'first.last@university.edu',
      'user+filter@sub.domain.org',
      'me@my-domain.io'
    ];
    
    validEmails.forEach(email => {
      emailControl?.setValue(email);
      expect(emailControl?.hasError('email')).toBeFalsy();
    });
  });

  it('should validate password field', () => {
    const passwordControl = component.loginForm.get('password');
    
    // Test required validation
    expect(passwordControl?.hasError('required')).toBeTruthy();
    
    // Test minlength validation
    passwordControl?.setValue('12345');
    expect(passwordControl?.hasError('minlength')).toBeTruthy();
    
    // Test valid password
    passwordControl?.setValue('ValidPass123!');
    expect(passwordControl?.hasError('minlength')).toBeFalsy();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBeFalsy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTruthy();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeFalsy();
  });

  it('should handle successful login with various email domains', fakeAsync(() => {
    const domains = ['@company.com', '@university.edu', '@service.io', '@personal.org'];
    
    domains.forEach(domain => {
      const email = `test${domain}`;
      const mockUser = {
        id: '123',
        email: email,
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
        email: email,
        password: 'validpassword'
      });

      component.onSubmit();
      tick();

      expect(authService.signIn).toHaveBeenCalledWith(
        email,
        'validpassword'
      );
      expect(router.navigate).toHaveBeenCalledWith(['/login-success']);
      expect(component.errorMessage).toBeNull();
      
      // Reset spies
      authService.signIn.calls.reset();
      (router.navigate as jasmine.Spy).calls.reset();
    });
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
      email: 'user@domain.com',
      password: 'wrongpassword'
    });

    component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid email or password');
    expect(component.isLoading).toBeFalsy();
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
});