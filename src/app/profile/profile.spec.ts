import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, forkJoin, Observable } from 'rxjs';

import { Profile, SafeHtmlPipe } from './profile'; // Removed .ts extension
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';

// --- INTERFACES (copied from .ts file for mock data) ---
interface Module { courseCode: string; courseName: string; facultyid: string; }
interface Degree { degreeid: number; degree_name: string; degree_type: string; facultyid: number; }
interface UserCourse { userid: string; courseCode: string; }
interface UserStats { topicsCompleted: number; studyHours: number; studyPartners: number; totalSessions: number; }

// --- MOCK DATA ---
const MOCK_AUTH_RESULT = { data: { user: { id: 'user-123' } } };

const MOCK_SUPABASE_USER = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' }
};

const MOCK_API_USER = {
  userId: 'user-123',
  degreeid: 1,
  yearofstudy: 2,
  role: 'Student',
  status: 'Active',
  bio: 'This is a test bio.',
  profile_picture: 'http://example.com/pic.jpg',
};

const MOCK_COURSES: UserCourse[] = [
  { userid: 'user-123', courseCode: 'CS101' },
  { userid: 'user-123', courseCode: 'MATH101' },
];

const MOCK_DEGREES: Degree[] = [
  { degreeid: 1, degree_name: 'BSc Computer Science', degree_type: 'BSc', facultyid: 1 },
  { degreeid: 2, degree_name: 'BCom Informatics', degree_type: 'BCom', facultyid: 2 },
];

const MOCK_MODULES: Module[] = [
  { courseCode: 'CS101', courseName: 'Intro to CS', facultyid: '1' },
  { courseCode: 'MATH101', courseName: 'Calculus I', facultyid: '2' },
  { courseCode: 'PHYS101', courseName: 'Physics I', facultyid: '1' },
];

const MOCK_STATS: UserStats = {
  topicsCompleted: 5,
  studyHours: 42,
  studyPartners: 3,
  totalSessions: 10,
};

