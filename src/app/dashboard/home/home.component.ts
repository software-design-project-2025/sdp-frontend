import { Component, OnInit, NgZone, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { interval, Subscription } from 'rxjs';

// Services
import { SessionsService, StudyHoursResponse, SessionCountResponse } from '../../services/sessions.service';
import { AuthService } from '../../services/auth.service';
import { TopicApiService } from '../../services/topic.service';

// FIXED: Removed local Session interface and imported the correct shared model
import { Session } from '../../models/session.model';

// This interface can remain local as it's specific to the Topic service call
interface TopicsResponse {
  userId: string;
  numTopics: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  allEvents: EventInput[] = [];
  currentUserId: string = '';

  // Statistics data
  studyHours: number = 0;
  sessionsCount: number = 0;
  topicsCount: number = 0;
  messagesCount: number = 5; // Keeping the static value for messages

  private refreshSubscription: Subscription | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

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
    customButtons: {
      refreshBtn: {
        text: 'Refresh',
        click: () => this.manualRefresh()
      }
    },
    eventClick: (info: EventClickArg) => {
      const event = info.event;
      const desc = event.extendedProps['description'] || 'No description';
      const loc = event.extendedProps['location'] || 'No location';
      const creator = event.extendedProps['creatorId'] || 'Unknown';
      const isPast = event.extendedProps['isPast'] || false;

      // Note: Using alert() is generally discouraged in modern web apps.
      // Consider replacing this with a custom modal for a better user experience.
      alert(
        `Session: ${event.title}\n` +
        `Start: ${event.start?.toLocaleString()}\n` +
        `End: ${event.end?.toLocaleString()}\n` +
        `Location: ${loc}\n` +
        `Description: ${desc}\n` +
        `Created by: ${creator}\n` +
        `Status: ${isPast ? 'Completed ✓' : 'Upcoming'}`
      );
    }
  };

  constructor(
    @Inject(SessionsService) private sessionService: SessionsService,
    @Inject(TopicApiService) private topicService: TopicApiService,
    private zone: NgZone,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🏠 HomeComponent initialized');
    await this.loadSessionsForCurrentUser();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private async loadSessionsForCurrentUser(): Promise<void> {
    try {
      const userResponse = await this.authService.getCurrentUser();

      if (userResponse.data?.user) {
        this.currentUserId = userResponse.data.user.id;
        console.log('✅ User found:', this.currentUserId);
        this.loadUpcomingSessions(this.currentUserId);
        this.loadUserStatistics(this.currentUserId);
      } else {
        console.log('❌ No user logged in');
        this.handleUserNotLoggedIn();
      }
    } catch (error: any) {
      console.error('🚨 Error getting current user:', error);
      this.handleUserNotLoggedIn();
    }
  }

  private loadUpcomingSessions(userId: string): void {
    console.log('📡 Fetching sessions for user:', userId);

    // FIXED: The service now correctly returns Session[] based on the shared model
    this.sessionService.getUpcomingSessions(userId).subscribe({
      next: (sessions: Session[]) => {
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
        console.log('✅ Study hours response:', response);
        this.studyHours = response.totalHours;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error fetching study hours:', error);
        this.studyHours = 0;
        this.cdr.detectChanges();
      }
    });

    this.sessionService.getSessionCount(userId).subscribe({
      next: (response: SessionCountResponse) => {
        console.log('✅ Sessions count response:', response);
        this.sessionsCount = response.numSessions;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error fetching sessions count:', error);
        this.sessionsCount = 0;
        this.cdr.detectChanges();
      }
    });

    this.topicService.getTopicsCount(userId).subscribe({
      next: (response: TopicsResponse) => {
        console.log('✅ Topics count response:', response);
        this.topicsCount = response.numTopics;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error fetching topics count:', error);
        this.topicsCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private updateCalendarEvents(events: EventInput[]): void {
    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  private processSessions(sessions: Session[]): EventInput[] {
    const now = new Date();
    console.log('🕒 Current time:', now);

    return sessions.map((session, index) => {
      try {
        // FIXED: Use the correct snake_case property names from the Session model
        const startTime = new Date(session.start_time);
        // Handle optional end_time
        const endTime = session.end_time ? new Date(session.end_time) : startTime;
        const isPastSession = endTime < now;

        console.log(`   📅 Session "${session.title}":`, {
          startTime: startTime,
          endTime: endTime,
          isPast: isPastSession,
          validStart: !isNaN(startTime.getTime()),
          validEnd: !isNaN(endTime.getTime())
        });

        if (isNaN(startTime.getTime())) {
          console.error(`   🚨 Invalid start date for session: ${session.title}`);
          return null;
        }

        const event: EventInput = {
          id: session.sessionId?.toString() || `session-${index}`,
          title: session.title || 'Untitled Session',
          start: startTime,
          end: endTime,
          color: isPastSession ? '#6b7280' : '#003366',
          textColor: 'white',
          extendedProps: {
            description: session.description || 'No description available',
            location: session.location || 'No location',
            creatorId: session.creatorid || 'Unknown',
            isPast: isPastSession,
            sessionId: session.sessionId?.toString() || ''
          }
        };

        console.log(`   ✅ Created event:`, event);
        return event;

      } catch (error) {
        console.error(`   🚨 Error processing session ${session.title}:`, error);
        return null;
      }
    }).filter(event => event !== null) as EventInput[];
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.AUTO_REFRESH_INTERVAL).subscribe(() => {
      if (this.currentUserId) {
        console.log('🔄 Auto-refreshing sessions and statistics...');
        this.loadUpcomingSessions(this.currentUserId);
        this.loadUserStatistics(this.currentUserId);
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  manualRefresh(): void {
    console.log('🔄 Manual refresh triggered');
    if (this.currentUserId) {
      this.loadUpcomingSessions(this.currentUserId);
      this.loadUserStatistics(this.currentUserId);
    } else {
      this.loadSessionsForCurrentUser();
    }
  }

  private handleUserNotLoggedIn(): void {
    console.log('⚠️ User not logged in - showing empty calendar and statistics');
    this.allEvents = [];
    this.currentUserId = '';
    this.studyHours = 0;
    this.sessionsCount = 0;
    this.topicsCount = 0;
    this.updateCalendarEvents([]);
    this.cdr.detectChanges();
  }
}

