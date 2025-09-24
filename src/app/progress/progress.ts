import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// --- INTERFACES BASED ON SCHEMA & UI ---

// For the top four summary cards
interface StatCard {
  label: string;
  value: string;
  percentageChange?: string;
  icon: string; // SVG content
  colorClass: string;
}

// Represents a single topic from the database
interface Topic {
  topicID: number;
  userID: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'not-started';
  startDate?: string;
  endDate?: string;
  courseCode: string; // Foreign key to Module
}

// Represents a module/subject and the user's progress in it
interface SubjectProgress {
  courseCode: string;
  courseName: string;
  topicsCompleted: number;
  totalTopics: number;
}

// --- COMPONENT LOGIC ---

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress.html',
  styleUrls: ['./progress.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {

  // --- STATE MANAGEMENT ---

  // Signal to manage which tab is currently active
  activeTab = signal<'overview' | 'subjects' | 'topics'>('overview');

  // --- DUMMY DATA ---

  // Data for the summary cards at the top of the page
  statCards = signal<StatCard[]>([
    { label: 'Total Study Hours', value: '156h', percentageChange: '+12%', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', colorClass: 'blue' },
    { label: 'Topics Completed', value: '42', percentageChange: '+8%', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>', colorClass: 'purple' },
    { label: 'Current Streak', value: '7 days', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>', colorClass: 'green' },
    { label: 'Study Sessions', value: '23', percentageChange: '+15%', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', colorClass: 'orange' },
  ]);

  // Dummy topics based on the database schema
  topics = signal<Topic[]>([
    { topicID: 1, userID: 'user123', title: 'Integration by Parts', description: '', status: 'completed', courseCode: 'MA101', endDate: '2024-08-09' },
    { topicID: 2, userID: 'user123', title: 'Quantum Mechanics Basics', description: '', status: 'in-progress', courseCode: 'PH101' },
    { topicID: 3, userID: 'user123', title: 'Binary Trees', description: '', status: 'completed', courseCode: 'CS102', endDate: '2024-08-08' },
    { topicID: 4, userID: 'user123', title: 'Organic Reactions', description: '', status: 'completed', courseCode: 'CH101', endDate: '2024-08-07' },
    { topicID: 5, userID: 'user123', title: 'Calculus Fundamentals', description: '', status: 'in-progress', courseCode: 'MA101' },
    { topicID: 6, userID: 'user123', title: 'Data Structures Intro', description: '', status: 'not-started', courseCode: 'CS102' },
  ]);

  // Dummy modules/subjects
  subjects = signal<any[]>([
    { courseCode: 'MA101', courseName: 'Calculus' },
    { courseCode: 'PH101', courseName: 'Physics' },
    { courseCode: 'CS102', courseName: 'Computer Science' },
    { courseCode: 'CH101', courseName: 'Chemistry' },
  ]);

  // --- COMPUTED SIGNALS (DERIVED STATE) ---

  // Calculate progress for each subject
  subjectProgress = computed<SubjectProgress[]>(() => {
    const allTopics = this.topics();
    return this.subjects().map(subject => {
      const relevantTopics = allTopics.filter(t => t.courseCode === subject.courseCode);
      const completed = relevantTopics.filter(t => t.status === 'completed').length;
      return {
        courseCode: subject.courseCode,
        courseName: subject.courseName,
        topicsCompleted: completed,
        totalTopics: relevantTopics.length,
      };
    });
  });

  // Helper to get subject name from course code for the topics list
  getSubjectName(courseCode: string): string {
    const subject = this.subjects().find(s => s.courseCode === courseCode);
    return subject ? subject.courseName : 'Unknown Subject';
  }

  // --- METHODS ---

  // Method to change the active tab
  selectTab(tab: 'overview' | 'subjects' | 'topics'): void {
    this.activeTab.set(tab);
  }

  // Placeholder for future functionality
  logProgress(): void {
    console.log('Log Progress button clicked');
  }
}
