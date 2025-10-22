import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { of, throwError } from 'rxjs';

import { LoginSuccessComponent } from './LoginSuccessComponent'; // Removed .ts extension
import { AuthService } from '../../services/auth.service';

// --- MOCK COMPONENTS ---
@Component({ template: '' }) class DummyHomeComponent {}
@Component({ template: '' }) class DummyProfileComponent {}
@Component({ template: '' }) class DummyLoginComponent {}

describe('LoginSuccessComponent', () => {
  let component: LoginSuccessComponent;
  let fixture: ComponentFixture<LoginSuccessComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let nativeElement: HTMLElement;

  const mockUser = {
    id: '123-abc',
    email: 'test@example.com',
    user_metadata: { name: 'Test User' }
  };

  const mockUserFullName = {
    id: '123-abc',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test Full Name' }
  };

  const mockUserEmailOnly = {
    id: '123-abc',
    email: 'student@example.com',
    user_metadata: {}
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'createUser', 'signOut', 'getSession']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        LoginSuccessComponent, // It's standalone
        CommonModule,
        RouterTestingModule.withRoutes([
          { path: 'home', component: DummyHomeComponent },
          { path: 'profile', component: DummyProfileComponent },
          { path: 'login', component: DummyLoginComponent }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginSuccessComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;

    // Default mocks for actions
    // --- FIX: Return a user-like object, not a boolean ---
    mockAuthService.createUser.and.returnValue(of(mockUser as any));
    mockAuthService.signOut.and.returnValue(Promise.resolve() as any);
  });

  it('should create and start in loading state', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading).toBeTrue();

    fixture.detectChanges(); // Run ngOnInit
    expect(nativeElement.querySelector('.loading-wrapper')).toBeTruthy();
    expect(nativeElement.querySelector('.success-card')).toBeFalsy();
  });

  it('should get user, create user, and display success on happy path', fakeAsync(() => {
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }) as any);

    fixture.detectChanges(); // ngOnInit

    tick(500); // 1. Initial delay
    tick(1);   // 2. getUserWithRetry (resolves promise)
    tick(1);   // 3. createUser (resolves observable)
    tick(100); // 4. setTimeout to hide loading
    fixture.detectChanges();

    expect(component.isLoading).toBeFalse();
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockAuthService.createUser).toHaveBeenCalledWith(mockUser.id);
    expect(component.userName).toBe('Test User');
    expect(component.userEmail).toBe('test@example.com');

    expect(nativeElement.querySelector('.loading-wrapper')).toBeFalsy();
    expect(nativeElement.querySelector('.success-card')).toBeTruthy();
    expect(nativeElement.querySelector('.user-name')?.textContent).toBe('Test User');
    expect(nativeElement.querySelector('.email')?.textContent).toBe('test@example.com');
  }));

  it('should retry getting user and succeed on 3rd attempt', fakeAsync(() => {
    mockAuthService.getCurrentUser
      .and.returnValues(
      Promise.resolve({ data: { user: null }, error: null }) as any, // Attempt 1
      Promise.resolve({ data: null, error: new Error('Network fail') }) as any, // Attempt 2
      Promise.resolve({ data: { user: mockUser }, error: null }) as any // Attempt 3
    );

    fixture.detectChanges(); // ngOnInit

    tick(500); // 1. Initial delay

    // Retry logic
    tick(1);    // Attempt 1 (no user)
    tick(1000); // delay(1000 * 1)
    tick(1);    // Attempt 2 (error)
    tick(2000); // delay(1000 * 2)
    tick(1);    // Attempt 3 (success)

    tick(1);    // 3. createUser
    tick(100);  // 4. setTimeout
    fixture.detectChanges();

    expect(component.isLoading).toBeFalse();
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(3);
    expect(mockAuthService.createUser).toHaveBeenCalledWith(mockUser.id);
    expect(component.userName).toBe('Test User');
  }));

  it('should fail after all retries and redirect to login', fakeAsync(() => {
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null }, error: new Error('Final fail') }) as any);

    fixture.detectChanges(); // ngOnInit

    tick(500); // 1. Initial delay

    // Run through all 5 attempts + delays
    tick(1);    // Attempt 1
    tick(1000); // Delay 1
    tick(1);    // Attempt 2
    tick(2000); // Delay 2
    tick(1);    // Attempt 3
    tick(3000); // Delay 3
    tick(1);    // Attempt 4
    tick(4000); // Delay 4
    tick(1);    // Attempt 5 (throws error)

    // Catch block runs
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();

    tick(2000); // 2. setTimeout for redirect

    expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(5);
    expect(mockAuthService.createUser).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { error: 'Authentication failed. Please try again.' } }
    );
  }));

  it('should fail and redirect to login if createUser fails', fakeAsync(() => {
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }) as any);
    // --- FIX: Return null (or falsy) instead of false ---
    mockAuthService.createUser.and.returnValue(of(null as any)); // Simulate failure

    fixture.detectChanges(); // ngOnInit

    tick(500); // 1. Initial delay
    tick(1);   // 2. getUserWithRetry
    tick(1);   // 3. createUser (fails, throws error)

    // Catch block runs
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse();

    tick(2000); // 4. setTimeout for redirect

    expect(mockAuthService.createUser).toHaveBeenCalledWith(mockUser.id);
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { error: 'Authentication failed. Please try again.' } }
    );
  }));

  it('should parse userName from full_name if name is missing', fakeAsync(() => {
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUserFullName }, error: null }) as any);
    fixture.detectChanges();
    tick(500 + 1 + 1 + 100); // All async timers
    expect(component.userName).toBe('Test Full Name');
  }));

  it('should parse userName from email if all metadata is missing', fakeAsync(() => {
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUserEmailOnly }, error: null }) as any);
    fixture.detectChanges();
    tick(500 + 1 + 1 + 100); // All async timers
    expect(component.userName).toBe('student');
  }));

  describe('User Actions (Post-Load)', () => {
    beforeEach(fakeAsync(() => {
      // Run the full happy path to get to the loaded state
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }) as any);
      fixture.detectChanges();
      tick(500 + 1 + 1 + 100);
      fixture.detectChanges();
    }));

    it('should navigate to /home when goToDashboard is clicked', () => {
      expect(component.isLoading).toBeFalse(); // Verify loaded
      const dashboardButton = nativeElement.querySelector('.primary-btn') as HTMLButtonElement;
      dashboardButton.click();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should navigate to /profile when goToProfile is clicked', () => {
      expect(component.isLoading).toBeFalse(); // Verify loaded
      const profileButton = nativeElement.querySelector('.secondary-btn') as HTMLButtonElement;
      profileButton.click();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should call signOut and navigate to /login when logout is clicked', fakeAsync(() => {
      expect(component.isLoading).toBeFalse(); // Verify loaded
      const logoutButton = nativeElement.querySelector('.logout-btn') as HTMLButtonElement;

      logoutButton.click();
      expect(component.isLoading).toBeTrue();

      tick(); // Resolve the signOut promise

      expect(mockAuthService.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(component.isLoading).toBeFalse();
    }));
  });
});
