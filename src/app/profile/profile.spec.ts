import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { Profile } from './profile';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';

// --- MOCK DATA ---
const MOCK_USER_ID = '123-abc';
const MOCK_USER_NAME = 'Jane Doe';

const MOCK_DEGREES = [
  { degreeid: 1, degree_name: 'BSc Computer Science', degree_type: 'Undergraduate', facultyid: 101 },
  { degreeid: 2, degree_name: 'BCom Accounting', degree_type: 'Undergraduate', facultyid: 102 },
];

const MOCK_MODULES = [
  { courseCode: 'COMS101', courseName: 'Intro to Programming', facultyid: '101' },
  { courseCode: 'COMS202', courseName: 'Data Structures', facultyid: '101' },
  { courseCode: 'ACC101', courseName: 'Intro to Accounting', facultyid: '102' },
];

const MOCK_USER_PROFILE_API = {
  degreeid: 1,
  yearofstudy: 2,
  role: 'Student',
  status: 'Active',
  bio: 'A passionate learner.',
};

const MOCK_USER_COURSES_API = {
  courses: ['COMS101']
};


// --- MOCK SERVICES ---
class MockAuthService {
  getCurrentUser() {
    return Promise.resolve({
      data: { user: { id: MOCK_USER_ID } },
      error: null
    });
  }
}

class MockUserService {
  getUserById(userId: string) {
    return Promise.resolve({
      id: userId,
      name: MOCK_USER_NAME
    });
  }
}

class MockUserApiService {
  getUserById(userId: string) {
    return of([MOCK_USER_PROFILE_API]); // API returns an array
  }
  getUserCourses(userId: string) {
    return of(MOCK_USER_COURSES_API);
  }
}

class MockAcademicApiService {
  getAllDegrees() {
    return of(MOCK_DEGREES);
  }
  getAllModules() {
    return of(MOCK_MODULES);
  }
}


describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let userApiService: UserApiService;
  let academicApiService: AcademicApiService;

  // Helper function to get native elements
  const getElement = (selector: string): HTMLElement | null => fixture.debugElement.query(By.css(selector))?.nativeElement;
  const getElements = (selector: string): HTMLElement[] => fixture.debugElement.queryAll(By.css(selector)).map(el => el.nativeElement);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile], // The component is standalone
      providers: [
        provideNoopAnimations(),
        { provide: UserApiService, useClass: MockUserApiService },
        { provide: AcademicApiService, useClass: MockAcademicApiService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: UserService, useClass: MockUserService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    userApiService = TestBed.inject(UserApiService);
    academicApiService = TestBed.inject(AcademicApiService);

    // Spy on service methods to ensure they are called
    spyOn(userApiService, 'getUserById').and.callThrough();
    spyOn(userApiService, 'getUserCourses').and.callThrough();
    spyOn(academicApiService, 'getAllDegrees').and.callThrough();
    spyOn(academicApiService, 'getAllModules').and.callThrough();

    // fixture.detectChanges() will trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial Data Loading', () => {
    it('should display the loading overlay initially', () => {
      // Set isLoading to true manually before the first detectChanges
      component.isLoading.set(true);
      fixture.detectChanges();
      expect(getElement('.loading-overlay')).toBeTruthy();
      expect(getElement('.profile-card')).toBeFalsy();
    });

    it('should fetch all necessary data on init', fakeAsync(() => {
      fixture.detectChanges(); // Triggers ngOnInit -> initializeProfile
      tick(); // Resolve promises and observables

      expect(userApiService.getUserById).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(userApiService.getUserCourses).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(academicApiService.getAllDegrees).toHaveBeenCalled();
      expect(academicApiService.getAllModules).toHaveBeenCalled();
    }));

    it('should hide loading overlay and display profile card after data is fetched', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(getElement('.loading-overlay')).toBeFalsy();
      expect(getElement('.profile-card')).toBeTruthy();
      expect(getElement('.user-name')?.textContent).toContain(MOCK_USER_NAME);
    }));

  });

  describe('View Mode Display', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges(); // ngOnInit
      tick(); // Let all promises/observables resolve
      fixture.detectChanges(); // Update view with data
    }));

    it('should display user information correctly', () => {
      expect(getElement('.user-name')?.textContent).toBe(MOCK_USER_NAME);
      expect(getElement('.profile-avatar')?.textContent).toBe('JD'); // Initials
      // The text content is "BSc Computer Science • Year 2"
      const infoText = getElement('.profile-info p')?.textContent ?? '';
      expect(infoText).toContain('BSc Computer Science');
      expect(infoText).toContain('Year 2');
      expect(getElement('.profile-bio')?.textContent).toBe(MOCK_USER_PROFILE_API.bio);
    });

    it('should display user\'s selected modules as tags', () => {
      const moduleTags = getElements('.subject-tag');
      expect(moduleTags.length).toBe(1);
      expect(moduleTags[0].textContent).toContain('COMS101: Intro to Programming');
    });

    it('should display stats cards', () => {
      const statCards = getElements('.stat-card');
      expect(statCards.length).toBe(component.dummyStats.length);
      expect(statCards[0].textContent).toContain('156h');
      expect(statCards[0].textContent).toContain('Study Hours');
    });

    it('should show "Edit Profile" button and hide save/cancel buttons', () => {
      expect(getElement('.edit-profile-button')).toBeTruthy();
      expect(getElement('.save-button')).toBeFalsy();
      expect(getElement('.cancel-button')).toBeFalsy();
    });
  });

  describe('Editing Functionality', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges(); // ngOnInit
      tick();
      fixture.detectChanges();
    }));

    it('should switch to edit mode when "Edit Profile" is clicked', fakeAsync(() => {
      getElement('.edit-profile-button')?.click();
      tick();
      fixture.detectChanges();

      expect(component.isEditing()).toBe(true);
      expect(getElement('.edit-profile-button')).toBeFalsy();
      expect(getElement('.save-button')).toBeTruthy();
      expect(getElement('.cancel-button')).toBeTruthy();
      expect(getElement('.bio-textarea')).toBeTruthy();
      expect(getElement('.module-search-input')).toBeTruthy();
    }));

    xit('should populate form fields with correct data in edit mode', fakeAsync(() => {
      getElement('.edit-profile-button')?.click();
      tick();
      fixture.detectChanges();

      // Check text area
      const bioTextarea = getElement('.bio-textarea') as HTMLTextAreaElement;
      expect(bioTextarea.value).toBe(MOCK_USER_PROFILE_API.bio);

      // Check select for degree
      const degreeSelect = getElement('.edit-input[type!=number]') as HTMLSelectElement;
      expect(degreeSelect.value).toBe(MOCK_USER_PROFILE_API.degreeid.toString());

      // Check input for year of study
      const yearInput = getElement('.edit-input[type=number]') as HTMLInputElement;
      expect(yearInput.value).toBe(MOCK_USER_PROFILE_API.yearofstudy.toString());

      // Check if the correct module is pre-selected
      const selectedCheckbox = getElement('input[type=checkbox]:checked') as HTMLInputElement;
      const label = selectedCheckbox.parentElement as HTMLLabelElement;
      expect(label.textContent).toContain('COMS101');
    }));

    it('should filter modules based on search input', fakeAsync(() => {
      getElement('.edit-profile-button')?.click();
      tick();
      fixture.detectChanges();

      const searchInput = getElement('.module-search-input') as HTMLInputElement;
      searchInput.value = 'data';
      searchInput.dispatchEvent(new Event('input'));
      tick();
      fixture.detectChanges();

      const moduleLabels = getElements('.module-checkbox-label');
      expect(moduleLabels.length).toBe(1);
      expect(moduleLabels[0].textContent).toContain('Data Structures');
    }));

    it('should save changes and return to view mode', fakeAsync(() => {
      getElement('.edit-profile-button')?.click();
      tick();
      fixture.detectChanges();

      // Modify data
      const newBio = 'An updated bio.';
      const bioTextarea = getElement('.bio-textarea') as HTMLTextAreaElement;
      bioTextarea.value = newBio;
      bioTextarea.dispatchEvent(new Event('input')); // Triggers ngModel change

      // Deselect the first module and select the second
      const checkboxes = getElements('input[type=checkbox]') as HTMLInputElement[];
      checkboxes[0].click(); // Deselect COMS101
      checkboxes[1].click(); // Select COMS202

      tick();
      fixture.detectChanges();

      getElement('.save-button')?.click();
      tick();
      fixture.detectChanges();

      // Assertions
      expect(component.isEditing()).toBe(false);
      expect(getElement('.profile-bio')?.textContent).toBe(newBio);

      const moduleTags = getElements('.subject-tag');
      expect(moduleTags.length).toBe(1);
      expect(moduleTags[0].textContent).toContain('COMS202: Data Structures');
    }));

    it('should cancel edits and return to view mode without saving', fakeAsync(() => {
      getElement('.edit-profile-button')?.click();
      tick();
      fixture.detectChanges();

      // Modify bio but don't save
      const bioTextarea = getElement('.bio-textarea') as HTMLTextAreaElement;
      bioTextarea.value = 'A temporary bio.';
      bioTextarea.dispatchEvent(new Event('input'));

      tick();
      fixture.detectChanges();

      getElement('.cancel-button')?.click();
      tick();
      fixture.detectChanges();

      // Assertions
      expect(component.isEditing()).toBe(false);
      // Bio should be the original one
      expect(getElement('.profile-bio')?.textContent).toBe(MOCK_USER_PROFILE_API.bio);
    }));
  });
});
