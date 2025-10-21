import { Component, OnInit, NgZone, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; // ADD Router import
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SessionsService } from '../../services/sessions.service';
import { AuthService } from '../../services/auth.service';
import { TopicApiService } from '../../services/topic.service';
import { BehaviorSubject, firstValueFrom, forkJoin, interval, Subscription } from 'rxjs';
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

// Type for button state
type JoinButtonState = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule, FormsModule, SessionDetailsModalComponent]
})
export class HomeComponent implements OnInit, OnDestroy {
  // Loading state
  isLoading$ = new BehaviorSubject<boolean>(true);
  
  // ADD: Navigation loading state
  isNavigating$ = new BehaviorSubject<boolean>(false);

  allEvents: EventInput[] = [];
  currentUserId: string = '';
  studyHours: number = 0;
  sessionsCount: number = 0;
  topicsCount: number = 0;
  messagesCount: number = 0;
  private refreshSubscription: Subscription | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

  // Properties for Group Feature
  private userNameCache = new Map<string, string>();
  private groupRefreshSubscription: Subscription | null = null;
  // Set to 30 minutes per your request
  private readonly GROUP_REFRESH_INTERVAL = 30 * 60 * 1000;
  discoverableGroups: Group[] = [];
  myJoinRequests: GroupJoinRequest[] = [];
  pendingRequestsForMyGroups: DisplayableGroupJoinRequest[] = [];

  // UI state for "Request to Join" buttons
  discoverGroupUiState = new Map<number, JoinButtonState>();

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
    private router: Router // ADD Router injection
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🏠 HomeComponent initialized');
    await this.loadInitialData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // ADD: Start Messaging Function (similar to your teammate's messageOnClick)
  async startMessaging(groupId: number): Promise<void> {
    this.isNavigating$.next(true);
    
    try {
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to chats page with the group ID as a parameter
      this.router.navigate(['/chat'], { 
        queryParams: { groupId: groupId } 
      });
      
    } catch (error) {
      console.error('Error navigating to chats:', error);
      this.isNavigating$.next(false);
    }
  }

  // Caching function to get user names
  private async getUserName(userId: string): Promise<string> {
      // 1. Return 'Unknown' if no ID is provided
      if (!userId) {
          return 'Unknown User';
      }

      // 2. Check cache first
      if (this.userNameCache.has(userId)) {
          return this.userNameCache.get(userId)!;
      }

      // 3. If not in cache, fetch from AuthService
      try {
          const { data, error } = await this.authService.getUserById(userId);
          
          if (error || !data) {
              throw error || new Error('User not found');
          }

          const userName = data.name || 'Unknown User';
          this.userNameCache.set(userId, userName); // 4. Save to cache
          return userName;

      } catch (error) {
          console.error(`Error fetching user name for ${userId}:`, error);
          const fallbackName = 'Unknown User';
          this.userNameCache.set(userId, fallbackName); // Cache fallback to prevent re-fetching
          return fallbackName;
      }
  }

