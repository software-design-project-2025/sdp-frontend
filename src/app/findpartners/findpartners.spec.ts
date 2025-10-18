import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { FindPartners } from './findpartners';
import { ApiService } from '../services/findpartner.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { ChatService } from '../services/chat.service';
import { UserApiService } from '../services/user.service';

// --- MOCK DATA ---
const mockLoggedInUser = { data: { user: { id: 'user-1' } } };

const mockSupabaseUsers = [
  { id: 'user-1', email: 'me@test.com', name: 'Me', user_metadata: {} },
  { id: 'user-2', email: 'alice@test.com', name: 'Alice', user_metadata: {} },
  { id: 'user-3', email: 'bob@test.com', name: 'Bob', user_metadata: {} },
  { id: 'user-4', email: 'charlie@test.com', name: 'Charlie', user_metadata: {} },
  { id: 'user-5', email: 'diana@test.com', name: 'Diana', user_metadata: {} },
  { id: 'user-6', email: 'eve@test.com', name: 'Eve', user_metadata: {} },
];

const mockDbPartners = [
  { userid: 'user-1', username: 'Me', email: 'me@test.com', role: 'student', bio: 'Current user', degreeid: 101, yearofstudy: 2, status: 'active' },
  { userid: 'user-2', username: 'Alice', email: 'alice@test.com', role: 'student', bio: 'Loves Angular', degreeid: 101, yearofstudy: 2, status: 'active' },
  { userid: 'user-3', username: 'Bob', email: 'bob@test.com', role: 'student', bio: 'Expert in RxJS', degreeid: 102, yearofstudy: 3, status: 'active' },
  { userid: 'user-4', username: 'Charlie', email: 'charlie@test.com', role: 'student', bio: 'Wants to study AI', degreeid: 101, yearofstudy: 2, status: 'inactive' },
  { userid: 'user-5', username: 'Diana', email: 'diana@test.com', role: 'student', bio: 'First year student', degreeid: 101, yearofstudy: 0, status: 'active' },
  { userid: 'user-6', username: 'Eve', email: 'eve@test.com', role: 'student', bio: 'No courses', degreeid: 101, yearofstudy: 1, status: 'active' },
];

const mockDegrees = [
  { degreeid: 101, degree_name: 'Computer Science', degree_type: 'BSc', facultyid: '1' },
  { degreeid: 102, degree_name: 'Data Science', degree_type: 'BSc', facultyid: '1' },
  { degreeid: 103, degree_name: 'Mathematics', degree_type: 'BSc', facultyid: '1' },
];

const mockModules = [
  { courseCode: 'CS101', courseName: 'Intro to Programming', facultyid: 1 },
  { courseCode: 'CS102', courseName: 'Data Structures', facultyid: 1 },
  { courseCode: 'DS202', courseName: 'Machine Learning Basics', facultyid: 1 },
];

const mockUserCourses = [
  { userid: 'user-1', courseCode: 'CS101' },
  { userid: 'user-1', courseCode: 'CS102' },
  { userid: 'user-2', courseCode: 'CS101' },
  { userid: 'user-2', courseCode: 'CS102' },
  { userid: 'user-3', courseCode: 'DS202' },
];

const mockUserStats = { studyHours: 42, studyPartners: 5 };
const mockChat = { chatid: 'chat-123' };

