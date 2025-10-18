import { Component, OnInit, NgZone, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SessionsService } from '../../services/sessions.service';
import { AuthService } from '../../services/auth.service';
import { TopicApiService } from '../../services/topic.service';
import { interval, Subscription } from 'rxjs';
import { GroupService, Group, GroupJoinRequest } from '../../services/group.service';
import { FormsModule, NgForm } from '@angular/forms';

import { SessionDetailsModalComponent } from './session-details-modal.component';

interface Session {
  sessionId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location: string;
  creatorid: string;
  status: string;
  groupid: number;
}
interface TopicsResponse {
  userId: string;
  numTopics: number;
}
interface SessionsResponse {
  userId: string;
  numSessions: number;
}
interface StudyHoursResponse {
  userId: string;
  totalHours: number;
  exactHours: number;
}

interface DisplayableGroupJoinRequest extends GroupJoinRequest {
  uiState?: 'idle' | 'confirming' | 'processing';
  action?: 'approve' | 'reject';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule, FormsModule, SessionDetailsModalComponent]
})
export class HomeComponent implements OnInit, OnDestroy {
  allEvents: EventInput[] = [];
  currentUserId: string = '';
  studyHours: number = 0;
  sessionsCount: number = 0;
  topicsCount: number = 0;
  messagesCount: number = 0;
  private refreshSubscription: Subscription | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

  // Properties for Group Feature
  private groupRefreshSubscription: Subscription | null = null;
  private readonly GROUP_REFRESH_INTERVAL = 60 * 1000;
  discoverableGroups: Group[] = [];
  myJoinRequests: GroupJoinRequest[] = [];

  pendingRequestsForMyGroups: DisplayableGroupJoinRequest[] = [];

  // Session Modal Properties
  showSessionModal = false;
  selectedSession: any = null;

