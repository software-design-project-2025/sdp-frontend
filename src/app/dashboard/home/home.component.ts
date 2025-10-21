import { Component, OnInit, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { interval, Subscription } from 'rxjs';

// Import services and the shared Session model
import { SessionsService } from '../../services/sessions.service';
import { AuthService } from '../../services/auth.service';
import { TopicApiService } from '../../services/topic.service';
import { Session } from '../../models/session.model'; // Use the shared model for consistency

// Interfaces for statistic responses
// FIXED: Removed userId to match the type returned by the service layer
interface TopicsResponse {
  numTopics: number;
}

interface SessionsResponse {
  numSessions: number;
}

interface StudyHoursResponse {
  totalHours: number;
  exactHours: number;
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
  messagesCount: number = 5; // Static value for messages

  private refreshSubscription: Subscription | null = null;
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

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

      // Using a modern, non-blocking UI for details is preferable to alert()
      // For this fix, we'll keep alert() as it was in the original code.
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
    private sessionService: SessionsService,
    private topicService: TopicApiService,
    private zone: NgZone,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
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
        this.loadUpcomingSessions(this.currentUserId);
        this.loadUserStatistics(this.currentUserId);
      } else {
        this.handleUserNotLoggedIn();
      }
    } catch (error: any) {
      console.error('Error getting current user:', error);
      this.handleUserNotLoggedIn();
    }
  }

  private loadUpcomingSessions(userId: string): void {
    this.sessionService.getUpcomingSessions(userId).subscribe({
      next: (sessions: Session[]) => {
        if (!sessions || !Array.isArray(sessions)) {
          console.error('Invalid sessions data received:', sessions);
          this.allEvents = [];
          return;
        }

        this.zone.run(() => {
          const processedEvents = this.processSessions(sessions);
          this.allEvents = processedEvents;
          this.updateCalendarEvents(processedEvents);
          this.cdr.detectChanges();
        });
      },
      error: (error: any) => {
        console.error('Error fetching sessions:', error);
        this.handleUserNotLoggedIn();
      }
    });
  }

  private loadUserStatistics(userId: string): void {
    this.sessionService.getStudyHours(userId).subscribe({
      next: (response: StudyHoursResponse) => {
        this.studyHours = response.totalHours;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching study hours:', error);
        this.studyHours = 0;
      }
    });

    this.sessionService.getSessionCount(userId).subscribe({
      next: (response: SessionsResponse) => {
        this.sessionsCount = response.numSessions;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching sessions count:', error);
        this.sessionsCount = 0;
      }
    });

    this.topicService.getTopicsCount(userId).subscribe({
      next: (response: TopicsResponse) => {
        this.topicsCount = response.numTopics;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching topics count:', error);
        this.topicsCount = 0;
      }
    });
  }

  private updateCalendarEvents(events: EventInput[]): void {
    this.calendarOptions = { ...this.calendarOptions, events };
  }

  private processSessions(sessions: Session[]): EventInput[] {
    const now = new Date();

    return sessions.map((session, index) => {
      try {
        const startTime = new Date(session.start_time);
        const endTime = session.end_time ? new Date(session.end_time) : new Date(startTime.getTime() + (60 * 60 * 1000)); // Default to 1 hour if no end time

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          console.error(`Invalid dates for session: ${session.title}`);
          return null;
        }

        const isPastSession = endTime < now;

        const event: EventInput = {
          id: session.sessionId?.toString() || `session-${index}`,
          title: session.title || 'Untitled Session',
          start: startTime,
          end: endTime,
          color: isPastSession ? '#6b7280' : '#003366', // Grey for past, blue for upcoming
          textColor: 'white',
          extendedProps: {
            description: session.description || 'No description available',
            location: session.location || 'No location specified',
            creatorId: session.creatorid || 'Unknown',
            isPast: isPastSession,
            sessionId: session.sessionId?.toString() || ''
          }
        };
        return event;

      } catch (error) {
        console.error(`Error processing session ${session.title}:`, error);
        return null;
      }
    }).filter((event): event is EventInput => event !== null); // Type guard to filter out nulls
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.AUTO_REFRESH_INTERVAL).subscribe(() => {
      if (this.currentUserId) {
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
    if (this.currentUserId) {
      this.loadUpcomingSessions(this.currentUserId);
      this.loadUserStatistics(this.currentUserId);
    } else {
      this.loadSessionsForCurrentUser();
    }
  }

  private handleUserNotLoggedIn(): void {
    this.allEvents = [];
    this.currentUserId = '';
    this.studyHours = 0;
    this.sessionsCount = 0;
    this.topicsCount = 0;
    this.updateCalendarEvents([]);
    this.cdr.detectChanges();
  }
}

