import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';

import { AppComponent } from './app.component';

// Create a "stub" component to stand in for the real Navbar.
// This isolates our test and prevents errors if the real Navbar has its own dependencies.
@Component({
  selector: 'app-navbar',
  standalone: true,
  template: '' // No template needed for the stub
})
class MockNavbarComponent {}

// A stub component for routing, required for RouterTestingModule
@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        MockNavbarComponent, // Use the stub instead of the real navbar
        // Use RouterTestingModule to provide a fully functional test router
        RouterTestingModule.withRoutes([
          { path: 'login', component: DummyComponent },
          { path: 'login-success', component: DummyComponent },
          { path: 'dashboard', component: DummyComponent },
          // A wildcard route to handle redirects and other paths
          { path: '**', component: DummyComponent }
        ])
      ],
      // No longer need to provide a manual router mock
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  // This is a default test from the CLI that was likely causing one of the errors.
  // It is included here in the corrected test suite.
  it(`should have the 'sdp-frontend' title`, () => {
    expect(component.title).toEqual('sdp-frontend');
  });

  it('should show the navbar on a generic route like "/dashboard"', fakeAsync(() => {
    // Simulate navigation using the actual router API
    router.navigateByUrl('/dashboard');
    tick(); // Wait for the navigation to complete
    fixture.detectChanges();

    expect(component.showNavbar).toBe(true);
    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).not.toBeNull();
  }));

  it('should hide the navbar on the "/login" route', fakeAsync(() => {
    router.navigateByUrl('/login');
    tick();
    fixture.detectChanges();

    expect(component.showNavbar).toBe(false);
    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).toBeNull();
  }));

  it('should hide the navbar on the "/login-success" route', fakeAsync(() => {
    router.navigateByUrl('/login-success');
    tick();
    fixture.detectChanges();

    expect(component.showNavbar).toBe(false);
    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).toBeNull();
  }));

  it('should always render the router-outlet', () => {
    const routerOutletElement = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutletElement).not.toBeNull();
  });
});

