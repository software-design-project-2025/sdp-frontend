import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, Event } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
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

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  // A 'Subject' allows us to manually push new values (router events) to an observable stream.
  const routerEventsSubject = new Subject<Event>();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Import the component being tested and its dependencies (or their stubs)
      imports: [
        AppComponent,
        MockNavbarComponent, // Use the stub instead of the real navbar
        RouterTestingModule // Provides stubs for router directives like <router-outlet>
      ],
      providers: [
        // Provide the real Router, but we will spy on its 'events' property
        {
          provide: Router,
          useValue: {
            events: routerEventsSubject.asObservable(), // Use our subject for the events stream
            // Mock other router properties or methods if needed by the component
            navigate: jasmine.createSpy('navigate')
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router); // Get the injected router instance
    fixture.detectChanges(); // Initial data binding
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should show the navbar on a generic route like "/dashboard"', () => {
    // Simulate navigating to a page where the navbar should be visible
    routerEventsSubject.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    fixture.detectChanges(); // Update the component and its template

    // Check the component property
    expect(component.showNavbar).toBe(true);

    // Check the DOM to ensure the navbar component is being rendered
    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).not.toBeNull();
  });

  it('should hide the navbar on the "/login" route', () => {
    // Simulate navigating to the login page
    routerEventsSubject.next(new NavigationEnd(1, '/login', '/login'));
    fixture.detectChanges();

    expect(component.showNavbar).toBe(false);

    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).toBeNull();
  });

  it('should hide the navbar on the "/login-success" route', () => {
    // Simulate navigating to the login-success page
    routerEventsSubject.next(new NavigationEnd(1, '/login-success', '/login-success'));
    fixture.detectChanges();

    expect(component.showNavbar).toBe(false);

    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).toBeNull();
  });

  it('should hide the navbar when urlAfterRedirects is "/login"', () => {
    // Simulate a redirect to the login page
    routerEventsSubject.next(new NavigationEnd(1, '/redirected', '/login'));
    fixture.detectChanges();

    expect(component.showNavbar).toBe(false);

    const navbarElement = fixture.debugElement.query(By.css('app-navbar'));
    expect(navbarElement).toBeNull();
  });

  it('should always render the router-outlet', () => {
    const routerOutletElement = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutletElement).not.toBeNull();
  });
});
