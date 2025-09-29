import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

import { Navbar } from './navbar';
import { AuthService } from '../services';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    // Create a spy object for AuthService with a signOut method
    const spy = jasmine.createSpyObj('AuthService', ['signOut']);

    await TestBed.configureTestingModule({
      imports: [
        Navbar,
        RouterTestingModule.withRoutes([]) // Import RouterTestingModule to handle router dependencies
      ],
      providers: [
        { provide: AuthService, useValue: spy } // Provide the mock AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    // Get the injected spies and router instance for our tests
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the logo text "StudyLink"', () => {
    const logoElement = fixture.debugElement.query(By.css('.logo-text')).nativeElement;
    expect(logoElement.textContent).toContain('StudyLink');
  });

  it('should render all navigation links', () => {
    const navLinks = fixture.debugElement.queryAll(By.css('.navbar-link'));
    // The component has 6 links
    expect(navLinks.length).toBe(6);
    expect(component.navLinks.length).toBe(6);
  });

  it('should have a logout button', () => {
    const logoutButton = fixture.debugElement.query(By.css('.logout-button'));
    expect(logoutButton).toBeTruthy();
  });

  it('should toggle the menu when the toggle button is clicked', () => {
    expect(component.isMenuOpen).toBeFalse();
    // Find the toggle button which is only visible in the mobile view
    const toggleButton = fixture.debugElement.query(By.css('.navbar-toggle'));

    // Simulate a click
    toggleButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.isMenuOpen).toBeTrue();

    // Click again to close
    toggleButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(component.isMenuOpen).toBeFalse();
  });

  it('should call authService.signOut and navigate on logout', fakeAsync(() => {
    // Spy on the router's navigate method
    const navigateSpy = spyOn(router, 'navigate');
    // Mock the signOut method to return a successful promise
    authServiceSpy.signOut.and.returnValue(Promise.resolve(null));

    // Find the logout button and click it
    const logoutButton = fixture.debugElement.query(By.css('.logout-button'));
    logoutButton.triggerEventHandler('click', null);

    // Wait for async operations within the logout method to complete
    tick();

    // Check if signOut was called
    expect(authServiceSpy.signOut).toHaveBeenCalled();
    // Check if router.navigate was called with the correct parameters
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  }));

  it('should handle errors during sign out and not navigate', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');

    // Create a mock object that looks like an AuthError
    const mockAuthError = {
      name: 'AuthError',
      message: 'Logout failed',
      status: 401,
    };

    // Mock the signOut method to return an error object that matches the expected type
    authServiceSpy.signOut.and.returnValue(Promise.resolve(mockAuthError as any)); // Using 'as any' to simplify mock type
    const consoleErrorSpy = spyOn(console, 'error'); // Spy on console.error to check if it's called

    const logoutButton = fixture.debugElement.query(By.css('.logout-button'));
    logoutButton.triggerEventHandler('click', null);

    tick();

    expect(authServiceSpy.signOut).toHaveBeenCalled();
    // Ensure navigation did NOT happen
    expect(navigateSpy).not.toHaveBeenCalled();
    // Check that the error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', mockAuthError);
  }));
});