  // Group Creation State
  isGroupCreated = false;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,today',
      center: 'title',
      right: 'refreshBtn,next'
    },
    height: 'auto',
    events: [],
    eventDisplay: 'block',
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    customButtons: {
      refreshBtn: {
        text: 'Refresh',
        click: () => this.manualRefresh()
      }
    },
    eventClick: (info: EventClickArg) => {
      this.showSessionDetails(info.event);
    }
  };

  constructor(
    @Inject(SessionsService) private sessionService: SessionsService,
    @Inject(TopicApiService) private topicService: TopicApiService,
    @Inject(GroupService) private groupService: GroupService,
    private zone: NgZone,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🏠 HomeComponent initialized');
    await this.loadInitialData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private async loadInitialData(): Promise<void> {
    try {
      const userResponse = await this.authService.getCurrentUser();
      
      if (userResponse.data?.user) {
        this.currentUserId = userResponse.data.user.id;
        console.log('✅ User found:', this.currentUserId);
        this.loadUpcomingSessions(this.currentUserId);
        this.loadUserStatistics(this.currentUserId);
        this.loadGroupData(this.currentUserId);
      } else {
        console.log('❌ No user logged in');
        this.handleUserNotLoggedIn();
      }
    } catch (error: any) {
      console.error('🚨 Error getting current user:', error);
      this.handleUserNotLoggedIn();
    }
  }

  // Session Details Methods
  showSessionDetails(event: any): void {
    const sessionData = {
      title: event.title,
      start: event.start,
      end: event.end,
      location: event.extendedProps['location'],
      description: event.extendedProps['description'],
      creatorName: this.getCreatorDisplayName(event.extendedProps['creatorId']),
      isPast: event.extendedProps['isPast']
    };
    
    this.selectedSession = sessionData;
    this.showSessionModal = true;
    this.cdr.detectChanges();
  }

  closeSessionModal(): void {
    this.showSessionModal = false;
    this.selectedSession = null;
    this.cdr.detectChanges();
  }

  private getCreatorDisplayName(creatorId: string): string {
    // user lookup
    return 'Creator';
  }

  // Group Methods
  private loadGroupData(userId: string): void {
    this.loadDiscoverableGroups(userId);
    this.loadMyJoinRequests(userId);
    this.loadPendingRequestsForMyGroups(userId);
  }

  private loadDiscoverableGroups(userId: string): void {
    this.groupService.discoverGroups(userId).subscribe({
      next: (groups) => {
        this.discoverableGroups = groups;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching discoverable groups:', err)
    });
  }

  private loadMyJoinRequests(userId: string): void {
    this.groupService.getMyRequests(userId).subscribe({
      next: (requests) => {
        this.myJoinRequests = requests;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching my join requests:', err)
    });
  }

  private loadPendingRequestsForMyGroups(userId: string): void {
    this.groupService.getPendingRequestsForCreator(userId).subscribe({
      next: (requests) => {
        this.pendingRequestsForMyGroups = requests.map(request => ({
          ...request,
          uiState: 'idle' as const
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching pending requests for creator:', err)
    });
  }
  
  joinGroup(groupId: number): void {
    if (!this.currentUserId) {
      alert('You must be logged in to join a group.');
      return;
    }
    this.groupService.requestToJoin(groupId, this.currentUserId).subscribe({
      next: () => {
        alert('Your request to join has been sent successfully!');
        this.loadGroupData(this.currentUserId);
      },
      error: (err) => {
        console.error('Error sending join request:', err);
        alert('There was an error sending your request. Please try again.');
      }
    });
  }

  createGroup(form: NgForm): void {
    if (form.invalid || !this.currentUserId) {
      alert('Please fill out all fields.');
      return;
    }

    const groupData = {
      title: form.value.title,
      goal: form.value.goal,
      creatorid: this.currentUserId
    };

    this.groupService.createGroup(groupData).subscribe({
      next: (newGroup) => {
        this.isGroupCreated = true;
        form.resetForm();
        
        setTimeout(() => {
          this.isGroupCreated = false;
          this.cdr.detectChanges();
        }, 3000);
        
        this.loadGroupData(this.currentUserId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating group:', err);
        alert('❌ Failed to create group. Please try again.');
      }
    });
  }

  // Action handlers for incoming requests
  startAction(event: Event, request: DisplayableGroupJoinRequest): void {
    const selectElement = event.target as HTMLSelectElement;
    const action = selectElement.value as 'approve' | 'reject';

    if (!action) return;

    request.uiState = 'confirming';
    request.action = action;
    this.cdr.detectChanges();
  }

  cancelAction(request: DisplayableGroupJoinRequest): void {
    request.uiState = 'idle';
    request.action = undefined;
    this.cdr.detectChanges();
  }

  confirmAction(request: DisplayableGroupJoinRequest): void {
    if (!request.action) return;

    request.uiState = 'processing';
    this.cdr.detectChanges();

    const action$ = request.action === 'approve'
      ? this.groupService.approveRequest(request.requestId)
      : this.groupService.rejectRequest(request.requestId);

    action$.subscribe({
      next: () => {
        this.pendingRequestsForMyGroups = this.pendingRequestsForMyGroups.filter(
          req => req.requestId !== request.requestId
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`Error ${request.action}ing request:`, err);
        request.uiState = 'idle';
        request.action = undefined;
        this.cdr.detectChanges();
      }
    });
  }

  // Auto-Refresh & Manual Refresh
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.AUTO_REFRESH_INTERVAL).subscribe(() => {
      if (this.currentUserId) {
        console.log('🔄 Auto-refreshing sessions and statistics...');
        this.loadUpcomingSessions(this.currentUserId);
        this.loadUserStatistics(this.currentUserId);
      }
    });
    
    this.groupRefreshSubscription = interval(this.GROUP_REFRESH_INTERVAL).subscribe(() => {
      if (this.currentUserId) {
        console.log('🔄 Auto-refreshing group data...');
        this.loadGroupData(this.currentUserId);
      }
    });
  }

  private stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
    this.groupRefreshSubscription?.unsubscribe();
  }

  manualRefresh(): void {
    console.log('🔄 Manual refresh triggered');
    if (this.currentUserId) {
      this.loadUpcomingSessions(this.currentUserId);
      this.loadUserStatistics(this.currentUserId);
      this.loadGroupData(this.currentUserId);
    } else {
      this.loadInitialData();
    }
  }

  private loadUpcomingSessions(userId: string): void {
    console.log('📡 Fetching sessions for user:', userId);
    this.sessionService.getUpcomingSessions(userId).subscribe({
      next: (sessions: any[]) => {
        console.log('✅ Raw sessions response:', sessions);
        if (!sessions || !Array.isArray(sessions)) {
          console.error('❌ Invalid sessions data:', sessions);
          this.allEvents = [];
          return;
        }
        console.log(`📅 Processing ${sessions.length} sessions`);
        this.zone.run(() => {
          const processedEvents = this.processSessions(sessions);
          console.log('🎯 Processed events:', processedEvents);
          this.allEvents = processedEvents;
          this.updateCalendarEvents(processedEvents);
          this.cdr.detectChanges();
        });
      },
      error: (error: any) => {
        console.error('❌ Error fetching sessions:', error);
        this.handleUserNotLoggedIn();
      }
    });
  }

  private loadUserStatistics(userId: string): void {
    console.log('📊 Loading user statistics for:', userId);
    this.sessionService.getStudyHours(userId).subscribe({
      next: (response: StudyHoursResponse) => {
        this.studyHours = response.totalHours; this.cdr.detectChanges();
      },
      error: (error) => {
        this.studyHours = 0; this.cdr.detectChanges();
      }
    });
    this.sessionService.getSessionsCount(userId).subscribe({
      next: (response: SessionsResponse) => {
        this.sessionsCount = response.numSessions; this.cdr.detectChanges();
      },
      error: (error) => {
        this.sessionsCount = 0; this.cdr.detectChanges();
      }
    });
    this.topicService.getTopicsCount(userId).subscribe({
      next: (response: TopicsResponse) => {
        this.topicsCount = response.numTopics; this.cdr.detectChanges();
      },
      error: (error) => {
        this.topicsCount = 0; this.cdr.detectChanges();
      }
    });
  }

  private updateCalendarEvents(events: EventInput[]): void {
    this.calendarOptions = { ...this.calendarOptions, events: events };
  }

  private processSessions(sessions: any[]): EventInput[] {
    const now = new Date();
    return sessions.map((session, index) => {
      try {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return null;
        }
        const isPastSession = endTime < now;
        
        const displayTitle = session.title || 'Untitled Session';
        
        return {
          id: session.sessionId?.toString() || `session-${index}`,
          title: displayTitle,
          start: startTime,
          end: endTime,
          color: isPastSession ? '#6b7280' : '#5F4B8B',
          textColor: 'white',
          extendedProps: {
            description: session.description || 'No description available',
            location: session.location || 'No location specified',
            creatorName: this.getCreatorDisplayName(session.creatorid),
            creatorId: session.creatorid || 'Unknown',
            isPast: isPastSession,
            sessionId: session.sessionId?.toString() || ''
          }
        };
      } catch (error) {
        return null;
      }
    }).filter(event => event !== null) as EventInput[];
  }

  private handleUserNotLoggedIn(): void {
    console.log('⚠️ User not logged in - showing empty calendar and statistics');
    this.allEvents = [];
    this.currentUserId = '';
    this.studyHours = 0;
    this.sessionsCount = 0;
    this.topicsCount = 0;
    this.updateCalendarEvents([]);
    this.discoverableGroups = [];
    this.myJoinRequests = [];
    this.pendingRequestsForMyGroups = [];
    this.cdr.detectChanges();
  }
}