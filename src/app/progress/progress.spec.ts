import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Progress } from './progress';
import { TopicApiService } from '../services/topic.service';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Chart } from 'chart.js/auto';

// --- MOCK DATA ---
const mockUser = { data: { user: { id: 'user-123' } } };
const mockTopics = [
  { topicid: 1, userid: 'user-123', title: 'State Management', description: 'Signal-based state', status: 'Completed' as const, hours: 5, course_code: 'NG101', start_date: '2025-01-01', end_date: '2025-01-15' },
  { topicid: 2, userid: 'user-123', title: 'RxJS Basics', description: 'Observables', status: 'In Progress' as const, hours: 3, course_code: 'NG101', start_date: '2025-01-10', end_date: '' },
  { topicid: 3, userid: 'user-123', title: 'Testing', description: 'Unit tests', status: 'Not Started' as const, hours: 0, course_code: 'NG102', start_date: '2025-01-20', end_date: '' },
];
const mockStats = { totalHoursStudied: 8, topicsCompleted: 1, currentStreakDays: 5, studySessionsAttended: 10 };
const mockUserCourses = [
  { courseCode: 'NG101' },
  { courseCode: 'NG102' }
];
const mockAllModules = [
  { courseCode: 'NG101', courseName: 'Angular Basics', facultyid: 'f1' },
  { courseCode: 'NG102', courseName: 'Advanced Angular', facultyid: 'f1' },
  { courseCode: 'NG103', courseName: 'Not Enrolled', facultyid: 'f2' }
];
const mockWeeklyStats = [
  { weekLabel: 'Week 1', hoursStudied: 5 },
  { weekLabel: 'Week 2', hoursStudied: 3 }
];

