import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError, forkJoin } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Chart } from 'chart.js/auto';

import { Progress } from './progress'; // <-- FIX: Removed .ts extension
import { TopicApiService } from '../services/topic.service';
import { UserApiService } from '../services/user.service';
import { AcademicApiService } from '../services/academic.service';
import { AuthService } from '../services';

// --- INTERFACES (copied from .ts file for mock data) ---
interface Topic {
  topicid: number; userid: string; title: string; description: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  start_date: string; end_date: string; hours: number; course_code: string;
}
interface Module { courseCode: string; courseName: string; facultyid: string; }
interface NewTopicPayload {
  userid: string; title: string; description: string; start_date: Date;
  end_date: Date; status: string; course_code: string; hours: number;
}

// --- MOCK DATA ---
const MOCK_AUTH_USER = { data: { user: { id: 'user-123' } } };

const MOCK_TOPICS: Topic[] = [
  { topicid: 1, userid: 'user-123', title: 'Topic 1 - In Progress', description: '', status: 'In Progress', start_date: '', end_date: '', hours: 5, course_code: 'CS101' },
  { topicid: 2, userid: 'user-123', title: 'Topic 2 - Completed', description: '', status: 'Completed', start_date: '', end_date: '2025-10-20', hours: 10, course_code: 'MATH101' },
  { topicid: 3, userid: 'user-123', title: 'Topic 3 - Not Started', description: '', status: 'Not Started', start_date: '', end_date: '', hours: 0, course_code: 'CS101' },
];

const MOCK_STATS = {
  totalHoursStudied: 15, topicsCompleted: 1, currentStreakDays: 3, studySessionsAttended: 2
};

const MOCK_USER_COURSES = { courses: [{ courseCode: 'CS101' }, { courseCode: 'MATH101' }] };

const MOCK_ALL_MODULES: Module[] = [
  { courseCode: 'CS101', courseName: 'Computer Science 101', facultyid: '1' },
  { courseCode: 'MATH101', courseName: 'Calculus I', facultyid: '2' },
  { courseCode: 'PHYS101', courseName: 'Physics 101', facultyid: '1' },
];

const MOCK_WEEKLY_STATS = [
  { weekLabel: 'Week 40', hoursStudied: 10 },
  { weekLabel: 'Week 41', hoursStudied: 5 },
];

// --- MOCK CHART ---
// A simple spy object to mock a Chart.js instance
const MOCK_CHART_INSTANCE = jasmine.createSpyObj('Chart', ['update', 'destroy']);

