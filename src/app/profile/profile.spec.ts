import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Profile, SafeHtmlPipe } from './profile';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

// --- MOCK DATA ---
const MOCK_USER_ID = '123-abc';
const MOCK_USER_NAME = 'Jane Doe';

const MOCK_DEGREES = [
  { degreeid: 1, degree_name: 'BSc Computer Science', degree_type: 'Undergraduate', facultyid: 101 },
  { degreeid: 2, degree_name: 'BA Psychology', degree_type: 'Undergraduate', facultyid: 102 },
];
const MOCK_MODULES = [
  { courseCode: 'COMS101', courseName: 'Intro to Programming', facultyid: '101' },
  { courseCode: 'PSYC201', courseName: 'Cognitive Psychology', facultyid: '102' },
  { courseCode: 'MATH101', courseName: 'Calculus I', facultyid: '101' },
];
const MOCK_USER_PROFILE_API = {
  degreeid: 1,
  yearofstudy: 2,
  role: 'Student',
  status: 'Active',
  bio: 'A passionate learner.',
  profile_picture: 'url-to-pic'
};
// ✅ FIX: Mock data now matches the actual API response structure (UserCourse[])
const MOCK_USER_COURSES_API = [
  { userid: MOCK_USER_ID, courseCode: 'COMS101' },
  { userid: MOCK_USER_ID, courseCode: 'MATH101' },
];
const MOCK_USER_STATS_API = { topicsCompleted: 42, studyHours: 156, studyPartners: 12, totalSessions: 23 };