const MOCK_UPLOAD_RESPONSE = {
  imageUrl: 'http://example.com/new-pic.jpg'
};

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  let mockUserApiService: jasmine.SpyObj<UserApiService>;
  let mockAcademicApiService: jasmine.SpyObj<AcademicApiService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserService: jasmine.SpyObj<UserService>;

  // Helper to run full component initialization
  function initializeComponent(fixture: ComponentFixture<Profile>): void {
    fixture.detectChanges(); // triggers ngOnInit -> initializeProfile
    tick(); // resolves promises (auth, supabase user) and forkJoin
    fixture.detectChanges(); // updates view with data
  }

  beforeEach(async () => {
    // --- Create Spies ---
    mockUserApiService = jasmine.createSpyObj('UserApiService', [
      'getUserById', 'getUserCourses', 'getUserStats', 'uploadProfilePicture',
      'patchUser', 'deleteUserCourse', 'postUserCourse'
    ]);
    mockAcademicApiService = jasmine.createSpyObj('AcademicApiService', ['getAllDegrees', 'getAllModules']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUserById']);

    await TestBed.configureTestingModule({
      imports: [
        Profile, // Import the standalone component
        FormsModule,
        NoopAnimationsModule,
        SafeHtmlPipe, // Import the standalone pipe
      ],
      providers: [
        { provide: UserApiService, useValue: mockUserApiService },
        { provide: AcademicApiService, useValue: mockAcademicApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compileComponents();

    // --- Default "Happy Path" Mock Implementations ---
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(MOCK_AUTH_RESULT) as any);
    mockUserService.getUserById.and.returnValue(Promise.resolve(MOCK_SUPABASE_USER) as any);

    // Mocks for the forkJoin in fetchFullProfileData
    mockUserApiService.getUserById.and.returnValue(of([MOCK_API_USER] as any));
    mockUserApiService.getUserCourses.and.returnValue(of(MOCK_COURSES));
    mockAcademicApiService.getAllDegrees.and.returnValue(of(MOCK_DEGREES));
    mockAcademicApiService.getAllModules.and.returnValue(of(MOCK_MODULES));
    mockUserApiService.getUserStats.and.returnValue(of(MOCK_STATS));

    // Mocks for save/upload
    mockUserApiService.uploadProfilePicture.and.returnValue(of(MOCK_UPLOAD_RESPONSE));
    mockUserApiService.patchUser.and.returnValue(of({}));
    mockUserApiService.deleteUserCourse.and.returnValue(of({}));
    mockUserApiService.postUserCourse.and.returnValue(of({}));

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and Data Loading', () => {
    it('should show loader initially', () => {
      expect(component.isLoading()).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.loading-overlay')).toBeTruthy();
    });

    it('should fetch all profile data, set signals, and hide loader on init', fakeAsync(() => {
      initializeComponent(fixture);

      // Check service calls
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockUserService.getUserById).toHaveBeenCalledWith(MOCK_AUTH_RESULT.data.user.id);
      expect(mockUserApiService.getUserById).toHaveBeenCalledWith(MOCK_AUTH_RESULT.data.user.id);
      expect(mockUserApiService.getUserCourses).toHaveBeenCalledWith(MOCK_AUTH_RESULT.data.user.id);
      expect(mockAcademicApiService.getAllDegrees).toHaveBeenCalled();
      expect(mockAcademicApiService.getAllModules).toHaveBeenCalled();
      expect(mockUserApiService.getUserStats).toHaveBeenCalledWith(MOCK_AUTH_RESULT.data.user.id);

      // Check state
      expect(component.isLoading()).toBe(false);
      expect(fixture.nativeElement.querySelector('.loading-overlay')).toBeFalsy();
      expect(component.user()).not.toBeNull();

      // Check combined user data
      const user = component.user()!;
      expect(user.name).toBe(MOCK_SUPABASE_USER.name); // From Supabase
      expect(user.bio).toBe(MOCK_API_USER.bio);     // From API
      expect(user.stats.length).toBe(4);
      expect(user.stats[0].value).toBe(`${MOCK_STATS.studyHours}h`);

      // Check data signals
      expect(component.availableDegrees().length).toBe(MOCK_DEGREES.length);
      expect(component.allAvailableModules().length).toBe(MOCK_MODULES.length);
      expect(component.userCourses().length).toBe(MOCK_COURSES.length);
      expect(component.originalUserCourses()).toEqual(['CS101', 'MATH101']);
    }));

    it('should handle initialization error if auth fails', fakeAsync(() => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.reject(new Error('Auth Error')) as any);
      spyOn(console, 'error');

      fixture.detectChanges(); // ngOnInit
      tick(); // resolve promise rejection

      expect(component.isLoading()).toBe(false);
      expect(component.user()).toBeNull();
      expect(console.error).toHaveBeenCalledWith("Error initializing profile:", jasmine.any(Error));
    }));

    it('should handle initialization error if forkJoin fails', fakeAsync(() => {
      mockUserApiService.getUserById.and.returnValue(throwError(() => new Error('API Error')));
      spyOn(console, 'error');

      fixture.detectChanges(); // ngOnInit
      tick(); // resolve promises and forkJoin

      expect(component.isLoading()).toBe(false);
      expect(component.user()).toBeNull(); // User signal remains null
      expect(console.error).toHaveBeenCalledWith("Failed to fetch profile data", jasmine.any(Error));
    }));
  });

  describe('Computed Signals', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('userDegreeName should compute correctly', () => {
      expect(component.userDegreeName()).toBe('BSc Computer Science');
      // Test unknown
      component.user.update(u => ({ ...u!, degreeid: 999 }));
      expect(component.userDegreeName()).toBe('Unknown Degree');
    });

    it('userModules should compute correctly', () => {
      const modules = component.userModules();
      expect(modules.length).toBe(2);
      expect(modules.map(m => m.courseCode)).toEqual(['CS101', 'MATH101']);
    });

    it('filteredModules should filter by search term', () => {
      // Default
      expect(component.filteredModules().length).toBe(MOCK_MODULES.length);

      // Search by name
      component.moduleSearchTerm.set('physics');
      expect(component.filteredModules().length).toBe(1);
      expect(component.filteredModules()[0].courseCode).toBe('PHYS101');

      // Search by code
      component.moduleSearchTerm.set('cs1');
      expect(component.filteredModules().length).toBe(1);
      expect(component.filteredModules()[0].courseCode).toBe('CS101');
    });
  });

  describe('Editing Flow', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should enter edit mode and populate edit signals on startEditing()', () => {
      component.startEditing();

      expect(component.isEditing()).toBe(true);
      expect(component.editedBio()).toBe(MOCK_API_USER.bio);
      expect(component.editedDegreeId()).toBe(MOCK_API_USER.degreeid);
      expect(component.editedYearOfStudy()).toBe(MOCK_API_USER.yearofstudy);
      expect(component.editedSelectedModuleCodes()).toEqual(['CS101', 'MATH101']);
      expect(component.editedProfilePictureUrl()).toBe(MOCK_API_USER.profile_picture);
    });

    it('should exit edit mode on cancelEdit()', () => {
      component.startEditing();
      expect(component.isEditing()).toBe(true);
      component.cancelEdit();
      expect(component.isEditing()).toBe(false);
    });

    it('should handle file upload and set editedProfilePictureUrl on onFileSelected()', fakeAsync(() => {
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { target: { files: [mockFile] } } as any;

      component.onFileSelected(mockEvent);
      expect(component.isUploading()).toBe(true);

      tick(); // resolve upload promise

      expect(mockUserApiService.uploadProfilePicture).toHaveBeenCalledWith('user-123', mockFile);
      expect(component.isUploading()).toBe(false);
      expect(component.editedProfilePictureUrl()).toBe(MOCK_UPLOAD_RESPONSE.imageUrl);
    }));

    it('should save all changes (profile data, new pic, added/removed modules)', fakeAsync(() => {
      spyOn(component, 'initializeProfile').and.callThrough();
      component.startEditing();

      // 1. "Upload" a new picture
      component.editedProfilePictureUrl.set('new-pic-url.jpg');
      // 2. Change profile data
      component.editedBio.set('New Bio');
      component.editedDegreeId.set(2);
      // 3. Change modules (remove MATH101, add PHYS101)
      component.editedSelectedModuleCodes.set(['CS101', 'PHYS101']);

      component.saveChanges();
      expect(component.isSaving()).toBe(true);

      tick(); // resolve forkJoin

      // Check patch data
      const expectedPatchData = {
        degreeid: 2,
        yearofstudy: MOCK_API_USER.yearofstudy, // This one didn't change
        bio: 'New Bio',
        profile_picture: 'new-pic-url.jpg',
      };
      expect(mockUserApiService.patchUser).toHaveBeenCalledWith('user-123', expectedPatchData);

      // Check module changes
      expect(mockUserApiService.deleteUserCourse).toHaveBeenCalledWith('user-123', 'MATH101');
      expect(mockUserApiService.postUserCourse).toHaveBeenCalledWith('user-123', 'PHYS101');
      expect(mockUserApiService.deleteUserCourse).toHaveBeenCalledTimes(1);
      expect(mockUserApiService.postUserCourse).toHaveBeenCalledTimes(1);

      // Check final state
      expect(component.isSaving()).toBe(false);
      expect(component.isEditing()).toBe(false);
      expect(component.initializeProfile).toHaveBeenCalledTimes(2); // 1 on init, 1 on refresh
    }));

    it('should not call patchUser if only modules changed', fakeAsync(() => {
      component.startEditing();

      // Only change modules
      component.editedSelectedModuleCodes.set(['CS101', 'PHYS101']);

      component.saveChanges();
      tick();

      expect(mockUserApiService.patchUser).not.toHaveBeenCalled();
      expect(mockUserApiService.deleteUserCourse).toHaveBeenCalled();
      expect(mockUserApiService.postUserCourse).toHaveBeenCalled();
      expect(component.isEditing()).toBe(false);
    }));

    it('should handle save error and remain in edit mode', fakeAsync(() => {
      spyOn(component, 'initializeProfile').and.callThrough();
      mockUserApiService.patchUser.and.returnValue(throwError(() => new Error('Save Failed')));

      component.startEditing();
      component.editedBio.set('New Bio'); // Change data to trigger patch

      component.saveChanges();
      tick();

      expect(component.isSaving()).toBe(false);
      expect(component.isEditing()).toBe(true); // Should stay in edit mode
      expect(component.initializeProfile).toHaveBeenCalledTimes(1); // No refresh
    }));
  });
});
