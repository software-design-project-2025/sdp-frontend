import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
];
const MOCK_MODULES = [
  { courseCode: 'COMS101', courseName: 'Intro to Programming', facultyid: '101' },
];
const MOCK_USER_PROFILE_API = {
  degreeid: 1,
  yearofstudy: 2,
  role: 'Student',
  status: 'Active',
  bio: 'A passionate learner.',
};
const MOCK_USER_COURSES_API = { courses: ['COMS101'] };
const MOCK_USER_STATS_API = { topicsCompleted: 42, studyHours: 156, studyPartners: 12, totalSessions: 23 };


describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let userApiService: jasmine.SpyObj<UserApiService>;
  let academicApiService: jasmine.SpyObj<AcademicApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;

  const getElement = (selector: string): HTMLElement | null => fixture.debugElement.query(By.css(selector))?.nativeElement;

  beforeEach(async () => {
    const userApiSpy = jasmine.createSpyObj('UserApiService', ['getUserById', 'getUserCourses', 'getUserStats']);
    const academicApiSpy = jasmine.createSpyObj('AcademicApiService', ['getAllDegrees', 'getAllModules']);
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userSpy = jasmine.createSpyObj('UserService', ['getUserById']);

    await TestBed.configureTestingModule({
      imports: [Profile],
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
    userApiService.getUserById.and.returnValue(of([MOCK_USER_PROFILE_API]));
    userApiService.getUserCourses.and.returnValue(of(MOCK_USER_COURSES_API));
    userApiService.getUserStats.and.returnValue(of(MOCK_USER_STATS_API));
    academicApiService.getAllDegrees.and.returnValue(of(MOCK_DEGREES));
    academicApiService.getAllModules.and.returnValue(of(MOCK_MODULES));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial Data Loading', () => {
    it('should fetch all necessary data on init', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(userApiService.getUserStats).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(component.isLoading()).toBe(false);
    }));
  });

  describe('Error Handling', () => {
    it('should stop loading and log error if auth fails', fakeAsync(() => {
      // FIX: Reject with a proper Error object to match the assertion
      authService.getCurrentUser.and.returnValue(Promise.reject(new Error('Auth Error')));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error initializing profile:', jasmine.any(Error));
      expect(component.isLoading()).toBe(false);
      expect(getElement('.profile-card')).toBeFalsy();
    }));

    // FIX: This test is renamed and rewritten to correctly test the component's resilient behavior.
    it('should load successfully with partial data if an inner API call fails', fakeAsync(() => {
      setupHappyPathMocks();
      // Make the stats API call fail
      userApiService.getUserStats.and.returnValue(throwError(() => new Error('Stats API Down')));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      // The component should NOT log a "Failed to fetch" error because catchError handles it
      expect(console.error).not.toHaveBeenCalledWith('Failed to fetch profile data', jasmine.any(Error));

      // The component should still finish loading
      expect(component.isLoading()).toBe(false);

      // Data from the failed stream should be missing (stats array will be empty)
      expect(component.user()?.stats.length).toBe(0);

      // Data from successful streams should still be present
      expect(component.user()?.name).toBe(MOCK_USER_NAME);
    }));
  });
});
