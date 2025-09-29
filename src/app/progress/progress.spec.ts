import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Progress } from './progress';
import { TopicApiService } from '../services/topic.service';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';

// --- MOCK DATA ---
const mockUser = { data: { user: { id: 'user-123' } } };
const mockTopics = [
  { topicid: 1, userid: 'user-123', title: 'State Management', description: 'Signal-based state', status: 'Completed' as const, hours: 5, course_code: 'NG101' },
  { topicid: 2, userid: 'user-123', title: 'Directives', description: 'Structural directives', status: 'In Progress' as const, hours: 2.5, course_code: 'NG101' },
  { topicid: 3, userid: 'user-123', title: 'Testing', description: 'Unit and E2E tests', status: 'Not Started' as const, hours: 0, course_code: 'TS202' },
];
const mockStats = { totalHoursStudied: 7.5, topicsCompleted: 1, currentStreakDays: 5, studySessionsAttended: 10 };
const mockUserCourses = { courses: ['NG101', 'TS202'] };
const mockAllModules = [
  { courseCode: 'NG101', courseName: 'Angular Basics' },
  { courseCode: 'TS202', courseName: 'TypeScript Fundamentals' },
  { courseCode: 'RX303', courseName: 'Reactive Programming' },
];
const mockWeeklyStats = [ { weekLabel: 'This Week', hoursStudied: 7.5 } ];

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

  describe('Data Initialization', () => {
    it('should fetch and process all data on successful initialization', fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      tick();
      fixture.detectChanges();

      expect(component.isLoading()).toBeFalse();
      expect(component.statCards().length).toBe(4);
      expect(component.topics().length).toBe(3);
    }));

    // FAILS
    xit('should complete successfully even if one inner API call fails due to catchError', fakeAsync(() => {
      // Explicitly mock all services for this specific test case
      authService.getCurrentUser.and.returnValue(Promise.resolve(mockUser as any));
      topicApiService.getTopicStats.and.returnValue(of(mockStats));
      userApiService.getUserCourses.and.returnValue(of(mockUserCourses));
      academicApiService.getAllModules.and.returnValue(of(mockAllModules));
      topicApiService.getWeeklyStats.and.returnValue(of(mockWeeklyStats));
      // Make ONLY the desired stream fail
      topicApiService.getAllTopics.and.returnValue(throwError(() => new Error('API down')));

      fixture = TestBed.createComponent(Progress);
      tick(); // Let async constructor and forkJoin resolve
      fixture.detectChanges();

      // Assert that loading is finished and other data is still loaded
      expect(component.isLoading()).toBeFalse();
      expect(component.topics().length).toBe(0); // This data stream failed and returned []
      expect(component.statCards().length).toBe(4); // But other data streams succeeded
    }));
  });

  describe('Lifecycle Hooks', () => {
    it('should destroy all charts on component destruction', fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
      fixture.detectChanges();

      // Manually set mock chart instances in the signals to simulate their creation
      const mockChart1 = { destroy: jasmine.createSpy('destroy1') };
      const mockChart2 = { destroy: jasmine.createSpy('destroy2') };
      component.weeklyHoursChart.set(mockChart1 as any);
      component.topicCompletionChart.set(mockChart2 as any);

      // Trigger ngOnDestroy
      fixture.destroy();

      // Assert that destroy was called on each mock instance
      expect(mockChart1.destroy).toHaveBeenCalled();
      expect(mockChart2.destroy).toHaveBeenCalled();
    }));
  });
});
