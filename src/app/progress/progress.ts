import { Component, ChangeDetectionStrategy, signal, computed, AfterViewInit, OnDestroy, viewChild, ElementRef, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TopicApiService } from '../services/topic.service'; // For topics and stats
import { UserApiService } from '../services/user.service';   // For user's courses
import { AcademicApiService } from '../services/academic.service'; // For all modules
import { AuthService } from '../services'; // For getting the current user

// --- INTERFACES ---
interface StatCard { label: string; value: string; icon: string; colorClass: string; }
interface Topic {
  topicid: number; userid: string; title: string; description: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  start_date?: string; end_date?: string; hours: number; course_code: string;
}
interface Subject { courseCode: string; courseName: string; }
interface WeeklyStat { weekLabel: string; hoursStudied: number; }
interface Module { courseCode: string; courseName: string; facultyid: string; }

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './progress.html',
  styleUrls: ['./progress.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress implements AfterViewInit, OnDestroy {
  // --- SERVICE INJECTIONS ---
  private topicApiService = inject(TopicApiService);
  private userApiService = inject(UserApiService);
  private academicApiService = inject(AcademicApiService);
  private authService = inject(AuthService);

  // --- CHART ELEMENTS & INSTANCES ---
  weeklyHoursCanvas = viewChild<ElementRef<HTMLCanvasElement>>('weeklyHoursCanvas');
  topicCompletionCanvas = viewChild<ElementRef<HTMLCanvasElement>>('topicCompletionCanvas');
  subjectPerformanceCanvas = viewChild<ElementRef<HTMLCanvasElement>>('subjectPerformanceCanvas');
  weeklyHoursChart = signal<Chart | null>(null);
  topicCompletionChart = signal<Chart | null>(null);
  subjectPerformanceChart = signal<Chart | null>(null);

  // --- STATE MANAGEMENT ---
  isLoading = signal<boolean>(true);
  activeTab = signal<'overview' | 'subjects' | 'topics'>('overview');
  isLogProgressModalOpen = signal(false);
  editingTopicId = signal<number | null>(null);

  // --- FORM MODELS ---
  newTopic = signal<Omit<Topic, 'topicid' | 'userid'>>({
    title: '', description: '', status: 'In Progress', course_code: '', hours: 1,
    start_date: new Date().toISOString().split('T')[0]
  });
  editedTopicData = signal<{ status: Topic['status'], hours: number } | null>(null);

  // --- LIVE DATA SIGNALS ---
  statCards = signal<StatCard[]>([]);
  topics = signal<Topic[]>([]);
  subjects = signal<Subject[]>([]);
  weeklyHoursData = signal<{ labels: string[], data: number[] }>({ labels: [], data: [] });

  constructor() {
    this.initializePageData();
    this.setupChartEffects();
  }

  // --- COMPUTED SIGNALS FOR CHARTS ---
  getSubjectName = (courseCode: string) => this.subjects().find(s => s.courseCode === courseCode)?.courseName || 'Unknown';

  topicCompletionData = computed(() => {
    const all = this.topics();
    return {
      completed: all.filter(t => t.status === 'Completed').length,
      inProgress: all.filter(t => t.status === 'In Progress').length,
      notStarted: all.filter(t => t.status === 'Not Started').length
    };
  });

  subjectPerformanceData = computed(() => {
    const allTopics = this.topics();
    const allSubjects = this.subjects();
    const labels = allSubjects.map(s => s.courseName);
    const data = allSubjects.map(subject =>
      allTopics
        .filter(topic => topic.course_code === subject.courseCode)
        .reduce((sum, topic) => sum + topic.hours, 0)
    );
    return { labels, data };
  });

  // --- DATA FETCHING & INITIALIZATION ---
  async initializePageData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = await this.authService.getCurrentUser();
      // ✅ FIX: Using the dynamic user ID from the auth service
      const userId = user.data.user?.id;
      if (!userId) throw new Error("User not found");

      forkJoin({
        topics: this.topicApiService.getAllTopics(userId).pipe(catchError(() => of([]))),
        stats: this.topicApiService.getTopicStats(userId).pipe(catchError(() => of(null))),
        userCourses: this.userApiService.getUserCourses(userId).pipe(catchError(() => of({ courses: [] }))),
        allModules: this.academicApiService.getAllModules().pipe(catchError(() => of([]))),
        weeklyStats: this.topicApiService.getWeeklyStats(userId).pipe(catchError(() => of([])))
      }).subscribe(({ topics, stats, userCourses, allModules, weeklyStats }) => {
        if (stats) {
          this.statCards.set([
            { label: 'Total Study Hours', value: `${stats.totalHoursStudied}h`, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', colorClass: 'blue' },
            { label: 'Topics Completed', value: String(stats.topicsCompleted), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>', colorClass: 'purple' },
            { label: 'Current Streak', value: `${stats.currentStreakDays} days`, icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>', colorClass: 'green' },
            { label: 'Study Sessions', value: String(stats.studySessionsAttended), icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', colorClass: 'orange' },
          ]);
        }
        this.topics.set(topics);

        const enrolledCourseCodes = new Set(userCourses.courses);
        const enrolledSubjects = allModules
          .filter((mod: Module) => enrolledCourseCodes.has(mod.courseCode))
          // ✅ FIX: Mapped from mod.courseName (camelCase) to match the API response.
          .map((mod: Module) => ({ courseCode: mod.courseCode, courseName: mod.courseName }));
        this.subjects.set(enrolledSubjects);

        const labels = (weeklyStats || []).map((stat: WeeklyStat) => stat.weekLabel);
        const data = (weeklyStats || []).map((stat: WeeklyStat) => stat.hoursStudied);
        this.weeklyHoursData.set({ labels, data });

        this.isLoading.set(false);
      });
    } catch (error) {
      console.error("Failed to initialize page data", error);
      this.isLoading.set(false);
    }
  }

  // --- CHART LIFECYCLE & CREATION ---
  setupChartEffects(): void {
    effect(() => {
      if (this.activeTab() === 'overview') {
        if (this.weeklyHoursCanvas() && !this.weeklyHoursChart()) this.createWeeklyHoursChart();
        if (this.topicCompletionCanvas() && !this.topicCompletionChart()) this.createTopicCompletionChart();
      }
      if (this.activeTab() === 'subjects') {
        if (this.subjectPerformanceCanvas() && !this.subjectPerformanceChart()) this.createSubjectPerformanceChart();
      }

      const weeklyData = this.weeklyHoursData();
      const weeklyChart = this.weeklyHoursChart();
      if (weeklyChart && weeklyData.labels.length) {
        weeklyChart.data.labels = weeklyData.labels;
        weeklyChart.data.datasets[0].data = weeklyData.data;
        weeklyChart.update();
      }

      const completionData = this.topicCompletionData();
      const completionChart = this.topicCompletionChart();
      if (completionChart) {
        completionChart.data.datasets[0].data = [completionData.completed, completionData.inProgress, completionData.notStarted];
        completionChart.update();
      }

      const performanceData = this.subjectPerformanceData();
      const performanceChart = this.subjectPerformanceChart();
      if (performanceChart) {
        performanceChart.data.labels = performanceData.labels;
        performanceChart.data.datasets[0].data = performanceData.data;
        performanceChart.update();
      }
    });
  }

  ngAfterViewInit(): void {}
  ngOnDestroy(): void { this.destroyAllCharts(); }

  createWeeklyHoursChart(): void {
    const canvas = this.weeklyHoursCanvas()?.nativeElement;
    if (!canvas) return;
    const weeklyData = this.weeklyHoursData();
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: weeklyData.labels,
        datasets: [{
          label: 'Study Hours',
          data: weeklyData.data,
          backgroundColor: 'rgba(79, 70, 229, 0.7)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    this.weeklyHoursChart.set(chart);
  }

  createTopicCompletionChart(): void {
    const canvas = this.topicCompletionCanvas()?.nativeElement;
    if (!canvas) return;
    const initialData = this.topicCompletionData();
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Not Started'],
        datasets: [{
          data: [initialData.completed, initialData.inProgress, initialData.notStarted],
          backgroundColor: ['#22c55e', '#f97316', '#e5e7eb'],
          hoverOffset: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    this.topicCompletionChart.set(chart);
  }

  createSubjectPerformanceChart(): void {
    const canvas = this.subjectPerformanceCanvas()?.nativeElement;
    if (!canvas) return;
    const initialData = this.subjectPerformanceData();
    const chart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: initialData.labels,
        datasets: [{
          label: 'Hours Studied',
          data: initialData.data,
          fill: true,
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          borderColor: 'rgb(79, 70, 229)',
          pointBackgroundColor: 'rgb(79, 70, 229)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(79, 70, 229)'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true } } }
    });
    this.subjectPerformanceChart.set(chart);
  }

  selectTab(tab: 'overview' | 'subjects' | 'topics'): void {
    const currentTab = this.activeTab();
    if (currentTab === tab) return;
    if (currentTab === 'overview') {
      this.weeklyHoursChart()?.destroy(); this.topicCompletionChart()?.destroy();
      this.weeklyHoursChart.set(null); this.topicCompletionChart.set(null);
    } else if (currentTab === 'subjects') {
      this.subjectPerformanceChart()?.destroy(); this.subjectPerformanceChart.set(null);
    }
    this.activeTab.set(tab);
  }

  destroyAllCharts(): void {
    this.weeklyHoursChart()?.destroy(); this.topicCompletionChart()?.destroy(); this.subjectPerformanceChart()?.destroy();
    this.weeklyHoursChart.set(null); this.topicCompletionChart.set(null); this.subjectPerformanceChart.set(null);
  }

  // --- MODAL & EDITING METHODS ---
  openLogProgressModal(): void {
    this.newTopic.set({ title: '', description: '', status: 'In Progress', course_code: this.subjects()[0]?.courseCode || '', hours: 1, start_date: new Date().toISOString().split('T')[0] });
    this.isLogProgressModalOpen.set(true);
  }
  closeLogProgressModal = () => this.isLogProgressModalOpen.set(false);
  saveNewTopic(): void {
    // This would become an API call
    console.log("Saving new topic...", this.newTopic());
    this.closeLogProgressModal();
  }
  startEditTopic(topic: Topic): void {
    this.editingTopicId.set(topic.topicid);
    this.editedTopicData.set({ status: topic.status, hours: topic.hours });
  }
  cancelEditTopic = () => this.editingTopicId.set(null);
  saveEditTopic(topicIdToSave: number): void {
    // This would become an API call
    console.log("Saving topic:", topicIdToSave, this.editedTopicData());
    this.cancelEditTopic();
  }
}

