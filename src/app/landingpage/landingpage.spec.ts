import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';

import { LandingPage } from './landingpage';

describe('LandingPage', () => {
  let component: LandingPage;
  let fixture: ComponentFixture<LandingPage>;
  let compiled: HTMLElement; // A variable to hold the rendered HTML for easier querying

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Import the component itself (since it's standalone) and the RouterTestingModule
      imports: [LandingPage, RouterTestingModule]
    })
      .compileComponents();

    fixture = TestBed.createComponent(LandingPage);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement; // Get the rendered HTML element
    fixture.detectChanges(); // Trigger the initial data binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Test Suite for the component's default state ---
  describe('Initial State', () => {
    it('should have the activeTab property set to "Home" by default', () => {
      expect(component.activeTab).toBe('Home');
    });

    it('should display the hero section by default', () => {
      const heroSection = compiled.querySelector('.hero-section');
      expect(heroSection).not.toBeNull();
    });

    it('should apply the "active" class to the "Home" nav link by default', () => {
      const homeNavLink = compiled.querySelector('nav li'); // The first <li> is "Home"
      expect(homeNavLink?.classList.contains('active')).toBeTrue();
    });
  });

  // --- Test Suite for the component's methods ---
  describe('selectTab() method', () => {
    it('should update the activeTab property to the new tab name', () => {
      // Act: Call the method directly
      component.selectTab('Features');
      // Assert: Check if the property was updated
      expect(component.activeTab).toBe('Features');
    });
  });

  // --- Test Suite for user interaction with the template ---
  describe('User Interaction', () => {
    it('should change the active tab when a nav link is clicked', () => {
      // Arrange: Find the 'About' nav link (the second one)
      const aboutLink = compiled.querySelectorAll('nav li')[1] as HTMLElement;

      // Act: Simulate a click
      aboutLink.click();
      fixture.detectChanges(); // Apply the changes to the DOM

      // Assert: Check that the component's property and the DOM class are updated
      expect(component.activeTab).toBe('About');
      expect(aboutLink.classList.contains('active')).toBeTrue();
    });

    it('should display the "Features" section when the "Features" tab is clicked', () => {
      // Arrange: Find the 'Features' nav link (the third one)
      const featuresLink = compiled.querySelectorAll('nav li')[2] as HTMLElement;

      // Act: Click it
      featuresLink.click();
      fixture.detectChanges();

      // Assert: The new section should exist, and the old one should be gone
      const featuresSection = compiled.querySelector('.features-section');
      const heroSection = compiled.querySelector('.hero-section');

      expect(featuresSection).not.toBeNull();
      expect(heroSection).toBeNull(); // The [ngSwitch] should have removed the home section
    });

    it('should have CTA buttons that link to the signup page', () => {
      // Test the CTA in the Home section
      const homeCTA = fixture.debugElement.query(By.css('.hero-section .btn-cta'));
      // CHANGED: .toBe() is now .toContain()
      expect(homeCTA.properties['href']).toContain('/signup');

      // Switch to the Community tab and test its CTA
      component.selectTab('Community');
      fixture.detectChanges();
      const communityCTA = fixture.debugElement.query(By.css('.community-section .btn-cta'));
      // CHANGED: .toBe() is now .toContain()
      expect(communityCTA.properties['href']).toContain('/signup');
    });
  });
});
