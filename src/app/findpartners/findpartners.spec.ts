import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
// import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { FindPartners } from './findpartners';
import { ApiService } from '../services/findpartner.service';
import { AuthService } from '../services';
import { UserService } from '../services/supabase.service';
import { ChatService } from '../services/chat.service';
// import { By } from '@angular/platform-browser';

// MOCK DATA
const mockLoggedInUser = { data: { user: { id: 'user-1', email: 'me@example.com' } } };

const mockSupabaseUsers = [
  { id: 'user-1', name: 'Me', email: 'me@example.com' },
  { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
  { id: 'user-3', name: 'Bob', email: 'bob@example.com' },
  { id: 'user-4', name: 'Charlie', email: 'charlie@example.com' },
];

const mockDbPartners = [
  { userid: 'user-2', username: 'old_name_alice', bio: 'Loves Angular', degreeid: 101, yearofstudy: 2, status: 'active' },
  { userid: 'user-3', username: 'old_name_bob', bio: 'Expert in RxJS', degreeid: 102, yearofstudy: 3, status: 'active' },
  { userid: 'user-4', username: 'old_name_charlie', bio: 'Wants to study AI', degreeid: 101, yearofstudy: 2, status: 'inactive' },
];

const mockDegrees = [
  { degreeid: 101, degree_name: 'Computer Science' },
  { degreeid: 102, degree_name: 'Data Science' },
];

const mockModules = [
  { courseCode: 'CS101', courseName: 'Intro to Programming' },
  { courseCode: 'CS303', courseName: 'Advanced Angular' },
  { courseCode: 'DS202', courseName: 'Machine Learning Basics' },
];

const mockUserCourses = [
  { userid: 'user-2', courseCode: 'CS101' },
  { userid: 'user-2', courseCode: 'CS303' },
  { userid: 'user-3', courseCode: 'DS202' },
];

describe('FindPartners', () => {
  let component: FindPartners;
  let fixture: ComponentFixture<FindPartners>;
  let apiService: jasmine.SpyObj<ApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['getDegree', 'getModule', 'getAllUserCourses', 'getUser']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const userServiceSpy = jasmine.createSpyObj('UserService', ['getAllUsers']);
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['createChat']);

    await TestBed.configureTestingModule({
      imports: [FindPartners, FormsModule, RouterTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ChatService, useValue: chatServiceSpy }, // Keep for messageOnClick
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FindPartners);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
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

      // 1. Trigger ngOnInit
      fixture.detectChanges();

      // 2. FIX: Use tick() to resolve ALL chained async operations (Promise -> then -> forkJoin)
      tick();

      // 3. FIX: Run change detection AGAIN to update the component with the data from the subscribe block
      fixture.detectChanges();

      // 4. Now the assertions will have the correct, final state
      expect(component.partners.length).toBe(3);
      expect(component.partners[0].username).toBe('Alice');
      expect(component.isLoading$.value).toBeFalse();
    }));

    it('should handle error when forkJoin API call fails', fakeAsync(() => {
      setupHappyPathMocks();
      const supabaseError = new Error('Supabase error');
      userService.getAllUsers.and.returnValue(Promise.reject(supabaseError));
      spyOn(console, 'error');

      fixture.detectChanges();
      tick();

      expect(console.error).toHaveBeenCalledWith('One or more API calls failed:', supabaseError);
      expect(component.isLoading$.value).toBeFalse();
    }));
  });
});
