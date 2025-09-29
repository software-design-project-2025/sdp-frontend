import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import {Navbar} from './navbar/navbar';

// --- STUB COMPONENTS ---
// Create dummy components to represent the pages we'll navigate to.
@Component({ selector: 'app-navbar', standalone: true, template: '' })
class MockNavbarComponent {}

@Component({ standalone: true, template: '' })
class MockLoginComponent {}

@Component({ standalone: true, template: '' })
class MockLoginSuccessComponent {}

@Component({ standalone: true, template: '' })
class MockDashboardComponent {}


describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Import the component being tested and the RouterTestingModule
      imports: [
        AppComponent,
        RouterTestingModule.withRoutes([
          { path: 'login', component: MockLoginComponent },
          { path: 'login-success', component: MockLoginSuccessComponent },
          { path: 'dashboard', component: MockDashboardComponent },
          { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
        ])
      ],
      // Override the real NavbarComponent with our mock for isolation
      // Note: Since AppComponent's 'imports' includes the real Navbar, we override it here.
      // If AppComponent didn't import Navbar, we'd add MockNavbarComponent to 'declarations'.
    })
      // This override is needed because the standalone AppComponent imports the real Navbar.
      // We replace it with a mock to keep the test simple and isolated.
      .overrideComponent(AppComponent, {
        remove: { imports: [Navbar] },
        add: { imports: [MockNavbarComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    // Initial navigation to a default route
    fixture.ngZone?.run(() => router.initialNavigation());
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have the 'sdp-frontend' title`, () => {
    expect(component.title).toEqual('sdp-frontend');
  });

  it('should always render the router-outlet', () => {
    fixture.detectChanges();
    const routerOutlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutlet).not.toBeNull();
  });

  it('should show the navbar on a generic route like "/dashboard"', fakeAsync(() => {
    // Navigate to the dashboard route
    fixture.ngZone?.run(() => router.navigateByUrl('/dashboard'));
    tick(); // Wait for navigation to complete
    fixture.detectChanges(); // Update the view

    // Assertions
    expect(component.showNavbar).toBe(true);
    const navbar = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbar).not.toBeNull();
  }));

  it('should hide the navbar on the "/login" route', fakeAsync(() => {
    // Navigate to the login route
    fixture.ngZone?.run(() => router.navigateByUrl('/login'));
    tick(); // Wait for navigation to complete
    fixture.detectChanges(); // Update the view

    // Assertions
    expect(component.showNavbar).toBe(false);
    const navbar = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbar).toBeNull();
  }));

  it('should hide the navbar on the "/login-success" route', fakeAsync(() => {
    // Navigate to the login-success route
    fixture.ngZone?.run(() => router.navigateByUrl('/login-success'));
    tick(); // Wait for navigation to complete
    fixture.detectChanges(); // Update the view

    // Assertions
    expect(component.showNavbar).toBe(false);
    const navbar = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbar).toBeNull();
  }));
});
