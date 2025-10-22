import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError, firstValueFrom, forkJoin } from 'rxjs';

import { FindPartners, SafeHtmlPipe } from './findpartners'; // Adjust path if needed
import { ApiService } from '../services/findpartner.service';
import { UserApiService } from '../services/user.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { ChatService } from '../services/chat.service';

// --- INTERFACES (copied from .ts file for mock data) ---
interface User {
  userid: string;
  username: string | "unknown";
  email: string | "unknown";
  role: string;
  status: string;
  bio: string;
  degreeid: number;
  yearofstudy: number;
  profile_picture: string | null;
}
interface SupabaseUser { id: string; email: string; name: string; user_metadata: { [key: string]: any }; }
interface UserCourse { userid: string; courseCode: string; }
interface Module { courseCode: string; courseName: string; facultyid: number; }
interface Degree { degreeid: number; degree_name: string; degree_type: string; facultyid: string; }

// --- MOCK DATA ---
const MOCK_AUTH_RESULT = { data: { user: { id: 'user-1' } } };
const MOCK_CURRENT_USER: User = {
  userid: 'user-1',
  username: 'Current User',
  email: 'current@test.com',
  role: 'user',
  status: 'active',
  bio: 'I am the user.',
  degreeid: 101,
  yearofstudy: 2,
  profile_picture: null
};

const MOCK_PARTNERS: User[] = [
  { userid: 'user-2', username: 'Partner One', email: 'p1@test.com', role: 'user', status: 'active', bio: 'Bio 1', degreeid: 101, yearofstudy: 2, profile_picture: null },
  { userid: 'user-3', username: 'Partner Two', email: 'p2@test.com', role: 'user', status: 'active', bio: 'Bio 2', degreeid: 102, yearofstudy: 3, profile_picture: null },
  { userid: 'user-4', username: 'Partner Three', email: 'p3@test.com', role: 'user', status: 'active', bio: 'Bio 3', degreeid: 102, yearofstudy: 1, profile_picture: null },
  { userid: 'user-5', username: 'Inactive User', email: 'p4@test.com', role: 'user', status: 'inactive', bio: 'Bio 4', degreeid: 101, yearofstudy: 1, profile_picture: null },
  { userid: 'user-6', username: 'No Courses User', email: 'p5@test.com', role: 'user', status: 'active', bio: 'Bio 5', degreeid: 101, yearofstudy: 1, profile_picture: null },
];

const MOCK_DEGREES: Degree[] = [
  { degreeid: 101, degree_name: 'BSc Computer Science', degree_type: 'BSc', facultyid: '1' },
  { degreeid: 102, degree_name: 'BCom Informatics', degree_type: 'BCom', facultyid: '2' },
];

const MOCK_MODULES: Module[] = [
  { courseCode: 'CS101', courseName: 'Intro to CS', facultyid: 1 },
  { courseCode: 'CS102', courseName: 'Data Structures', facultyid: 1 },
  { courseCode: 'INF201', courseName: 'Advanced Java', facultyid: 2 },
];

const MOCK_USER_COURSES: UserCourse[] = [
  { userid: 'user-1', courseCode: 'CS101' }, // Current User
  { userid: 'user-1', courseCode: 'CS102' }, // Current User
  { userid: 'user-2', courseCode: 'CS101' }, // Partner One (1 shared)
  { userid: 'user-3', courseCode: 'CS102' }, // Partner Two (1 shared)
  { userid: 'user-3', courseCode: 'INF201' },// Partner Two
  { userid: 'user-4', courseCode: 'INF201' },// Partner Three (0 shared)
  // user-5 is inactive, user-6 has no courses
];

const MOCK_SUPABASE_USERS: SupabaseUser[] = [
  { id: 'user-1', email: 'current@test.com', name: 'Current User', user_metadata: {} },
  { id: 'user-2', email: 'p1@test.com', name: 'Partner One', user_metadata: {} },
  { id: 'user-3', email: 'p2@test.com', name: 'Partner Two', user_metadata: {} },
  { id: 'user-4', email: 'p3@test.com', name: 'Partner Three', user_metadata: {} },
  { id: 'user-5', email: 'p4@test.com', name: 'Inactive User', user_metadata: {} },
  { id: 'user-6', email: 'p5@test.com', name: 'No Courses User', user_metadata: {} },
];

const MOCK_USER_STATS = { studyHours: 10, studyPartners: 3 };

