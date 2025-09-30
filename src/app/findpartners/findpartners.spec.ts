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

// --- MOCK DATA ---
const mockLoggedInUser = { data: { user: { id: 'user-1' } } };

const mockSupabaseUsers = [
  { id: 'user-1', name: 'Me' },
  { id: 'user-2', name: 'Alice' },
  { id: 'user-3', name: 'Bob' },
  { id: 'user-4', name: 'Charlie' },
  { id: 'user-5', name: 'Diana' },
  { id: 'user-6', name: 'Eve' },
  { id: 'user-7', name: null }, // User with no name
];

const mockDbPartners = [
  { userid: 'user-2', username: 'a', bio: 'Loves Angular', degreeid: 101, yearofstudy: 2, status: 'active' },
  { userid: 'user-3', username: 'b', bio: 'Expert in RxJS', degreeid: 102, yearofstudy: 3, status: 'active' },
  { userid: 'user-4', username: 'c', bio: 'Wants to study AI', degreeid: 101, yearofstudy: 2, status: 'inactive' },
  { userid: 'user-5', username: 'd', bio: 'First year student', degreeid: 101, yearofstudy: 1, status: 'active' },
  { userid: 'user-6', username: 'e', bio: 'No courses', degreeid: 101, yearofstudy: 1, status: 'active' },
  { userid: 'user-7', username: 'f', bio: 'Profile with no name', degreeid: 101, yearofstudy: 1, status: 'active' },
];

const mockDegrees = [
  { degreeid: 101, degree_name: 'Computer Science' },
  { degreeid: 102, degree_name: 'Data Science' },
];

const mockModules = [
  { courseCode: 'CS101', courseName: 'Intro to Programming' },
  { courseCode: 'DS202', courseName: 'Machine Learning Basics' },
];

const mockUserCourses = [
  { userid: 'user-2', courseCode: 'CS101' },
  { userid: 'user-3', courseCode: 'DS202' },
  { userid: 'user-5', courseCode: 'CS101' },
  { userid: 'user-7', courseCode: 'CS101' },
  // Note: user-6 has no courses
];

const mockChat = { chatid: 'chat-123' };

describe('FindPartners', () => {
  let component: FindPartners;
  let fixture: ComponentFixture<FindPartners>;
  let apiService: jasmine.SpyObj<ApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let chatService: jasmine.SpyObj<ChatService>;
  let router: Router;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDegree', 'getModule', 'getAllUserCourses', 'getUser']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getAllUsers']);
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['createChat']);

    await TestBed.configureTestingModule({
      imports: [FindPartners, FormsModule, RouterTestingModule.withRoutes([{ path: 'chat', children: [] }])],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ChatService, useValue: chatServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FindPartners);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    chatService = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
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
      fixture.detectChanges();

      // Should filter out: self (user-1), inactive (user-4), no courses (user-6)
      expect(component.partners.length).toBe(4);
      expect(component.partners[0].username).toBe('Alice');
      expect(component.isLoading$.value).toBeFalse();
    }));

    // COVERAGE: Test the 'else' branch where a user session exists but contains no user ID.
    it('should handle when current user is resolved but has no user ID', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      spyOn(console, 'error');
      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith("Could not determine current user. Data cannot be loaded.");
      expect(component.isLoading$.value).toBeFalse();
      expect(apiService.getUser).not.toHaveBeenCalled();
    }));

    // COVERAGE: Test the main catch block in ngOnInit
    it('should handle error when getCurrentUser fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.reject('Auth error'));
      spyOn(console, 'error');
      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('Error getting current user:', 'Auth error');
      expect(component.isLoading$.value).toBeFalse();
    }));

    // COVERAGE: Test the fallback for Supabase users with no name
    it('should use "Unknown User" for partners with no name in Supabase', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      const userWithoutName = component.partners.find(p => p.userid === 'user-7');
      expect(userWithoutName?.username).toBe('Unknown User');
    }));
  });

  // Describe block for tests that require the component to be fully initialized
  describe('After Initialization', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    describe('Filtering', () => {
      it('should filter by search term matching a course name', () => {
        component.searchTerm = 'Machine Learning';
        component.applyFilters();
        expect(component.filteredPartners.length).toBe(1);
        expect(component.filteredPartners[0].username).toBe('Bob');
      });

      it('should filter out inactive partners', () => {
        // The initial list of partners (3) already has inactive users filtered out by populateData.
        // applyFilters also filters by status.
        expect(component.filteredPartners.find(p => p.username === 'Charlie')).toBeFalsy();
      });
    });

    describe('Display Helpers', () => {
      it('should return "Unknown Degree" for an invalid ID', () => {
        expect(component.getDegreeName(999)).toBe('Unknown Degree');
      });

      it('should format year of study correctly', () => {
        expect(component.getYearOfStudy(1)).toBe('1st Year');
        expect(component.getYearOfStudy(2)).toBe('2nd Year');
        expect(component.getYearOfStudy(3)).toBe('3rd Year');
        expect(component.getYearOfStudy(4)).toBe('4th Year');
        expect(component.getYearOfStudy(5)).toBe('5th Year');
      });
    });

    describe('User Actions (messageOnClick)', () => {
      it('should create a chat and navigate on message click', fakeAsync(() => {
        chatService.createChat.and.returnValue(of(mockChat as any));
        const routerSpy = spyOn(router, 'navigate');
        const partnerToMessage = component.partners.find(p => p.userid === 'user-2');

        component.messageOnClick(partnerToMessage!);
        tick();

        expect(component.isNavigating$.value).toBeFalse();
        expect(chatService.createChat).toHaveBeenCalled();
        expect(routerSpy).toHaveBeenCalledWith(['/chat']);
      }));

      it('should not navigate if createChat returns a falsy result', fakeAsync(() => {
        chatService.createChat.and.returnValue(of(null as any));
        const routerSpy = spyOn(router, 'navigate');
        spyOn(console, 'error');
        const partnerToMessage = component.partners.find(p => p.userid === 'user-2');

        component.messageOnClick(partnerToMessage!);
        tick();

        expect(component.isNavigating$.value).toBeFalse();
        expect(console.error).toHaveBeenCalledWith('Error finding chats:', jasmine.any(Error));
        expect(routerSpy).not.toHaveBeenCalled();
      }));
    });
  });
});