  // handle loading state and parallel fetching
  private async loadInitialData(): Promise<void> {
    this.isLoading$.next(true);
    try {
      const userResponse = await this.authService.getCurrentUser();
      
      if (userResponse.data?.user) {
        this.currentUserId = userResponse.data.user.id;
        console.log('✅ User found:', this.currentUserId);

        // Fetch all data in parallel
        const [sessions, stats, groupData, msgCount] = await Promise.all([
          firstValueFrom(this.sessionService.getUpcomingSessions(this.currentUserId)),
          this.loadUserStatistics(this.currentUserId),
          this.loadGroupData(this.currentUserId),
          firstValueFrom(this.groupService.getUnreadCount(this.currentUserId))
        ]);

        // Process data after all fetches are complete
        this.processAndLoadSessions(sessions);
        this.messagesCount = msgCount;
        
      } else {
        console.log('❌ No user logged in');
        this.handleUserNotLoggedIn();
      }
    } catch (error: any) {
      console.error('🚨 Error getting current user:', error);
      this.handleUserNotLoggedIn();
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Session Details Methods (now async to fetch name)
  async showSessionDetails(event: any): Promise<void> {
    const creatorId = event.extendedProps['creatorId'];
    // This will fetch the name from cache or Supabase
    const creatorName = await this.getUserName(creatorId);

    const sessionData = {
        title: event.title,
        start: event.start,
        end: event.end,
        location: event.extendedProps['location'],
        description: event.extendedProps['description'],
        creatorName: creatorName, // <-- Use the fetched name
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

  // Helper to get button state
  getJoinButtonState(groupId: number): JoinButtonState {
    return this.discoverGroupUiState.get(groupId) || 'idle';
  }

  // Group Methods
  private async loadGroupData(userId: string): Promise<void> {
    await Promise.all([
      this.loadDiscoverableGroups(userId),
      this.loadMyJoinRequests(userId),
      this.loadPendingRequestsForMyGroups(userId)
    ]);
  }

  // set button states
  private async loadDiscoverableGroups(userId: string): Promise<void> {
    try {
      const groups = await firstValueFrom(this.groupService.discoverGroups(userId));
      this.discoverableGroups = groups;
      // Initialize UI states for buttons
      groups.forEach(group => {
        if (!this.discoverGroupUiState.has(group.groupid)) {
          this.discoverGroupUiState.set(group.groupid, 'idle');
        }
      });
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error fetching discoverable groups:', err);
    }
  }

  private async loadMyJoinRequests(userId: string): Promise<void> {
    try {
      this.myJoinRequests = await firstValueFrom(this.groupService.getMyRequests(userId));
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error fetching my join requests:', err);
    }
  }

  // Updated to fetch and map real user names
  private async loadPendingRequestsForMyGroups(userId: string): Promise<void> {
    try {
        const requests = await firstValueFrom(this.groupService.getPendingRequestsForCreator(userId));
        
        // Asynchronously fetch all user names for the requests
        this.pendingRequestsForMyGroups = await Promise.all(
            requests.map(async (request) => {
                // This fetches the REAL name from Supabase via authService
                const fetchedUserName = await this.getUserName(request.userId);
                return {
                    ...request,
                    // This overwrites the 'userName' (which was 'bio') with the correct name
                    userName: fetchedUserName,
                    uiState: 'idle' as const
                };
            })
        );
        
        this.cdr.detectChanges();
    } catch (err) {
        console.error('Error fetching pending requests for creator:', err);
    }
  }
  
  joinGroup(groupId: number): void {
    if (!this.currentUserId || this.getJoinButtonState(groupId) !== 'idle') {
      return; // Do nothing if not logged in or already sending
    }

    // Set sending state
    this.discoverGroupUiState.set(groupId, 'sending');
    this.cdr.detectChanges();

    this.groupService.requestToJoin(groupId, this.currentUserId).subscribe({
      next: () => {
        // Success - show green "sent" state
        this.discoverGroupUiState.set(groupId, 'sent');
        this.cdr.detectChanges();
        
        // Refresh group data
        this.loadGroupData(this.currentUserId);

        // Reset button to idle state after 3 seconds
        setTimeout(() => {
          if (this.getJoinButtonState(groupId) === 'sent') {
            this.discoverGroupUiState.set(groupId, 'idle');
            this.cdr.detectChanges();
          }
        }, 3000);
      },
      error: (err) => {
        console.error('Error sending join request:', err);
        // Show error state
        this.discoverGroupUiState.set(groupId, 'error');
        this.cdr.detectChanges();

        // Reset button to idle state after 3 seconds
        setTimeout(() => {
          if (this.getJoinButtonState(groupId) === 'error') {
            this.discoverGroupUiState.set(groupId, 'idle');
            this.cdr.detectChanges();
          }
        }, 3000);
      }
    });
  }

  createGroup(form: NgForm): void {
    if (form.invalid || !this.currentUserId) {
      return; //
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
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          this.isGroupCreated = false;
          this.cdr.detectChanges();
        }, 3000);
        
        this.loadGroupData(this.currentUserId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating group:', err);
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
        // Refetched and processed
        firstValueFrom(this.sessionService.getUpcomingSessions(this.currentUserId))
          .then(sessions => this.processAndLoadSessions(sessions));
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
      firstValueFrom(this.sessionService.getUpcomingSessions(this.currentUserId))
        .then(sessions => this.processAndLoadSessions(sessions));
      this.loadUserStatistics(this.currentUserId);
      this.loadGroupData(this.currentUserId);
    } else {
      this.loadInitialData();
    }
  }

  // Split into fetch and process
  private loadUpcomingSessions(userId: string): void {
    // just a wrapper for the new async logic
    firstValueFrom(this.sessionService.getUpcomingSessions(userId))
      .then(sessions => this.processAndLoadSessions(sessions))
      .catch(error => {
        console.error('❌ Error fetching sessions:', error);
        this.handleUserNotLoggedIn();
      });
  }

  // Separated processing logic
  private processAndLoadSessions(sessions: any[]): void {
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
  }

  private async loadUserStatistics(userId: string): Promise<void> {
    console.log('📊 Loading user statistics for:', userId);
    try {
      const { hours, sessions, topics } = await firstValueFrom(forkJoin({
        hours: this.sessionService.getStudyHours(userId),
        sessions: this.sessionService.getSessionsCount(userId),
        topics: this.topicService.getTopicsCount(userId)
      }));
      
      this.studyHours = hours.totalHours;
      this.sessionsCount = sessions.numSessions;
      this.topicsCount = topics.numTopics;
    } catch (error) {
      console.error('Error loading one or more stats', error);
      this.studyHours = 0;
      this.sessionsCount = 0;
      this.topicsCount = 0;
    }
    this.cdr.detectChanges();
  }

  private updateCalendarEvents(events: EventInput[]): void {
    this.calendarOptions = { ...this.calendarOptions, events: events };
  }

  // Corrected to remove the call to the deleted function
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
            // creatorName is no longer needed here, it's fetched on click
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