describe('Progress', () => {
  let component: Progress;
  let fixture: ComponentFixture<Progress>;

  let mockTopicApiService: jasmine.SpyObj<TopicApiService>;
  let mockUserApiService: jasmine.SpyObj<UserApiService>;
  let mockAcademicApiService: jasmine.SpyObj<AcademicApiService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  // Helper to run full component initialization
  function initializeComponent(fixture: ComponentFixture<Progress>): void {
    fixture.detectChanges(); // triggers constructor, which calls initializePageData
    tick(); // resolves forkJoin
    fixture.detectChanges(); // updates view with data
  }

  beforeEach(async () => {
    // --- Create Spies ---
    mockTopicApiService = jasmine.createSpyObj('TopicApiService', ['getAllTopics', 'getTopicStats', 'getWeeklyStats', 'createTopic', 'patchTopic']);
    mockUserApiService = jasmine.createSpyObj('UserApiService', ['getUserCourses']);
    mockAcademicApiService = jasmine.createSpyObj('AcademicApiService', ['getAllModules']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        Progress, // Import the standalone component
        FormsModule,
        NoopAnimationsModule,
        MatSnackBarModule // Import module for snackbar provider
      ],
      providers: [
        { provide: TopicApiService, useValue: mockTopicApiService },
        { provide: UserApiService, useValue: mockUserApiService },
        { provide: AcademicApiService, useValue: mockAcademicApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    // --- Default "Happy Path" Mock Implementations ---
    mockAuthService.getCurrentUser.and.returnValue(Promise.resolve(MOCK_AUTH_USER) as any); // <-- FIX: Cast to any
    mockTopicApiService.getAllTopics.and.returnValue(of(MOCK_TOPICS));
    mockTopicApiService.getTopicStats.and.returnValue(of(MOCK_STATS));
    mockUserApiService.getUserCourses.and.returnValue(of(MOCK_USER_COURSES.courses as any)); // 'as any' to bypass strict type
    mockAcademicApiService.getAllModules.and.returnValue(of(MOCK_ALL_MODULES));
    mockTopicApiService.getWeeklyStats.and.returnValue(of(MOCK_WEEKLY_STATS));

    // Mock create/patch to return success
    mockTopicApiService.createTopic.and.returnValue(of({} as any));
    mockTopicApiService.patchTopic.and.returnValue(of({} as any));

    fixture = TestBed.createComponent(Progress);
    component = fixture.componentInstance;

    // Mock the chart constructor to return our spy
    spyOn(Chart.prototype, 'update').and.callFake(() => {});
    spyOn(Chart.prototype, 'destroy').and.callFake(() => {});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and Data Loading', () => {
    it('should show loading state initially', () => {
      expect(component.isLoading()).toBe(true);
    });

    it('should fetch all data, update signals, and hide loader on init', fakeAsync(() => {
      initializeComponent(fixture);

      // Check services
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(mockTopicApiService.getAllTopics).toHaveBeenCalledWith('user-123');
      expect(mockTopicApiService.getTopicStats).toHaveBeenCalledWith('user-123');
      expect(mockUserApiService.getUserCourses).toHaveBeenCalledWith('user-123');
      expect(mockAcademicApiService.getAllModules).toHaveBeenCalled();
      expect(mockTopicApiService.getWeeklyStats).toHaveBeenCalledWith('user-123');

      // Check signals
      expect(component.isLoading()).toBe(false);
      expect(component.topics().length).toBe(MOCK_TOPICS.length);
      expect(component.statCards().length).toBe(4);
      expect(component.statCards()[0].label).toBe('Total Study Hours');
      expect(component.statCards()[0].value).toBe('15h');

      // Should filter user's subjects from all modules
      expect(component.subjects().length).toBe(2);
      expect(component.subjects()[0].courseCode).toBe('CS101');
      expect(component.subjects()[1].courseName).toBe('Calculus I');

      expect(component.weeklyHoursData().labels.length).toBe(2);
      expect(component.weeklyHoursData().data[0]).toBe(10);
    }));

    it('should handle data initialization error if user not found', fakeAsync(() => {
      mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } }) as any); // <-- FIX: Cast to any
      spyOn(console, 'error');

      fixture.detectChanges(); // Triggers constructor
      tick(); // Resolves promise

      expect(component.isLoading()).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to initialize page data",
        jasmine.any(Error)
      );
      expect(component.topics().length).toBe(0);
    }));
  });

  describe('Tab Switching and Chart Lifecycle', () => {
    it('should default to overview tab', () => {
      expect(component.activeTab()).toBe('overview');
    });

    it('should change tab on selectTab', () => {
      component.selectTab('subjects');
      expect(component.activeTab()).toBe('subjects');
    });

    it('should destroy charts when switching tabs', fakeAsync(() => {
      initializeComponent(fixture);
      component.activeTab.set('overview');

      // Manually set mock charts (as if effect created them)
      component.weeklyHoursChart.set(MOCK_CHART_INSTANCE);
      component.topicCompletionChart.set(MOCK_CHART_INSTANCE);
      component.subjectPerformanceChart.set(null); // Ensure it's null

      component.selectTab('subjects');

      // Overview charts should be destroyed
      expect(MOCK_CHART_INSTANCE.destroy).toHaveBeenCalledTimes(2);
      expect(component.weeklyHoursChart()).toBeNull();
      expect(component.topicCompletionChart()).toBeNull();

      // Reset spy and test switching *from* subjects
      MOCK_CHART_INSTANCE.destroy.calls.reset();
      component.subjectPerformanceChart.set(MOCK_CHART_INSTANCE);

      component.selectTab('overview');
      expect(MOCK_CHART_INSTANCE.destroy).toHaveBeenCalledTimes(1);
      expect(component.subjectPerformanceChart()).toBeNull();
    }));
  });

  describe('Computed Signals (Chart Data)', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should compute topicCompletionData correctly', () => {
      const data = component.topicCompletionData();
      expect(data.completed).toBe(1);
      expect(data.inProgress).toBe(1);
      expect(data.notStarted).toBe(1);
    });

    it('should compute subjectPerformanceData correctly', () => {
      const data = component.subjectPerformanceData();
      // Labels should match the *user's* subjects
      expect(data.labels).toEqual(['Computer Science 101', 'Calculus I']);
      // Data should be sum of hours per subject
      expect(data.data).toEqual([5, 10]); // CS101 (5+0), MATH101 (10)
    });
  });

  describe('Topics Tab - Filtering and Sorting', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should sort topics by status by default', () => {
      const topics = component.filteredTopics();
      expect(topics.length).toBe(3);
      expect(topics[0].status).toBe('In Progress');
      expect(topics[1].status).toBe('Not Started');
      expect(topics[2].status).toBe('Completed');
    });

    it('should filter by search term (title)', () => {
      component.topicSearchTerm.set('Topic 2');
      expect(component.filteredTopics().length).toBe(1);
      expect(component.filteredTopics()[0].title).toBe('Topic 2 - Completed');
    });

    it('should filter by search term (subject name)', () => {
      component.topicSearchTerm.set('calculus'); // Case-insensitive
      expect(component.filteredTopics().length).toBe(1);
      expect(component.filteredTopics()[0].course_code).toBe('MATH101');
    });

    it('should filter by status', () => {
      component.topicStatusFilter.set('Not Started');
      expect(component.filteredTopics().length).toBe(1);
      expect(component.filteredTopics()[0].status).toBe('Not Started');
    });

    it('should combine filters (search and status)', () => {
      component.topicSearchTerm.set('topic');
      component.topicStatusFilter.set('Completed');
      expect(component.filteredTopics().length).toBe(1);
      expect(component.filteredTopics()[0].title).toBe('Topic 2 - Completed');
    });

    it('should show no topics if filters match nothing', () => {
      component.topicSearchTerm.set('NonExistentTopic');
      expect(component.filteredTopics().length).toBe(0);
    });
  });

  describe('Log Progress Modal (Create Topic)', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should open modal with default values', () => {
      component.openLogProgressModal();

      expect(component.isLogProgressModalOpen()).toBe(true);
      expect(component.newTopic().title).toBe('');
      expect(component.newTopic().hours).toBe(1);
      expect(component.newTopic().status).toBe('In Progress');
      // Should default to first subject
      expect(component.newTopic().course_code).toBe('CS101');
    });

    it('should save new topic, refresh, and close modal', fakeAsync(() => {
      spyOn(component, 'initializePageData').and.callThrough(); // Spy on refresh

      component.openLogProgressModal();
      component.newTopic.set({
        title: 'Test Topic',
        description: 'Test Desc',
        status: 'In Progress',
        course_code: 'CS101',
        hours: 3,
        start_date: '2025-10-22'
      });

      component.saveNewTopic();
      tick(); // for auth, api call, and refresh

      const expectedPayload = {
        userid: 'user-123',
        title: 'Test Topic',
        description: 'Test Desc',
        start_date: new Date('2025-10-22'),
        end_date: jasmine.any(Date),
        status: 'In Progress',
        course_code: 'CS101',
        hours: 3,
      };

      expect(mockTopicApiService.createTopic).toHaveBeenCalledWith(expectedPayload as any); // <-- FIX: Cast to any
      expect(mockSnackBar.open).toHaveBeenCalledWith('Topic created successfully!', 'Dismiss', jasmine.any(Object));
      expect(component.isLogProgressModalOpen()).toBe(false);
      expect(component.initializePageData).toHaveBeenCalledTimes(2); // 1 on init, 1 on refresh
      expect(component.isSaving()).toBe(false);
    }));

    it('should handle save error and not close modal', fakeAsync(() => {
      mockTopicApiService.createTopic.and.returnValue(throwError(() => new Error('API Error')));

      component.openLogProgressModal();
      component.newTopic.set({ ...component.newTopic(), title: 'Test' });

      component.saveNewTopic();
      tick();

      expect(mockSnackBar.open).toHaveBeenCalledWith('There was an error saving your progress. Please try again.', 'Dismiss', jasmine.any(Object));
      expect(component.isLogProgressModalOpen()).toBe(true); // Stays open
      expect(component.isSaving()).toBe(false);
    }));

    it('should update status to Not Started if hours set to 0', () => {
      component.openLogProgressModal();
      component.onNewTopicHoursChange(0);
      expect(component.newTopic().hours).toBe(0);
      expect(component.newTopic().status).toBe('Not Started');
    });

    it('should update hours to 0 if status set to Not Started', () => {
      component.openLogProgressModal();
      component.onNewTopicStatusChange('Not Started');
      expect(component.newTopic().hours).toBe(0);
      expect(component.newTopic().status).toBe('Not Started');
    });
  });

  describe('In-place Editing (Update Topic)', () => {
    beforeEach(fakeAsync(() => {
      initializeComponent(fixture);
    }));

    it('should start editing and populate edit signal', () => {
      const topicToEdit = component.topics()[0]; // Topic 1 - In Progress, 5 hours
      component.startEditTopic(topicToEdit);

      expect(component.editingTopicId()).toBe(topicToEdit.topicid);
      expect(component.editedTopicData()).toEqual({ status: 'In Progress', hours: 5 });
    });

    it('should cancel editing', () => {
      component.startEditTopic(component.topics()[0]);
      component.cancelEditTopic();
      expect(component.editingTopicId()).toBeNull();
    });

    it('should save topic changes, refresh, and stop editing', fakeAsync(() => {
      spyOn(component, 'initializePageData').and.callThrough();
      const topicToEdit = component.topics()[0]; // Topic 1

      component.startEditTopic(topicToEdit);

      // Simulate user changes
      component.onEditHoursChange(10);
      component.onEditStatusChange('Completed');

      expect(component.editedTopicData()).toEqual({ status: 'Completed', hours: 10 });

      component.saveEditTopic(topicToEdit.topicid);
      tick(); // for api call and refresh

      expect(mockTopicApiService.patchTopic).toHaveBeenCalledWith(topicToEdit.topicid, { status: 'Completed', hours: 10 });
      expect(mockSnackBar.open).toHaveBeenCalledWith('Topic updated successfully!', 'Dismiss', jasmine.any(Object));
      expect(component.editingTopicId()).toBeNull();
      expect(component.initializePageData).toHaveBeenCalledTimes(2); // 1 init, 1 refresh
      expect(component.isSaving()).toBe(false);
    }));

    it('should enforce rule: editing hours to 0 sets status to Not Started', () => {
      component.startEditTopic(component.topics()[0]); // In Progress, 5 hours
      component.onEditHoursChange(0);
      expect(component.editedTopicData()).toEqual({ status: 'Not Started', hours: 0 });
    });

    it('should enforce rule: editing status to Not Started sets hours to 0', () => {
      component.startEditTopic(component.topics()[0]); // In Progress, 5 hours
      component.onEditStatusChange('Not Started');
      expect(component.editedTopicData()).toEqual({ status: 'Not Started', hours: 0 });
    });
  });
});