describe('Progress', () => {
  let component: Progress;
  let fixture: ComponentFixture<Progress>;
  let topicApiService: jasmine.SpyObj<TopicApiService>;
  let userApiService: jasmine.SpyObj<UserApiService>;
  let academicApiService: jasmine.SpyObj<AcademicApiService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const topicApiSpy = jasmine.createSpyObj('TopicApiService', ['getAllTopics', 'getTopicStats', 'getWeeklyStats', 'createTopic', 'updateTopic']);
    const userApiSpy = jasmine.createSpyObj('UserApiService', ['getUserCourses']);
    const academicApiSpy = jasmine.createSpyObj('AcademicApiService', ['getAllModules']);
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [Progress, FormsModule],
      providers: [
        { provide: TopicApiService, useValue: topicApiSpy },
        { provide: UserApiService, useValue: userApiSpy },
        { provide: AcademicApiService, useValue: academicApiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ],
    }).compileComponents();

    topicApiService = TestBed.inject(TopicApiService) as jasmine.SpyObj<TopicApiService>;
    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    academicApiService = TestBed.inject(AcademicApiService) as jasmine.SpyObj<AcademicApiService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  function setupHappyPathMocks() {
    authService.getCurrentUser.and.returnValue(Promise.resolve(mockUser as any));
    topicApiService.getAllTopics.and.returnValue(of(mockTopics as any));
    topicApiService.getTopicStats.and.returnValue(of(mockStats));
    userApiService.getUserCourses.and.returnValue(of(mockUserCourses as any));
    academicApiService.getAllModules.and.returnValue(of(mockAllModules as any));
    topicApiService.getWeeklyStats.and.returnValue(of(mockWeeklyStats));
  }

  it('should create', () => {
    setupHappyPathMocks();
    fixture = TestBed.createComponent(Progress);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  describe('Data Initialization', () => {
    beforeEach(() => {
      setupHappyPathMocks();
    });

    it('should start with loading state true', () => {
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      expect(component.isLoading()).toBeTrue();
    });

    it('should fetch and process all data on successful initialization', fakeAsync(() => {
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(component.statCards().length).toBe(4);
      expect(component.topics().length).toBe(3);
      expect(component.subjects().length).toBe(2);
      expect(component.weeklyHoursData().labels.length).toBe(2);
    }));

    it('should populate stat cards with correct values', fakeAsync(() => {
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      const cards = component.statCards();
      expect(cards[0].label).toBe('Total Study Hours');
      expect(cards[0].value).toBe('8h');
      expect(cards[1].label).toBe('Topics Completed');
      expect(cards[1].value).toBe('1');
      expect(cards[2].label).toBe('Current Streak');
      expect(cards[2].value).toBe('5 days');
      expect(cards[3].label).toBe('Study Sessions');
      expect(cards[3].value).toBe('10');
    }));

    it('should filter subjects to only enrolled courses', fakeAsync(() => {
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      const subjects = component.subjects();
      expect(subjects.length).toBe(2);
      expect(subjects.map(s => s.courseCode)).toEqual(['NG101', 'NG102']);
      expect(subjects.find(s => s.courseCode === 'NG103')).toBeUndefined();
    }));

    it('should handle missing user gracefully', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      spyOn(console, 'error');

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(console.error).toHaveBeenCalledWith('Failed to initialize page data', jasmine.any(Error));
    }));

    it('should handle auth service rejection', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.reject('Auth failed'));
      spyOn(console, 'error');

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(console.error).toHaveBeenCalledWith('Failed to initialize page data', 'Auth failed');
    }));

    it('should handle getAllTopics failure with catchError', fakeAsync(() => {
      topicApiService.getAllTopics.and.returnValue(throwError(() => new Error('API down')));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(component.topics().length).toBe(0);
    }));

    it('should handle getTopicStats failure with catchError', fakeAsync(() => {
      topicApiService.getTopicStats.and.returnValue(throwError(() => new Error('Stats failed')));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(component.statCards().length).toBe(0);
    }));

    it('should handle getAllModules failure with catchError', fakeAsync(() => {
      academicApiService.getAllModules.and.returnValue(throwError(() => new Error('Modules failed')));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(component.subjects().length).toBe(0);
    }));

    it('should handle getWeeklyStats failure with catchError', fakeAsync(() => {
      topicApiService.getWeeklyStats.and.returnValue(throwError(() => new Error('Weekly stats failed')));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.isLoading()).toBeFalse();
      expect(component.weeklyHoursData().labels.length).toBe(0);
    }));

    it('should handle empty weekly stats', fakeAsync(() => {
      topicApiService.getWeeklyStats.and.returnValue(of(null as any));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.weeklyHoursData().labels.length).toBe(0);
      expect(component.weeklyHoursData().data.length).toBe(0);
    }));

    it('should handle null stats gracefully', fakeAsync(() => {
      topicApiService.getTopicStats.and.returnValue(of(null as any));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.statCards().length).toBe(0);
    }));

    it('should handle null userCourses', fakeAsync(() => {
      userApiService.getUserCourses.and.returnValue(of(null as any));

      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();

      expect(component.subjects().length).toBe(0);
    }));
  });

  describe('Computed Signals', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should compute topic completion data correctly', () => {
      const completionData = component.topicCompletionData();
      expect(completionData.completed).toBe(1);
      expect(completionData.inProgress).toBe(1);
      expect(completionData.notStarted).toBe(1);
    });

    it('should compute topic completion with no topics', () => {
      component.topics.set([]);
      const completionData = component.topicCompletionData();
      expect(completionData.completed).toBe(0);
      expect(completionData.inProgress).toBe(0);
      expect(completionData.notStarted).toBe(0);
    });

    it('should compute subject performance data correctly', () => {
      const performanceData = component.subjectPerformanceData();
      expect(performanceData.labels).toEqual(['Angular Basics', 'Advanced Angular']);
      expect(performanceData.data).toEqual([8, 0]);
    });

    it('should compute subject performance with no topics', () => {
      component.topics.set([]);
      const performanceData = component.subjectPerformanceData();
      expect(performanceData.labels).toEqual(['Angular Basics', 'Advanced Angular']);
      expect(performanceData.data).toEqual([0, 0]);
    });

    it('should get subject name by course code', () => {
      expect(component.getSubjectName('NG101')).toBe('Angular Basics');
      expect(component.getSubjectName('NG102')).toBe('Advanced Angular');
      expect(component.getSubjectName('UNKNOWN')).toBe('Unknown');
    });

    it('should return Unknown for empty course code', () => {
      expect(component.getSubjectName('')).toBe('Unknown');
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should start on overview tab', () => {
      expect(component.activeTab()).toBe('overview');
    });

    it('should switch to subjects tab', () => {
      component.selectTab('subjects');
      expect(component.activeTab()).toBe('subjects');
    });

    it('should switch to topics tab', () => {
      component.selectTab('topics');
      expect(component.activeTab()).toBe('topics');
    });

    it('should not switch if already on the same tab', () => {
      const initialTab = component.activeTab();
      component.selectTab('overview');
      expect(component.activeTab()).toBe(initialTab);
    });

    it('should destroy overview charts when switching away from overview', () => {
      component.activeTab.set('overview');

      const mockWeeklyChart = jasmine.createSpyObj('Chart', ['destroy', 'update']);
      const mockCompletionChart = jasmine.createSpyObj('Chart', ['destroy', 'update']);
      component.weeklyHoursChart.set(mockWeeklyChart);
      component.topicCompletionChart.set(mockCompletionChart);

      component.selectTab('subjects');

      expect(mockWeeklyChart.destroy).toHaveBeenCalled();
      expect(mockCompletionChart.destroy).toHaveBeenCalled();
      expect(component.weeklyHoursChart()).toBeNull();
      expect(component.topicCompletionChart()).toBeNull();
    });

    it('should destroy subjects chart when switching away from subjects', () => {
      component.activeTab.set('subjects');

      const mockPerformanceChart = jasmine.createSpyObj('Chart', ['destroy', 'update']);
      component.subjectPerformanceChart.set(mockPerformanceChart);

      component.selectTab('topics');

      expect(mockPerformanceChart.destroy).toHaveBeenCalled();
      expect(component.subjectPerformanceChart()).toBeNull();
    });

    it('should handle switching from topics tab', () => {
      component.activeTab.set('topics');

      component.selectTab('overview');

      expect(component.activeTab()).toBe('overview');
    });
  });

  describe('Chart Cleanup', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should destroy all charts on component destroy', () => {
      const mockWeeklyChart = jasmine.createSpyObj('Chart', ['destroy']);
      const mockCompletionChart = jasmine.createSpyObj('Chart', ['destroy']);
      const mockPerformanceChart = jasmine.createSpyObj('Chart', ['destroy']);

      component.weeklyHoursChart.set(mockWeeklyChart);
      component.topicCompletionChart.set(mockCompletionChart);
      component.subjectPerformanceChart.set(mockPerformanceChart);

      component.ngOnDestroy();

      expect(mockWeeklyChart.destroy).toHaveBeenCalled();
      expect(mockCompletionChart.destroy).toHaveBeenCalled();
      expect(mockPerformanceChart.destroy).toHaveBeenCalled();
    });

    it('should handle null charts gracefully on destroy', () => {
      component.weeklyHoursChart.set(null);
      component.topicCompletionChart.set(null);
      component.subjectPerformanceChart.set(null);

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Modal Management', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should open log progress modal with default values', () => {
      component.openLogProgressModal();

      expect(component.isLogProgressModalOpen()).toBeTrue();
      expect(component.newTopic().title).toBe('');
      expect(component.newTopic().description).toBe('');
      expect(component.newTopic().status).toBe('In Progress');
      expect(component.newTopic().hours).toBe(1);
      expect(component.newTopic().course_code).toBe('NG101');
    });

    it('should handle opening modal when no subjects exist', () => {
      component.subjects.set([]);
      component.openLogProgressModal();

      expect(component.isLogProgressModalOpen()).toBeTrue();
      expect(component.newTopic().course_code).toBe('');
    });

    it('should close log progress modal', () => {
      component.isLogProgressModalOpen.set(true);
      component.closeLogProgressModal();
      expect(component.isLogProgressModalOpen()).toBeFalse();
    });

    it('should save new topic successfully', fakeAsync(() => {
      topicApiService.createTopic.and.returnValue(of({ topicid: 4 } as any));
      spyOn(component, 'initializePageData').and.returnValue(Promise.resolve());

      component.newTopic.set({
        title: 'New Topic',
        description: 'Test description',
        status: 'In Progress',
        course_code: 'NG101',
        hours: 2,
        start_date: '2025-01-01'
      });
      component.isLogProgressModalOpen.set(true);

      component.saveNewTopic();
      tick();

      expect(topicApiService.createTopic).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Topic created successfully!', 'Dismiss', jasmine.any(Object));
      expect(component.isLogProgressModalOpen()).toBeFalse();
      expect(component.isSaving()).toBeFalse();
    }));

    it('should handle missing title when saving topic', fakeAsync(() => {
      spyOn(window, 'alert');

      component.newTopic.set({
        title: '',
        description: 'Test',
        status: 'In Progress',
        course_code: 'NG101',
        hours: 2,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      expect(window.alert).toHaveBeenCalledWith('Please fill in at least a title and select a subject.');
      expect(component.isSaving()).toBeFalse();
      expect(topicApiService.createTopic).not.toHaveBeenCalled();
    }));

    it('should handle missing course_code when saving topic', fakeAsync(() => {
      spyOn(window, 'alert');

      component.newTopic.set({
        title: 'Valid Title',
        description: 'Test',
        status: 'In Progress',
        course_code: '',
        hours: 2,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      expect(window.alert).toHaveBeenCalledWith('Please fill in at least a title and select a subject.');
      expect(component.isSaving()).toBeFalse();
    }));

    it('should handle user not found error when saving topic', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      spyOn(console, 'error');

      component.newTopic.set({
        title: 'New Topic',
        description: 'Test',
        status: 'In Progress',
        course_code: 'NG101',
        hours: 2,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      expect(console.error).toHaveBeenCalledWith('Failed to save new topic:', jasmine.any(Error));
      expect(snackBar.open).toHaveBeenCalledWith('There was an error saving your progress. Please try again.', 'Dismiss', jasmine.any(Object));
      expect(component.isSaving()).toBeFalse();
    }));

    it('should handle API error when saving topic', fakeAsync(() => {
      topicApiService.createTopic.and.returnValue(throwError(() => new Error('API Error')));
      spyOn(console, 'error');

      component.newTopic.set({
        title: 'New Topic',
        description: 'Test',
        status: 'In Progress',
        course_code: 'NG101',
        hours: 2,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      expect(console.error).toHaveBeenCalledWith('Failed to save new topic:', jasmine.any(Error));
      expect(snackBar.open).toHaveBeenCalledWith('There was an error saving your progress. Please try again.', 'Dismiss', jasmine.any(Object));
      expect(component.isSaving()).toBeFalse();
    }));

    it('should set end_date when status is Completed', fakeAsync(() => {
      topicApiService.createTopic.and.returnValue(of({ topicid: 4 } as any));
      spyOn(component, 'initializePageData').and.returnValue(Promise.resolve());

      component.newTopic.set({
        title: 'Completed Topic',
        description: 'Done',
        status: 'Completed',
        course_code: 'NG101',
        hours: 5,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      const callArgs = topicApiService.createTopic.calls.mostRecent().args[0];
      expect(callArgs.status).toBe('Completed');
      expect(callArgs.end_date).toBeInstanceOf(Date);
    }));

    it('should use default description if empty', fakeAsync(() => {
      topicApiService.createTopic.and.returnValue(of({ topicid: 4 } as any));
      spyOn(component, 'initializePageData').and.returnValue(Promise.resolve());

      component.newTopic.set({
        title: 'Topic',
        description: '   ',
        status: 'In Progress',
        course_code: 'NG101',
        hours: 1,
        start_date: '2025-01-01'
      });

      component.saveNewTopic();
      tick();

      const callArgs = topicApiService.createTopic.calls.mostRecent().args[0];
      expect(callArgs.description).toBe('No description provided.');
    }));
  });

  describe('Topic Editing', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should start editing a topic', () => {
      const topic = mockTopics[0];

      component.startEditTopic(topic);

      expect(component.editingTopicId()).toBe(1);
      expect(component.editedTopicData()).toEqual({ status: 'Completed', hours: 5 });
    });

    it('should cancel editing a topic', () => {
      component.editingTopicId.set(1);
      component.editedTopicData.set({ status: 'Completed', hours: 5 });

      component.cancelEditTopic();

      expect(component.editingTopicId()).toBeNull();
    });

    xit('should save edited topic and close edit mode', () => {
      spyOn(console, 'log');
      component.editingTopicId.set(1);
      component.editedTopicData.set({ status: 'In Progress', hours: 10 });

      component.saveEditTopic(1);

      expect(console.log).toHaveBeenCalledWith('Saving topic:', 1, jasmine.any(Object));
      expect(component.editingTopicId()).toBeNull();
    });
  });

  describe('ngAfterViewInit', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should call ngAfterViewInit without errors', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture = TestBed.createComponent(Progress);
      component = fixture.componentInstance;
      tick();
    }));

    it('should handle empty topics array', () => {
      component.topics.set([]);

      const completionData = component.topicCompletionData();
      expect(completionData.completed).toBe(0);
      expect(completionData.inProgress).toBe(0);
      expect(completionData.notStarted).toBe(0);
    });

    it('should handle empty subjects array', () => {
      component.subjects.set([]);

      const performanceData = component.subjectPerformanceData();
      expect(performanceData.labels.length).toBe(0);
      expect(performanceData.data.length).toBe(0);
    });

    it('should handle empty weekly hours data', () => {
      component.weeklyHoursData.set({ labels: [], data: [] });

      expect(component.weeklyHoursData().labels.length).toBe(0);
      expect(component.weeklyHoursData().data.length).toBe(0);
    });
  });
});