describe('FindPartners', () => {
  let component: FindPartners;
  let fixture: ComponentFixture<FindPartners>;
  let apiService: jasmine.SpyObj<ApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let chatService: jasmine.SpyObj<ChatService>;
  let userApiService: jasmine.SpyObj<UserApiService>;
  let router: Router;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDegree', 'getModule', 'getAllUserCourses', 'getUser']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getAllUsers']);
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['createChat', 'setPartnerID']);
    const userApiServiceSpy = jasmine.createSpyObj('UserApiService', ['getUserStats']);

    await TestBed.configureTestingModule({
      imports: [FindPartners, FormsModule, RouterTestingModule.withRoutes([{ path: 'chat', children: [] }])],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: UserApiService, useValue: userApiServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FindPartners);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    chatService = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    router = TestBed.inject(Router);
  });

  function setupHappyPathMocks() {
    authService.getCurrentUser.and.returnValue(Promise.resolve(mockLoggedInUser as any));
    apiService.getDegree.and.returnValue(of(mockDegrees as any));
    apiService.getModule.and.returnValue(of(mockModules as any));
    apiService.getAllUserCourses.and.returnValue(of(mockUserCourses as any));
    apiService.getUser.and.returnValue(of(mockDbPartners as any));
    userService.getAllUsers.and.returnValue(Promise.resolve(mockSupabaseUsers as any));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and Data Loading', () => {
    it('should fetch, merge, and filter data on init', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      // Should filter out: self (user-1), inactive (user-4), yearofstudy=0 (user-5), no courses (user-6)
      expect(component.filteredAndSortedPartners.length).toBe(2); // Alice and Bob
      expect(component.isLoading$.value).toBeFalse();
    }));

    it('should handle when current user has no user ID', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      spyOn(console, 'error');

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error initializing component:', jasmine.any(Error));
      expect(component.isLoading$.value).toBeFalse();
    }));

    it('should handle error when getCurrentUser fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.reject('Auth error'));
      spyOn(console, 'error');

      component.ngOnInit();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error initializing component:', 'Auth error');
      expect(component.isLoading$.value).toBeFalse();
    }));

    it('should handle errors in fetchCoreData observables', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve(mockLoggedInUser as any));
      apiService.getDegree.and.returnValue(throwError(() => new Error('Degree fetch failed')));
      apiService.getModule.and.returnValue(throwError(() => new Error('Module fetch failed')));
      apiService.getAllUserCourses.and.returnValue(of(mockUserCourses as any));
      apiService.getUser.and.returnValue(of(mockDbPartners as any));
      userService.getAllUsers.and.returnValue(Promise.resolve(mockSupabaseUsers as any));

      fixture.detectChanges();
      tick();

      expect(component.degrees.length).toBe(0);
      expect(component.modules.length).toBe(0);
      expect(component.isLoading$.value).toBeFalse();
    }));
  });

  describe('After Initialization', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
    }));

    describe('Filtering and Sorting', () => {
      it('should filter by search term matching username', fakeAsync(() => {
        component.searchTerm$.next('alice');
        tick(300); // debounce

        expect(component.filteredAndSortedPartners.length).toBe(1);
        expect(component.filteredAndSortedPartners[0].username).toBe('Alice');
      }));

      it('should filter by search term matching degree name', fakeAsync(() => {
        component.searchTerm$.next('data science');
        tick(300);

        expect(component.filteredAndSortedPartners.length).toBe(1);
        expect(component.filteredAndSortedPartners[0].username).toBe('Bob');
      }));

      it('should filter by search term matching course name', fakeAsync(() => {
        component.searchTerm$.next('machine learning');
        tick(300);

        expect(component.filteredAndSortedPartners.length).toBe(1);
        expect(component.filteredAndSortedPartners[0].username).toBe('Bob');
      }));

      it('should filter by degree', fakeAsync(() => {
        component.selectedDegree$.next('102');
        tick();

        expect(component.filteredAndSortedPartners.length).toBe(1);
        expect(component.filteredAndSortedPartners[0].username).toBe('Bob');
      }));

      it('should combine search and degree filters', fakeAsync(() => {
        component.selectedDegree$.next('101');
        tick();
        component.searchTerm$.next('alice');
        tick(300);

        expect(component.filteredAndSortedPartners.length).toBe(1);
        expect(component.filteredAndSortedPartners[0].username).toBe('Alice');
      }));

      it('should sort partners by relevance (same degree + shared courses)', fakeAsync(() => {
        tick();

        // Alice should rank higher than Bob because:
        // - Alice has same degree (101) as current user: +10 points
        // - Alice shares 2 courses with current user: +4 points (2 * 2)
        // - Bob has different degree (102): 0 points
        // - Bob shares 0 courses: 0 points
        expect(component.filteredAndSortedPartners[0].username).toBe('Alice');
        expect(component.filteredAndSortedPartners[1].username).toBe('Bob');
      }));

      it('should reset to page 1 when filters change', fakeAsync(() => {
        component.currentPage$.next(2);
        tick();

        component.searchTerm$.next('test');
        tick(300);

        expect(component.currentPage$.value).toBe(1);
      }));

      it('should return early from applyFiltersAndSort if current user is null', () => {
        component['currentUser'].next(null);
        const lengthBefore = component.filteredAndSortedPartners.length;

        component.applyFiltersAndSort();

        expect(component.filteredAndSortedPartners.length).toBe(lengthBefore);
      });
    });

    describe('Pagination', () => {
      beforeEach(() => {
        // Create more partners to test pagination
        const manyPartners = Array.from({ length: 25 }, (_, i) => ({
          userid: `user-${i + 10}`,
          username: `User ${i + 10}`,
          email: `user${i + 10}@test.com`,
          role: 'student',
          status: 'active',
          bio: 'Test bio',
          degreeid: 101,
          yearofstudy: 2,
        }));
        component['allPartners'] = manyPartners as any;
        component.applyFiltersAndSort();
      });

      it('should calculate total pages correctly', () => {
        expect(component.totalPages).toBe(3); // 25 partners / 9 per page = 3 pages
      });

      it('should paginate results correctly', () => {
        expect(component.paginatedPartners.value.length).toBe(9);
      });

      it('should navigate to next page', () => {
        component.nextPage();
        expect(component.currentPage$.value).toBe(2);
      });

      it('should navigate to previous page', () => {
        component.currentPage$.next(2);
        component.previousPage();
        expect(component.currentPage$.value).toBe(1);
      });

      it('should not go below page 1', () => {
        component.currentPage$.next(1);
        component.previousPage();
        expect(component.currentPage$.value).toBe(1);
      });

      it('should not exceed total pages', () => {
        component.nextPage();
        component.nextPage();
        component.nextPage(); // Try to go to page 4
        expect(component.currentPage$.value).toBe(3);
      });

      it('should not set invalid page numbers', () => {
        component.setPage(0);
        expect(component.currentPage$.value).toBe(1);

        component.setPage(999);
        expect(component.currentPage$.value).toBe(1);
      });
    });

    describe('Modal and Profile', () => {
      it('should open profile modal and load stats', fakeAsync(() => {
        userApiService.getUserStats.and.returnValue(of(mockUserStats as any));
        const partner = component.filteredAndSortedPartners[0];

        component.viewProfile(partner);
        tick();

        expect(component.selectedPartner.value).toBe(partner);
        expect(component.isProfileLoading$.value).toBeFalse();
        expect(component.partnerStats.value.length).toBe(2);
        expect(component.partnerStats.value[0].label).toBe('Study Hours');
      }));

      it('should handle stats fetch error gracefully', fakeAsync(() => {
        userApiService.getUserStats.and.returnValue(throwError(() => new Error('Stats error')));
        const partner = component.filteredAndSortedPartners[0];

        component.viewProfile(partner);
        tick();

        expect(component.selectedPartner.value).toBe(partner);
        expect(component.isProfileLoading$.value).toBeFalse();
        expect(component.partnerStats.value.length).toBe(0);
      }));

      it('should close profile modal', () => {
        const partner = component.filteredAndSortedPartners[0];
        component.selectedPartner.next(partner);

        component.closeProfile();

        expect(component.selectedPartner.value).toBeNull();
      });
    });

    describe('Helper Methods', () => {
      it('should return correct degree name', () => {
        expect(component.getDegreeName(101)).toBe('Computer Science');
        expect(component.getDegreeName(102)).toBe('Data Science');
      });

      it('should return "..." for unknown degree', () => {
        expect(component.getDegreeName(999)).toBe('...');
      });

      it('should return partner courses', () => {
        const courses = component.getPartnerCourses('user-2');
        expect(courses.length).toBe(2);
        expect(courses[0].courseName).toBe('Intro to Programming');
      });

      it('should return empty array for partner with no courses', () => {
        const courses = component.getPartnerCourses('user-999');
        expect(courses.length).toBe(0);
      });

      it('should get initials from username', () => {
        expect(component.getInitials('Alice')).toBe('A');
        expect(component.getInitials('bob')).toBe('B');
        expect(component.getInitials('')).toBe('?');
      });

      it('should generate avatar colors consistently', () => {
        const color1 = component.getAvatarColor('Alice');
        const color2 = component.getAvatarColor('Alice');
        expect(color1).toBe(color2);

        const color3 = component.getAvatarColor('Bob');
        expect(color3).toBeTruthy();
      });

      it('should format year of study correctly', () => {
        expect(component.getYearOfStudy(1)).toBe('1st Year');
        expect(component.getYearOfStudy(2)).toBe('2nd Year');
        expect(component.getYearOfStudy(3)).toBe('3rd Year');
        expect(component.getYearOfStudy(4)).toBe('4th Year');
        expect(component.getYearOfStudy(5)).toBe('5th Year');
        expect(component.getYearOfStudy(11)).toBe('11th Year');
        expect(component.getYearOfStudy(21)).toBe('21st Year');
      });
    });

    describe('Messaging', () => {
      it('should handle createChat returning null', fakeAsync(() => {
        chatService.createChat.and.returnValue(of(null as any));
        const routerSpy = spyOn(router, 'navigate');
        spyOn(console, 'error');
        const partner = component.filteredAndSortedPartners[0];

        component.messageOnClick(partner);
        tick();

        expect(component.isNavigating$.value).toBeFalse();
        expect(routerSpy).not.toHaveBeenCalled();
      }));
    });

    describe('Available Degrees Filter', () => {
      it('should populate availableDegreesForFilter with only degrees that have partners', () => {
        expect(component.availableDegreesForFilter.length).toBe(2);
        expect(component.availableDegreesForFilter.map(d => d.degreeid)).toContain(101);
        expect(component.availableDegreesForFilter.map(d => d.degreeid)).toContain(102);
        expect(component.availableDegreesForFilter.map(d => d.degreeid)).not.toContain(103);
      });
    });
  });
});
