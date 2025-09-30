import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginSuccessComponent } from './LoginSuccessComponent';
import { AuthService } from '../../services/auth.service';
import { Component } from '@angular/core';
import { User } from '@supabase/supabase-js';

// Mock component for routing
@Component({ template: '' })
class DummyComponent {}

describe('LoginSuccessComponent', () => {
  let component: LoginSuccessComponent;
  let fixture: ComponentFixture<LoginSuccessComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockUser: User = {
    id: '123-abc',
    email: 'test@example.com',
    user_metadata: { name: 'Test User' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'createUser', 'signOut', 'getSession']);

    await TestBed.configureTestingModule({
      imports: [
        LoginSuccessComponent,
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyComponent },
          { path: 'home', component: DummyComponent },
          { path: 'profile', component: DummyComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginSuccessComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should fetch user, call createUser, and display info on success', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }));
      authService.createUser.and.returnValue(of(mockUser as any));

      fixture.detectChanges(); // ngOnInit
      tick(1000);
      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(component.userName).toBe('Test User');
      expect(component.userEmail).toBe('test@example.com');
      expect(authService.createUser).toHaveBeenCalledWith('123-abc');
    }));

    it('should use full_name from user_metadata if name is not available', fakeAsync(() => {
      const userWithFullName = {
        ...mockUser,
        user_metadata: { full_name: 'Full Name User' }
      };
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: userWithFullName }, error: null }));
      authService.createUser.and.returnValue(of(userWithFullName as any));

      fixture.detectChanges();
      tick(1000);
      fixture.detectChanges();

      expect(component.userName).toBe('Full Name User');
    }));

    it('should use email prefix if no name or full_name is available', fakeAsync(() => {
      const userWithoutName = {
        ...mockUser,
        user_metadata: {}
      };
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: userWithoutName }, error: null }));
      authService.createUser.and.returnValue(of(userWithoutName as any));

      fixture.detectChanges();
      tick(1000);
      fixture.detectChanges();

      expect(component.userName).toBe('test');
    }));

    it('should use "User" as default if no email is available', fakeAsync(() => {
      const userWithoutEmail = {
        ...mockUser,
        email: undefined,
        user_metadata: {}
      };
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: userWithoutEmail }, error: null }));
      authService.createUser.and.returnValue(of(userWithoutEmail as any));

      fixture.detectChanges();
      tick(1000);
      fixture.detectChanges();

      expect(component.userName).toBe('User');
      expect(component.userEmail).toBe('');
    }));

    xit('should retry if getCurrentUser promise rejects', fakeAsync(() => {
      authService.getCurrentUser.and.returnValues(
        Promise.reject('Network Error'),
        Promise.resolve({ data: { user: mockUser }, error: null })
      );
      authService.createUser.and.returnValue(of(mockUser as any));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick(6000);
      fixture.detectChanges();

      expect(authService.getCurrentUser).toHaveBeenCalledTimes(2);
      expect(component.isLoading).toBeFalse();
      expect(component.userName).toBe('Test User');
      expect(console.error).toHaveBeenCalledWith('Error on attempt 1:', 'Network Error');
    }));

    it('should retry if no user is found in the response', fakeAsync(() => {
      authService.getCurrentUser.and.returnValues(
        Promise.resolve({ data: { user: null }, error: null }),
        Promise.resolve({ data: { user: mockUser }, error: null })
      );
      authService.createUser.and.returnValue(of(mockUser as any));
      spyOn(console, 'log');

      fixture.detectChanges();
      tick(6000);
      fixture.detectChanges();

      expect(authService.getCurrentUser).toHaveBeenCalledTimes(2);
      expect(component.isLoading).toBeFalse();
      expect(component.userName).toBe('Test User');
    }));

    xit('should navigate to login after max retries with error', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.getCurrentUser.and.returnValue(Promise.reject('Persistent Error'));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick(20000); // Enough time for all retries and the 2s delay before navigation
      fixture.detectChanges();

      expect(authService.getCurrentUser).toHaveBeenCalledTimes(5);
      expect(component.isLoading).toBeFalse();
      expect(routerSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: { error: 'Authentication failed. Please try again.' }
      });
      expect(console.error).toHaveBeenCalledWith('Authentication check failed:', jasmine.any(Error));
    }));

    it('should navigate to login when no user found after all retries', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null }, error: null }));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick(20000);
      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(routerSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: { error: 'Authentication failed. Please try again.' }
      });
    }));

    it('should handle createUser failure and navigate to login', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }));
      authService.createUser.and.returnValue(throwError(() => new Error('DB Error')));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick(5000);
      fixture.detectChanges();

      expect(component.isLoading).toBeFalse();
      expect(routerSpy).toHaveBeenCalledWith(['/login'], {
        queryParams: { error: 'Authentication failed. Please try again.' }
      });
    }));
  });

  describe('User Actions', () => {
    beforeEach(fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }));
      authService.createUser.and.returnValue(of(mockUser as any));

      fixture.detectChanges();
      tick(1000);
      fixture.detectChanges();
    }));

    it('should navigate to /home on goToDashboard()', () => {
      const routerSpy = spyOn(router, 'navigate');
      component.goToDashboard();
      expect(routerSpy).toHaveBeenCalledWith(['/home']);
    });

    it('should not navigate to /home if isLoading is true', () => {
      const routerSpy = spyOn(router, 'navigate');
      component.isLoading = true;
      component.goToDashboard();
      expect(routerSpy).not.toHaveBeenCalled();
    });

    it('should navigate to /profile on goToProfile()', () => {
      const routerSpy = spyOn(router, 'navigate');
      component.goToProfile();
      expect(routerSpy).toHaveBeenCalledWith(['/profile']);
    });

    it('should not navigate to /profile if isLoading is true', () => {
      const routerSpy = spyOn(router, 'navigate');
      component.isLoading = true;
      component.goToProfile();
      expect(routerSpy).not.toHaveBeenCalled();
    });

    it('should call signOut and navigate to /login on logout()', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.signOut.and.returnValue(Promise.resolve(null));
      spyOn(console, 'log');

      component.logout();
      tick();

      expect(authService.signOut).toHaveBeenCalled();
      expect(routerSpy).toHaveBeenCalledWith(['/login']);
      expect(console.log).toHaveBeenCalledWith('Logging out...');
    }));

    it('should not logout if isLoading is true', fakeAsync(() => {
      component.isLoading = true;
      authService.signOut.and.returnValue(Promise.resolve(null));

      component.logout();
      tick();

      expect(authService.signOut).not.toHaveBeenCalled();
    }));

    it('should handle errors during logout', fakeAsync(() => {
      spyOn(console, 'error');
      authService.signOut.and.returnValue(Promise.reject('Logout failed'));

      component.logout();
      tick();

      expect(authService.signOut).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error logging out:', 'Logout failed');
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('checkAuth', () => {
    it('should set user data when session exists', fakeAsync(() => {
      const mockSession = {
        user: {
          email: 'session@test.com',
          user_metadata: { full_name: 'Session User' }
        }
      };
      authService.getSession.and.returnValue(Promise.resolve({ data: { session: mockSession as any }, error: null }));

      component.checkAuth();
      tick();

      expect(component.user).toEqual({
        userName: 'Session User',
        userEmail: 'session@test.com'
      });
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle empty user_metadata in checkAuth', fakeAsync(() => {
      const mockSession = {
        user: {
          email: 'session@test.com',
          user_metadata: {}
        }
      };
      authService.getSession.and.returnValue(Promise.resolve({ data: { session: mockSession as any }, error: null }));

      component.checkAuth();
      tick();

      expect(component.user).toEqual({
        userName: '',
        userEmail: 'session@test.com'
      });
      expect(component.isLoading).toBeFalse();
    }));

    it('should navigate to login when session error occurs', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.getSession.and.returnValue(Promise.resolve({ data: { session: null }, error: { message: 'Session error' } as any }));
      spyOn(console, 'error');

      component.checkAuth();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(routerSpy).toHaveBeenCalledWith(['/login']);
      expect(console.error).toHaveBeenCalledWith('Auth check failed:', jasmine.any(Object));
    }));

    it('should navigate to login when no session found', fakeAsync(() => {
      const routerSpy = spyOn(router, 'navigate');
      authService.getSession.and.returnValue(Promise.resolve({ data: { session: null }, error: null }));
      spyOn(console, 'error');

      component.checkAuth();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(routerSpy).toHaveBeenCalledWith(['/login']);
      expect(console.error).toHaveBeenCalledWith('Auth check failed:', jasmine.any(Error));
    }));
  });
});