// --- MOCK SERVICES ---
class MockApiService {
  getDegree = () => of(MOCK_DEGREES);
  getModule = () => of(MOCK_MODULES);
  getAllUserCourses = () => of(MOCK_USER_COURSES);
  getUser = () => of([MOCK_CURRENT_USER, ...MOCK_PARTNERS]); // Return all PG users
}

class MockUserApiService {
  getUserStats = (userId: string) => of(MOCK_USER_STATS);
}

class MockAuthService {
  getCurrentUser = () => Promise.resolve(MOCK_AUTH_RESULT);
}

class MockUserService {
  getAllUsers = () => Promise.resolve(MOCK_SUPABASE_USERS);
}

class MockChatService {
  createChat = (users: any) => of({ chatId: 'new-chat-123' });
  setPartnerID = (id: string) => {};
  setActiveConversationStatus = (status: boolean) => {};
}

describe('FindPartners', () => {
  let component: FindPartners;
  let fixture: ComponentFixture<FindPartners>;
  let nativeElement: HTMLElement;
  let mockApiService: ApiService;
  let mockUserApiService: UserApiService;
  let mockAuthService: AuthService;
  let mockUserService: UserService;
  let mockChatService: ChatService;
  let mockRouter: Router;

  beforeEach(async () => {
    // Create spies for services
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDegree', 'getModule', 'getAllUserCourses', 'getUser']);
    const userApiServiceSpy = jasmine.createSpyObj('UserApiService', ['getUserStats']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getAllUsers']);
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['createChat', 'setPartnerID', 'setActiveConversationStatus']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        FindPartners, // Import the standalone component
        FormsModule,
        NoopAnimationsModule, // Disables animations
        HttpClientTestingModule, // Not strictly needed with mocks, but good practice
        SafeHtmlPipe, // Import the standalone pipe
      ],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: UserApiService, useValue: userApiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    // Setup mock implementations
    mockApiService = TestBed.inject(ApiService);
    (mockApiService.getDegree as jasmine.Spy).and.returnValue(of(MOCK_DEGREES));
    (mockApiService.getModule as jasmine.Spy).and.returnValue(of(MOCK_MODULES));
    (mockApiService.getAllUserCourses as jasmine.Spy).and.returnValue(of(MOCK_USER_COURSES));
    (mockApiService.getUser as jasmine.Spy).and.returnValue(of([MOCK_CURRENT_USER, ...MOCK_PARTNERS]));

    mockUserApiService = TestBed.inject(UserApiService);
    (mockUserApiService.getUserStats as jasmine.Spy).and.returnValue(of(MOCK_USER_STATS));

    mockAuthService = TestBed.inject(AuthService);
    (mockAuthService.getCurrentUser as jasmine.Spy).and.returnValue(Promise.resolve(MOCK_AUTH_RESULT));

    mockUserService = TestBed.inject(UserService);
    (mockUserService.getAllUsers as jasmine.Spy).and.returnValue(Promise.resolve(MOCK_SUPABASE_USERS));

    mockChatService = TestBed.inject(ChatService);
    (mockChatService.createChat as jasmine.Spy).and.returnValue(of({ chatId: 'new-chat-123' }));

    mockRouter = TestBed.inject(Router);

    fixture = TestBed.createComponent(FindPartners);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
  });

  // Helper function to initialize component data
  function initializeComponent(fixture: ComponentFixture<FindPartners>): void {
    fixture.detectChanges(); // triggers ngOnInit
    tick(); // resolves promises (auth, supabase users) and forkJoin
    fixture.detectChanges(); // updates view with data
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and Data Loading', () => {
    it('should show loading spinner initially', () => {
      expect(component.isLoading$.getValue()).toBe(true);
      fixture.detectChanges();
      expect(nativeElement.querySelector('.loading-overlay')).toBeTruthy();
    });

    it('should fetch all core data on init', fakeAsync(() => {
      initializeComponent(fixture);

      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockApiService.getDegree).toHaveBeenCalled();
      expect(mockApiService.getModule).toHaveBeenCalled();
      expect(mockApiService.getAllUserCourses).toHaveBeenCalled();
      expect(mockApiService.getUser).toHaveBeenCalled();
      expect(mockUserService.getAllUsers).toHaveBeenCalled();

      expect(component.isLoading$.getValue()).toBe(false);
      expect(nativeElement.querySelector('.loading-overlay')).toBeFalsy();
    }));

    it('should filter out current user, inactive users, and users with no courses', fakeAsync(() => {
      initializeComponent(fixture);

      // MOCK_PARTNERS has 5 users.
      // 'user-1' is current user (filtered)
      // 'user-5' is inactive (filtered)
      // 'user-6' has no courses (filtered)
      // Should be left with 'user-2', 'user-3', 'user-4'
      expect(component.allPartners.length).toBe(3);
      expect(component.allPartners.map(p => p.userid)).toEqual(['user-2', 'user-3', 'user-4']);
      expect(component.currentUser.getValue()?.userid).toBe('user-1');
    }));

    it('should set available degrees for filter based on found partners', fakeAsync(() => {
      initializeComponent(fixture);
      // Partners have degree IDs 101 and 102
      expect(component.availableDegreesForFilter.length).toBe(2);
      expect(component.availableDegreesForFilter.map(d => d.degreeid)).toEqual([101, 102]);
    }));

    it('should handle error during auth', fakeAsync(() => {
      (mockAuthService.getCurrentUser as jasmine.Spy).and.returnValue(Promise.reject(new Error('Auth failed')));

      fixture.detectChanges(); // ngOnInit
      tick(); // resolve promise rejection
      fixture.detectChanges();

      expect(component.isLoading$.getValue()).toBe(false);
      expect(mockApiService.getUser).not.toHaveBeenCalled();
      expect(nativeElement.querySelector('.loading-overlay')).toBeFalsy();
    }));

    it('should handle error during forkJoin (fetchCoreData)', fakeAsync(() => {
      (mockApiService.getDegree as jasmine.Spy).and.returnValue(throwError(() => new Error('DB Error')));

      fixture.detectChanges(); // ngOnInit
      tick(); // resolve promises and forkJoin (which will error)
      fixture.detectChanges();

      expect(component.isLoading$.getValue()).toBe(false);
      expect(component.allPartners.length).toBe(0);
      expect(nativeElement.querySelector('.loading-overlay')).toBeFalsy();
    }));
  });

  describe('Filtering and Sorting', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should calculate relevance score correctly', () => {
      const currentUser = MOCK_CURRENT_USER; // degree 101, courses CS101, CS102
      const partnerSameDegreeSharedCourse = MOCK_PARTNERS[0]; // user-2: degree 101, course CS101
      const partnerDiffDegreeSharedCourse = MOCK_PARTNERS[1]; // user-3: degree 102, course CS102
      const partnerDiffDegreeNoShared = MOCK_PARTNERS[2]; // user-4: degree 102, course INF201

      // user-2: 10 (same degree) + 2 (1 shared course) = 12
      expect(component.calculateRelevanceScore(partnerSameDegreeSharedCourse, currentUser)).toBe(12);
      // user-3: 0 (diff degree) + 2 (1 shared course) = 2
      expect(component.calculateRelevanceScore(partnerDiffDegreeSharedCourse, currentUser)).toBe(2);
      // user-4: 0 (diff degree) + 0 (0 shared courses) = 0
      expect(component.calculateRelevanceScore(partnerDiffDegreeNoShared, currentUser)).toBe(0);
    });

    it('should sort partners by relevance score (descending) by default', () => {
      // Scores: user-2 (12), user-3 (2), user-4 (0)
      expect(component.filteredAndSortedPartners.map(p => p.userid)).toEqual(['user-2', 'user-3', 'user-4']);
      expect(component.paginatedPartners.getValue().map(p => p.userid)).toEqual(['user-2', 'user-3', 'user-4']);
    });

    it('should filter by search term (name)', fakeAsync(() => {
      component.searchTerm$.next('Partner Two');
      tick(300); // debounce time
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(1);
      expect(component.filteredAndSortedPartners[0].userid).toBe('user-3');
      const cards = nativeElement.querySelectorAll('.partner-card');
      expect(cards.length).toBe(1);
      expect(cards[0].querySelector('h3')?.textContent).toContain('Partner Two');
    }));

    it('should filter by search term (course name)', fakeAsync(() => {
      component.searchTerm$.next('advanced java'); // Partner Two (user-3) has 'Advanced Java'
      tick(300); // debounce time
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(1);
      expect(component.filteredAndSortedPartners[0].userid).toBe('user-3');
    }));

    it('should filter by search term (degree name)', fakeAsync(() => {
      component.searchTerm$.next('computer science'); // Partner One (user-2)
      tick(300); // debounce time
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(1);
      expect(component.filteredAndSortedPartners[0].userid).toBe('user-2');
    }));

    it('should filter by degree dropdown', () => {
      component.selectedDegree$.next('102'); // BCom Informatics (user-3, user-4)
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(2);
      // user-3 (score 2) sorted before user-4 (score 0)
      expect(component.filteredAndSortedPartners.map(p => p.userid)).toEqual(['user-3', 'user-4']);
    });

    it('should combine search and degree filters', fakeAsync(() => {
      component.selectedDegree$.next('102'); // BCom Informatics (user-3, user-4)
      component.searchTerm$.next('Partner Three'); // user-4
      tick(300);
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(1);
      expect(component.filteredAndSortedPartners[0].userid).toBe('user-4');
    }));

    it('should show "No Partners Found" message when no results', fakeAsync(() => {
      component.searchTerm$.next('NonExistentSearchTerm');
      tick(300);
      fixture.detectChanges();

      expect(component.filteredAndSortedPartners.length).toBe(0);
      expect(nativeElement.querySelector('.no-results')).toBeTruthy();
      expect(nativeElement.querySelector('.no-results h3')?.textContent).toContain('No Partners Found');
    }));
  });

  describe('Pagination', () => {
    beforeEach(fakeAsync(() => {
      component.itemsPerPage = 2; // Override for easier testing
      initializeComponent(fixture);
      // 3 partners total, 2 per page = 2 total pages
    }));

    it('should display the first page and correct total pages', () => {
      expect(component.totalPages).toBe(2);
      expect(component.paginatedPartners.getValue().length).toBe(2);
      // user-2, user-3
      expect(component.paginatedPartners.getValue().map(p => p.userid)).toEqual(['user-2', 'user-3']);
      expect(component.currentPage$.getValue()).toBe(1);
    });

    it('should navigate to the next page', () => {
      spyOn(window, 'scrollTo');
      component.nextPage();
      fixture.detectChanges();

      expect(component.currentPage$.getValue()).toBe(2);
      expect(component.paginatedPartners.getValue().length).toBe(1);
      expect(component.paginatedPartners.getValue()[0].userid).toBe('user-4');
      // @ts-ignore
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('should navigate to the previous page', () => {
      component.setPage(2);
      fixture.detectChanges();
      expect(component.currentPage$.getValue()).toBe(2);

      component.previousPage();
      fixture.detectChanges();
      expect(component.currentPage$.getValue()).toBe(1);
      expect(component.paginatedPartners.getValue().length).toBe(2);
    });

    it('should disable "prev" button on first page', () => {
      expect(component.currentPage$.getValue()).toBe(1);
      const prevButton = nativeElement.querySelector('.pagination-container .page-item:first-child');
      expect(prevButton?.classList).toContain('disabled');
    });

    it('should disable "next" button on last page', () => {
      component.setPage(2);
      fixture.detectChanges();

      expect(component.currentPage$.getValue()).toBe(2);
      const nextButton = nativeElement.querySelector('.pagination-container .page-item:last-child');
      expect(nextButton?.classList).toContain('disabled');
    });
  });

  describe('Profile Modal', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should open modal when viewProfile is called', () => {
      expect(component.selectedPartner.getValue()).toBeNull();
      expect(nativeElement.querySelector('.profile-modal-overlay')).toBeFalsy();

      const partnerToView = component.allPartners[0]; // Partner One (user-2)
      component.viewProfile(partnerToView);
      fixture.detectChanges();

      expect(component.selectedPartner.getValue()).toBe(partnerToView);
      const modal = nativeElement.querySelector('.profile-modal-overlay');
      expect(modal).toBeTruthy();
      expect(modal?.querySelector('.user-name')?.textContent).toContain('Partner One');
    });

    it('should fetch partner stats when opening modal', () => {
      const partnerToView = component.allPartners[0];
      component.viewProfile(partnerToView);

      expect(component.isProfileLoading$.getValue()).toBe(true);
      expect(mockUserApiService.getUserStats).toHaveBeenCalledWith(partnerToView.userid);

      fixture.detectChanges(); // after stats observable resolves
      expect(component.isProfileLoading$.getValue()).toBe(false);
      expect(component.partnerStats.getValue().length).toBe(2);
      expect(component.partnerStats.getValue()[0].label).toBe('Study Hours');
    });

    it('should close modal on closeProfile()', () => {
      component.viewProfile(component.allPartners[0]);
      fixture.detectChanges();
      expect(nativeElement.querySelector('.profile-modal-overlay')).toBeTruthy();

      component.closeProfile();
      fixture.detectChanges();

      expect(component.selectedPartner.getValue()).toBeNull();
      expect(nativeElement.querySelector('.profile-modal-overlay')).toBeFalsy();
    });

    it('should close modal on overlay click', () => {
      spyOn(component, 'closeProfile');
      component.viewProfile(component.allPartners[0]);
      fixture.detectChanges();

      const overlay = nativeElement.querySelector('.profile-modal-overlay') as HTMLElement;
      overlay.click();

      expect(component.closeProfile).toHaveBeenCalled();
    });

    it('should not close modal on card click', () => {
      spyOn(component, 'closeProfile');
      component.viewProfile(component.allPartners[0]);
      fixture.detectChanges();

      const modalCard = nativeElement.querySelector('.profile-modal-card') as HTMLElement;
      modalCard.click(); // This click should be stopped by $event.stopPropagation()

      expect(component.closeProfile).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should call chatService and navigate on messageOnClick', fakeAsync(() => {
      const partnerToMessage = component.allPartners[0]; // user-2
      component.messageOnClick(partnerToMessage);
      tick(); // resolve firstValueFrom
      fixture.detectChanges();

      expect(mockChatService.createChat).toHaveBeenCalledWith({
        user1: { userid: MOCK_CURRENT_USER.userid },
        user2: { userid: partnerToMessage.userid }
      });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/chat']);
      expect(mockChatService.setPartnerID).toHaveBeenCalledWith(partnerToMessage.userid);
      expect(mockChatService.setActiveConversationStatus).toHaveBeenCalledWith(true);
    }));

    it('should set loading and disabled states during navigation', fakeAsync(() => {
      const partnerToMessage = component.allPartners[0];

      expect(component.isNavigating$.getValue()).toBe(false);
      expect(component.isButtonDisabled).toBe(false);

      component.messageOnClick(partnerToMessage);

      expect(component.isNavigating$.getValue()).toBe(true);
      expect(component.isButtonDisabled).toBe(true);

      tick(); // resolve chat creation
      fixture.detectChanges();

      expect(component.isNavigating$.getValue()).toBe(false);
      expect(component.isButtonDisabled).toBe(false);
    }));

    it('should handle error during chat creation', fakeAsync(() => {
      (mockChatService.createChat as jasmine.Spy).and.returnValue(throwError(() => new Error('Chat failed')));
      const partnerToMessage = component.allPartners[0];

      component.messageOnClick(partnerToMessage);
      tick();
      fixture.detectChanges();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(component.isNavigating$.getValue()).toBe(false);
      expect(component.isButtonDisabled).toBe(false);
    }));
  });

  describe('Helper Methods', () => {
    it('getDegreeName should return name or "..."', () => {
      component.degrees = MOCK_DEGREES;
      expect(component.getDegreeName(101)).toBe('BSc Computer Science');
      expect(component.getDegreeName(999)).toBe('...');
    });

    it('getPartnerCourses should return correct modules', () => {
      component.userCourses = MOCK_USER_COURSES;
      component.modules = MOCK_MODULES;
      const partnerCourses = component.getPartnerCourses('user-3'); // Has CS102, INF201
      expect(partnerCourses.length).toBe(2);
      expect(partnerCourses.map(c => c.courseCode)).toEqual(['CS102', 'INF201']);
    });

    it('getInitials should return correct initials', () => {
      expect(component.getInitials('Test User')).toBe('TU');
      expect(component.getInitials('Test')).toBe('T');
      expect(component.getInitials(' test user ')).toBe('TU');
      expect(component.getInitials('Test Middle User')).toBe('TU');
      expect(component.getInitials('')).toBe('?');
      expect(component.getInitials(' ')).toBe('?');
    });

    it('getYearOfStudy should format year correctly', () => {
      expect(component.getYearOfStudy(1)).toBe('1st Year');
      expect(component.getYearOfStudy(2)).toBe('2nd Year');
      expect(component.getYearOfStudy(3)).toBe('3rd Year');
      expect(component.getYearOfStudy(4)).toBe('4th Year');
      expect(component.getYearOfStudy(21)).toBe('21st Year');
      expect(component.getYearOfStudy(22)).toBe('22nd Year');
    });
  });
});
