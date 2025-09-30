import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Profile, SafeHtmlPipe } from './profile';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { DomSanitizer } from '@angular/platform-browser';

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
};
const MOCK_USER_COURSES_API = { courses: ['COMS101', 'MATH101'] };
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
      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(getElement('.profile-card')).toBeTruthy();
      expect(component.user()?.name).toBe(MOCK_USER_NAME);
      expect(component.user()?.degreeid).toBe(1);
      expect(component.user()?.yearofstudy).toBe(2);
      expect(component.user()?.bio).toBe('A passionate learner.');
    }));

    it('should display loading state initially', () => {
      setupHappyPathMocks();
      component.isLoading.set(true);
      fixture.detectChanges();

      expect(getElement('.loading-overlay')).toBeTruthy();
      expect(getElement('.spinner')).toBeTruthy();
      expect(getElement('.loading-text')?.textContent).toContain('Loading Profile...');
    });

    it('should populate user stats from API', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const user = component.user();
      expect(user?.stats.length).toBe(4);
      expect(user?.stats[0].value).toBe('156h');
      expect(user?.stats[0].label).toBe('Study Hours');
      expect(user?.stats[1].value).toBe('12');
      expect(user?.stats[1].label).toBe('Study Partners');
      expect(user?.stats[2].value).toBe('42');
      expect(user?.stats[2].label).toBe('Topics Completed');
      expect(user?.stats[3].value).toBe('23');
      expect(user?.stats[3].label).toBe('Total Sessions');
    }));

    it('should handle non-array user response from API', fakeAsync(() => {
      setupHappyPathMocks();
      userApiService.getUserById.and.returnValue(of(MOCK_USER_PROFILE_API));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.user()?.degreeid).toBe(1);
    }));

    it('should handle null stats response gracefully', fakeAsync(() => {
      setupHappyPathMocks();
      userApiService.getUserStats.and.returnValue(of(null));

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.user()?.stats.length).toBe(0);
    }));

    it('should set user initials correctly', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.user()?.initials).toBe('JD');
    }));

    it('should set university to Wits University', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.user()?.university).toBe('Wits University');
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
    }));

    it('should handle missing user ID from auth', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error initializing profile:', jasmine.any(Error));
      expect(component.isLoading()).toBe(false);
    }));

    it('should load successfully with partial data if stats API fails', fakeAsync(() => {
      setupHappyPathMocks();
      userApiService.getUserStats.and.returnValue(throwError(() => new Error('Stats API Down')));

      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
      expect(component.user()?.stats.length).toBe(0);
      expect(component.user()?.name).toBe(MOCK_USER_NAME);
    }));

    it('should handle API errors for getUserById gracefully', fakeAsync(() => {
      setupHappyPathMocks();
      userApiService.getUserById.and.returnValue(throwError(() => new Error('User API Error')));

      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
    }));

    it('should handle API errors for getUserCourses gracefully', fakeAsync(() => {
      setupHappyPathMocks();
      userApiService.getUserCourses.and.returnValue(throwError(() => new Error('Courses API Error')));

      fixture.detectChanges();
      tick();

      expect(component.userCourses().length).toBe(0);
    }));

    it('should handle API errors for getAllDegrees gracefully', fakeAsync(() => {
      setupHappyPathMocks();
      academicApiService.getAllDegrees.and.returnValue(throwError(() => new Error('Degrees API Error')));

      fixture.detectChanges();
      tick();

      expect(component.availableDegrees().length).toBe(0);
    }));

    it('should handle API errors for getAllModules gracefully', fakeAsync(() => {
      setupHappyPathMocks();
      academicApiService.getAllModules.and.returnValue(throwError(() => new Error('Modules API Error')));

      fixture.detectChanges();
      tick();

      expect(component.allAvailableModules().length).toBe(0);
    }));

    it('should handle forkJoin subscription error', fakeAsync(() => {
      setupHappyPathMocks();
      spyOn(console, 'error');

      // Force an error in the subscription
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: { id: MOCK_USER_ID } } } as any));
      userService.getUserById.and.returnValue(Promise.resolve({ id: MOCK_USER_ID, name: MOCK_USER_NAME } as any));
      userApiService.getUserById.and.returnValue(throwError(() => new Error('Fatal error')));

      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
    }));
  });

  describe('Computed Signals', () => {
    it('should compute user degree name correctly', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      expect(component.userDegreeName()).toBe('BSc Computer Science');
    }));

    it('should return "..." for degree name when user is null', () => {
      component.user.set(null);
      expect(component.userDegreeName()).toBe('...');
    });

    it('should return "Unknown Degree" when degree not found', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      component.user.update(u => u ? { ...u, degreeid: 999 } : null);
      expect(component.userDegreeName()).toBe('Unknown Degree');
    }));

    it('should compute user modules correctly', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      const modules = component.userModules();
      expect(modules.length).toBe(2);
      expect(modules[0].courseCode).toBe('COMS101');
      expect(modules[1].courseCode).toBe('MATH101');
    }));

    it('should return empty array for user modules when user is null', () => {
      component.user.set(null);
      expect(component.userModules()).toEqual([]);
    });

    it('should filter modules based on search term', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      component.moduleSearchTerm.set('psyc');
      const filtered = component.filteredModules();
      expect(filtered.length).toBe(1);
      expect(filtered[0].courseCode).toBe('PSYC201');
    }));

    it('should filter modules by course code', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      component.moduleSearchTerm.set('MATH');
      const filtered = component.filteredModules();
      expect(filtered.length).toBe(1);
      expect(filtered[0].courseCode).toBe('MATH101');
    }));

    it('should return all modules when search term is empty', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      component.moduleSearchTerm.set('');
      expect(component.filteredModules().length).toBe(3);
    }));

    it('should trim search term for filtering', fakeAsync(() => {
      setupHappyPathMocks();

      fixture.detectChanges();
      tick();

      component.moduleSearchTerm.set('  PSYC  ');
      const filtered = component.filteredModules();
      expect(filtered.length).toBe(1);
    }));
  });

  describe('Editing Functionality', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should start editing mode', () => {
      component.startEditing();

      expect(component.isEditing()).toBe(true);
      expect(component.editedDegreeId()).toBe(1);
      expect(component.editedYearOfStudy()).toBe(2);
      expect(component.editedBio()).toBe('A passionate learner.');
      expect(component.editedSelectedModuleCodes()).toEqual(['COMS101', 'MATH101']);
      expect(component.moduleSearchTerm()).toBe('');
    });

    it('should not start editing when user is null', () => {
      component.user.set(null);
      component.startEditing();

      expect(component.isEditing()).toBe(false);
    });

    it('should save changes correctly', () => {
      component.startEditing();
      component.editedDegreeId.set(2);
      component.editedYearOfStudy.set(3);
      component.editedBio.set('Updated bio');
      component.editedSelectedModuleCodes.set(['PSYC201']);

      spyOn(console, 'log');
      component.saveChanges();

      const user = component.user();
      expect(user?.degreeid).toBe(2);
      expect(user?.yearofstudy).toBe(3);
      expect(user?.bio).toBe('Updated bio');
      expect(component.userCourses().length).toBe(1);
      expect(component.userCourses()[0].courseCode).toBe('PSYC201');
      expect(component.isEditing()).toBe(false);
      expect(console.log).toHaveBeenCalled();
    });

    it('should not save changes when user is null', () => {
      component.user.set(null);
      component.saveChanges();

      expect(component.isEditing()).toBe(false);
    });

    it('should cancel editing', () => {
      component.startEditing();
      component.editedBio.set('Changed bio');
      component.cancelEdit();

      expect(component.isEditing()).toBe(false);
      expect(component.user()?.bio).toBe('A passionate learner.');
    });

    it('should check if module is selected', () => {
      component.editedSelectedModuleCodes.set(['COMS101', 'MATH101']);

      expect(component.isModuleSelected('COMS101')).toBe(true);
      expect(component.isModuleSelected('PSYC201')).toBe(false);
    });

    it('should add module when checkbox is checked', () => {
      component.editedSelectedModuleCodes.set(['COMS101']);
      const event = { target: { checked: true } } as any;

      component.onModuleSelectionChange(event, 'PSYC201');

      expect(component.editedSelectedModuleCodes()).toContain('PSYC201');
      expect(component.editedSelectedModuleCodes().length).toBe(2);
    });

    it('should remove module when checkbox is unchecked', () => {
      component.editedSelectedModuleCodes.set(['COMS101', 'MATH101']);
      const event = { target: { checked: false } } as any;

      component.onModuleSelectionChange(event, 'COMS101');

      expect(component.editedSelectedModuleCodes()).not.toContain('COMS101');
      expect(component.editedSelectedModuleCodes().length).toBe(1);
    });
  });

  describe('Helper Methods', () => {
    it('should get initials for two-word name', () => {
      expect(component.getInitials('John Doe')).toBe('JD');
    });

    it('should get initials for single name', () => {
      expect(component.getInitials('Madonna')).toBe('M');
    });

    it('should get initials for three-word name (first and last)', () => {
      expect(component.getInitials('John Paul Jones')).toBe('JJ');
    });

    it('should return "?" for empty name', () => {
      expect(component.getInitials('')).toBe('?');
    });

    it('should convert initials to uppercase', () => {
      expect(component.getInitials('john doe')).toBe('JD');
    });
  });

  describe('Template Rendering', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should display user name', () => {
      const nameElement = getElement('.user-name');
      expect(nameElement?.textContent).toContain('Jane Doe');
    });

    it('should display degree and year', () => {
      const profileInfo = getElement('.profile-info');
      expect(profileInfo?.textContent).toContain('BSc Computer Science');
      expect(profileInfo?.textContent).toContain('Year 2');
    });

    it('should display university', () => {
      const locationInfo = getElement('.location-info');
      expect(locationInfo?.textContent).toContain('Wits University');
    });

    it('should display bio', () => {
      const bioElement = getElement('.profile-bio');
      expect(bioElement?.textContent).toContain('A passionate learner.');
    });

    it('should display user modules', () => {
      const subjectTags = getAllElements('.subject-tag');
      expect(subjectTags.length).toBe(2);
      expect(subjectTags[0].textContent).toContain('COMS101');
    });

    it('should display "No subjects" message when no modules', fakeAsync(() => {
      userApiService.getUserCourses.and.returnValue(of({ courses: [] }));
      component.ngOnInit();
      tick();
      fixture.detectChanges();

      const emptyState = getElement('.empty-state-text');
      expect(emptyState?.textContent).toContain('No subjects selected yet.');
    }));

    it('should display stats', () => {
      const statCards = getAllElements('.stat-card');
      expect(statCards.length).toBe(4);
      expect(statCards[0].textContent).toContain('156h');
      expect(statCards[1].textContent).toContain('12');
    });

    it('should show edit button when not editing', () => {
      expect(getElement('.edit-profile-button')).toBeTruthy();
      expect(getElement('.save-button')).toBeFalsy();
    });

    it('should show save and cancel buttons when editing', () => {
      component.startEditing();
      fixture.detectChanges();

      expect(getElement('.save-button')).toBeTruthy();
      expect(getElement('.cancel-button')).toBeTruthy();
      expect(getElement('.edit-profile-button')).toBeFalsy();
    });

    it('should show degree dropdown in edit mode', () => {
      component.startEditing();
      fixture.detectChanges();

      const select = getElement('select.edit-input');
      expect(select).toBeTruthy();
    });

    it('should show year input in edit mode', () => {
      component.startEditing();
      fixture.detectChanges();

      const input = getElement('input[type="number"]');
      expect(input).toBeTruthy();
    });

    it('should show bio textarea in edit mode', () => {
      component.startEditing();
      fixture.detectChanges();

      expect(getElement('.bio-textarea')).toBeTruthy();
      expect(getElement('.profile-bio')).toBeFalsy();
    });

    it('should show module search in edit mode', () => {
      component.startEditing();
      fixture.detectChanges();

      expect(getElement('.module-search-input')).toBeTruthy();
    });

    it('should show module checkboxes in edit mode', () => {
      component.startEditing();
      fixture.detectChanges();

      const checkboxes = getAllElements('.module-checkbox-label input[type="checkbox"]');
      expect(checkboxes.length).toBe(3);
    });

    it('should show empty state when no modules match search', () => {
      component.startEditing();
      component.moduleSearchTerm.set('NONEXISTENT');
      fixture.detectChanges();

      const emptyState = getElement('.empty-state-text');
      expect(emptyState?.textContent).toContain('No modules found matching your search.');
    });
  });
});