describe('SafeHtmlPipe', () => {
  let pipe: SafeHtmlPipe;
  let sanitizer: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    sanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
    pipe = new SafeHtmlPipe(sanitizer);
  });

  it('should sanitize HTML content', () => {
    const testHtml = '<svg></svg>';
    const mockSafeHtml = 'SAFE_HTML' as any;
    sanitizer.bypassSecurityTrustHtml.and.returnValue(mockSafeHtml);

    const result = pipe.transform(testHtml);

    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(testHtml);
    expect(result).toBe(mockSafeHtml);
  });
});

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let userApiService: jasmine.SpyObj<UserApiService>;
  let academicApiService: jasmine.SpyObj<AcademicApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;

  const getElement = (selector: string): HTMLElement | null =>
    fixture.debugElement.query(By.css(selector))?.nativeElement;
  const getAllElements = (selector: string): HTMLElement[] =>
    fixture.debugElement.queryAll(By.css(selector)).map(el => el.nativeElement);

  beforeEach(async () => {
    // ✅ FIX: Added missing async methods for saving changes to the spy object
    const userApiSpy = jasmine.createSpyObj('UserApiService', [
      'getUserById', 'getUserCourses', 'getUserStats',
      'patchUser', 'postUserCourse', 'deleteUserCourse'
    ]);
    const academicApiSpy = jasmine.createSpyObj('AcademicApiService', ['getAllDegrees', 'getAllModules']);
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userSpy = jasmine.createSpyObj('UserService', ['getUserById']);

    await TestBed.configureTestingModule({
      imports: [Profile, FormsModule], // FormsModule is needed for ngModel
      providers: [
        { provide: UserApiService, useValue: userApiSpy },
        { provide: AcademicApiService, useValue: academicApiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: UserService, useValue: userSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    academicApiService = TestBed.inject(AcademicApiService) as jasmine.SpyObj<AcademicApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  function setupHappyPathMocks() {
    authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: { id: MOCK_USER_ID } } } as any));
    userService.getUserById.and.returnValue(Promise.resolve({ id: MOCK_USER_ID, name: MOCK_USER_NAME } as any));
    userApiService.getUserById.and.returnValue(of(MOCK_USER_PROFILE_API)); // API returns a single object
    userApiService.getUserCourses.and.returnValue(of(MOCK_USER_COURSES_API)); // Use corrected mock
    userApiService.getUserStats.and.returnValue(of(MOCK_USER_STATS_API));
    academicApiService.getAllDegrees.and.returnValue(of(MOCK_DEGREES));
    academicApiService.getAllModules.and.returnValue(of(MOCK_MODULES));

    // Mock save-related API calls for re-initialization
    userApiService.patchUser.and.returnValue(of({}));
    userApiService.postUserCourse.and.returnValue(of({}));
    userApiService.deleteUserCourse.and.returnValue(of({}));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial Data Loading', () => {
    it('should fetch all necessary data on init and display it', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges(); // ngOnInit is called
      tick(); // Resolve promises from auth/user service
      fixture.detectChanges(); // Update view with initial data

      expect(component.isLoading()).toBe(false);
      expect(getElement('.profile-card')).toBeTruthy();
      expect(getElement('.user-name')?.textContent).toContain(MOCK_USER_NAME);
      expect(component.user()?.degreeid).toBe(1);
      expect(component.user()?.yearofstudy).toBe(2);
      expect(getElement('.profile-bio')?.textContent).toContain('A passionate learner.');
    }));

    // Other initial loading tests remain the same...

    it('should compute user modules correctly', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      const modules = component.userModules();
      expect(modules.length).toBe(2);
      expect(modules[0].courseCode).toBe('COMS101');
      expect(modules[1].courseCode).toBe('MATH101');
    }));
  });

  describe('Error Handling', () => {
    it('should stop loading and log error if auth fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.reject(new Error('Auth Error')));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error initializing profile:', jasmine.any(Error));
      expect(component.isLoading()).toBe(false);
      expect(getElement('.profile-card')).toBeFalsy();
    }));
    // Other error handling tests remain the same...
  });

  describe('Editing Functionality', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should start editing mode and populate edit signals', () => {
      component.startEditing();

      expect(component.isEditing()).toBe(true);
      expect(component.editedDegreeId()).toBe(1);
      expect(component.editedYearOfStudy()).toBe(2);
      expect(component.editedBio()).toBe('A passionate learner.');
      expect(component.editedSelectedModuleCodes()).toEqual(['COMS101', 'MATH101']);
    });

    // ✅ FIX: Tests for async saveChanges method
    it('should save user details, add a course, and remove a course', fakeAsync(() => {
      component.startEditing();

      // Change user details
      component.editedDegreeId.set(2);
      component.editedBio.set('Updated bio');

      // Change courses: remove MATH101, add PSYC201
      component.editedSelectedModuleCodes.set(['COMS101', 'PSYC201']);

      // Act
      component.saveChanges();
      tick(); // Let async operations complete

      // Assert API calls
      expect(userApiService.patchUser).toHaveBeenCalledTimes(1);
      expect(userApiService.patchUser).toHaveBeenCalledWith(MOCK_USER_ID, jasmine.objectContaining({
        degreeid: 2,
        bio: 'Updated bio'
      }));

      expect(userApiService.deleteUserCourse).toHaveBeenCalledOnceWith(MOCK_USER_ID, 'MATH101');
      expect(userApiService.postUserCourse).toHaveBeenCalledOnceWith(MOCK_USER_ID, 'PSYC201');

      // Assert state after re-initialization
      expect(component.isEditing()).toBe(false);
      expect(component.isSaving()).toBe(false);
    }));

    it('should only call API for courses if only courses are changed', fakeAsync(() => {
      component.startEditing();

      // Add PSYC201, keep others
      component.editedSelectedModuleCodes.set(['COMS101', 'MATH101', 'PSYC201']);

      component.saveChanges();
      tick();

      expect(userApiService.patchUser).not.toHaveBeenCalled();
      expect(userApiService.deleteUserCourse).not.toHaveBeenCalled();
      expect(userApiService.postUserCourse).toHaveBeenCalledOnceWith(MOCK_USER_ID, 'PSYC201');
    }));

    it('should make no API calls if nothing has changed', fakeAsync(() => {
      component.startEditing();
      // No changes made
      component.saveChanges();
      tick();

      expect(userApiService.patchUser).not.toHaveBeenCalled();
      expect(userApiService.deleteUserCourse).not.toHaveBeenCalled();
      expect(userApiService.postUserCourse).not.toHaveBeenCalled();
      expect(component.isEditing()).toBe(false); // Should still exit edit mode
    }));

    it('should handle errors during save and show an alert', fakeAsync(() => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      userApiService.patchUser.and.returnValue(throwError(() => new Error('API Save Error')));

      component.startEditing();
      component.editedBio.set('A failed update');

      component.saveChanges();
      tick();

      expect(component.isSaving()).toBe(false); // isSaving should be reset
      expect(component.isEditing()).toBe(true); // Should remain in edit mode on failure
      expect(console.error).toHaveBeenCalledWith('Error saving changes:', jasmine.any(Error));
      expect(window.alert).toHaveBeenCalledWith('An error occurred while saving changes. Please try again.');
    }));

    it('should cancel editing and revert changes', () => {
      component.startEditing();
      component.editedBio.set('Temporary bio change');

      component.cancelEdit();
      fixture.detectChanges();

      expect(component.isEditing()).toBe(false);
      expect(getElement('.profile-bio')?.textContent).toContain('A passionate learner.'); // Check if UI reverted
    });

    // Other editing helper tests remain the same...
  });

  // Helper Methods and Template Rendering tests remain the same...
});
