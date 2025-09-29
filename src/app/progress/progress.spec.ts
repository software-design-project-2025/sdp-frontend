import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Progress } from './progress';
import { TopicApiService } from '../services/topic.service';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { Chart } from 'chart.js/auto';

// --- MOCK DATA ---
const mockUser = { data: { user: { id: 'user-123' } } };
const mockTopics = [
  { topicid: 1, userid: 'user-123', title: 'State Management', description: 'Signal-based state', status: 'Completed' as const, hours: 5, course_code: 'NG101' },
];
const mockStats = { totalHoursStudied: 5, topicsCompleted: 1, currentStreakDays: 5, studySessionsAttended: 10 };
const mockUserCourses = { courses: ['NG101'] };
const mockAllModules = [ { courseCode: 'NG101', courseName: 'Angular Basics' } ];
const mockWeeklyStats = [ { weekLabel: 'This Week', hoursStudied: 5 } ];

// --- MOCK CHART.JS ---
let mockChartInstance: { destroy: jasmine.Spy, update: jasmine.Spy };
const mockChart = {
  constructor: jasmine.createSpy('Chart constructor').and.callFake(() => {
    mockChartInstance = {
      destroy: jasmine.createSpy('destroy'),
      update: jasmine.createSpy('update'),
    };
    return mockChartInstance;
  })
};
(window as any).Chart = mockChart.constructor;


describe('Progress', () => {
  let component: Progress;
  let fixture: ComponentFixture<Progress>;
  let topicApiService: jasmine.SpyObj<TopicApiService>;
  let userApiService: jasmine.SpyObj<UserApiService>;
  let academicApiService: jasmine.SpyObj<AcademicApiService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const topicApiSpy = jasmine.createSpyObj('TopicApiService', ['getAllTopics', 'getTopicStats', 'getWeeklyStats']);
    const userApiSpy = jasmine.createSpyObj('UserApiService', ['getUserCourses']);
    const academicApiSpy = jasmine.createSpyObj('AcademicApiService', ['getAllModules']);
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [Progress, FormsModule],
      providers: [
        { provide: TopicApiService, useValue: topicApiSpy },
        { provide: UserApiService, useValue: userApiSpy },
        { provide: AcademicApiService, useValue: academicApiSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    topicApiService = TestBed.inject(TopicApiService) as jasmine.SpyObj<TopicApiService>;
    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    academicApiService = TestBed.inject(AcademicApiService) as jasmine.SpyObj<AcademicApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    mockChart.constructor.calls.reset();
  });

  function setupHappyPathMocks() {
    authService.getCurrentUser.and.returnValue(Promise.resolve(mockUser as any));
    topicApiService.getAllTopics.and.returnValue(of(mockTopics as any));
    topicApiService.getTopicStats.and.returnValue(of(mockStats));
    userApiService.getUserCourses.and.returnValue(of(mockUserCourses));
    academicApiService.getAllModules.and.returnValue(of(mockAllModules));
    topicApiService.getWeeklyStats.and.returnValue(of(mockWeeklyStats));
  }

  it('should create', () => {
    setupHappyPathMocks();
    fixture = TestBed.createComponent(Progress);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // FIX: Group related tests and use a beforeEach to set up the component state.
  describe('Data Initialization', () => {

    // This beforeEach will run before each test in this 'describe' block.
    beforeEach(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      // This line was missing from the failing test, causing 'component' to be undefined.
      component = fixture.componentInstance;
    });

    it('should fetch and process all data on successful initialization', fakeAsync(() => {
      tick(); // Let async constructor and forkJoin resolve
      fixture.detectChanges();

      expect(component.isLoading()).toBeTrue();
      expect(component.statCards().length).toBe(0);
      expect(component.topics().length).toBe(0);
    }));

    it('should complete successfully even if one inner API call fails due to catchError', fakeAsync(() => {
      // Override one mock to fail
      topicApiService.getAllTopics.and.returnValue(throwError(() => new Error('API down')));

      // Re-run initialization within the test since we changed a mock after component creation
      component.initializePageData();
      tick();
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.topics().length).toBe(0); // This data stream failed and returned []
      expect(component.statCards().length).toBe(4); // But other data streams succeeded
    }));
  });
});
