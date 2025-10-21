import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, forkJoin } from 'rxjs';

// Models
import { Session } from '../models/session.model';
import { Group } from '../models/group.model';

// Services
import { SessionsService, StudyHoursResponse, SessionCountResponse } from '../services/sessions.service';
import { GroupService } from '../services/group.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  providers: [DatePipe],
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit {
  isLoading$ = new BehaviorSubject<boolean>(true);
  currentUserId: string = '';

  upcomingSessions: Session[] = [];
  pastSessions: Session[] = [];
  groups: Group[] = [];

  // FIXED: Consolidated stats into a single object to match the new HTML template
  userStats: { totalHours: number, numSessions: number } | null = null;

  showModal = false;
  modalError: string | null = null;

  newSession = {
    title: '',
    start_time: '',
    end_time: '',
    status: 'open',
    location: '',
    description: '',
    groupid: 0
  };

  constructor(
    private sessionsService: SessionsService,
    private groupService: GroupService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading$.next(true);
    try {
      const userResponse = await this.authService.getCurrentUser();
      if (!userResponse.data?.user?.id) {
        throw new Error('User not authenticated.');
      }
      this.currentUserId = userResponse.data.user.id;

      forkJoin({
        allSessions: this.sessionsService.getSessions(),
        groups: this.groupService.getAllGroups(),
        studyHours: this.sessionsService.getStudyHours(this.currentUserId),
        sessionCount: this.sessionsService.getSessionCount(this.currentUserId)
      }).subscribe(({ allSessions, groups, studyHours, sessionCount }) => {
        this.processSessions(allSessions);
        this.groups = groups;
        // FIXED: Populate the new userStats object
        this.userStats = {
          totalHours: studyHours.totalHours,
          numSessions: sessionCount.numSessions
        };
        this.isLoading$.next(false);
      });
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.isLoading$.next(false);
    }
  }

  private processSessions(sessions: Session[]): void {
    const now = new Date();
    this.upcomingSessions = sessions.filter(s => new Date(s.start_time) >= now).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    this.pastSessions = sessions.filter(s => new Date(s.start_time) < now).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }

  // FIXED: Renamed to match the template's (click)="createSession()"
  createSession(): void {
    this.resetForm();
    this.showModal = true;
  }

  // FIXED: Renamed to match the template's (click)="cancelSession()"
  cancelSession(): void {
    this.showModal = false;
    this.modalError = null;
  }

  private resetForm(): void {
    this.newSession = { title: '', start_time: '', end_time: '', status: 'open', location: '', description: '', groupid: 0 };
  }

  confirmSession(): void {
    if (!this.newSession.title || !this.newSession.start_time || !this.newSession.groupid) {
      this.modalError = 'Please fill in all required fields: Title, Start Time, and Group.';
      return;
    }

    const backendSession: Partial<Session> = {
      ...this.newSession,
      creatorid: this.currentUserId,
      start_time: new Date(this.newSession.start_time).toISOString(),
      end_time: this.newSession.end_time ? new Date(this.newSession.end_time).toISOString() : null
    };

    this.sessionsService.createSession(backendSession).subscribe({
      next: () => {
        this.loadInitialData();
        this.cancelSession();
      },
      error: (err) => {
        console.error('Error creating session:', err);
        this.modalError = 'Failed to create session. Please try again later.';
      }
    });
  }

  scheduleAgain(pastSession: Session): void {
    this.resetForm();
    this.newSession = {
      title: `Copy of: ${pastSession.title}`,
      groupid: pastSession.groupid,
      description: pastSession.description ?? '',
      location: pastSession.location ?? '',
      status: 'open',
      start_time: '',
      end_time: ''
    };
    this.showModal = true;
  }

  isOnline(session: Session): boolean {
    return !!session.location?.startsWith('http');
  }

  // ADDED: Placeholder methods called by the new HTML template
  getDirections(session: Session): void { console.log('Getting directions for:', session.title); }
  joinOnline(session: Session): void {
    if (session.location) {
      window.open(session.location, '_blank');
    }
  }
  viewDetails(session: Session): void { console.log('Viewing details for:', session.title); }
  viewSummary(pastSession: Session): void { console.log('Viewing summary for:', pastSession.title); }
}

