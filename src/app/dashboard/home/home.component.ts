import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SessionService, Session } from '../../services/session.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-home-enhanced',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule]
})
export class HomeComponent implements OnInit, OnDestroy {
  allEvents: EventInput[] = [];
  currentUserId: string | null = null;
  private refreshSubscription: Subscription | null = null;
  
  private readonly AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,refreshBtn',
      center: 'title today',
      right: 'next'
    },
    height: 'auto',
    events: this.allEvents,
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
      
      alert(
        `Session: ${event.title}\n` +
        `Start: ${event.start}\n` +
        `End: ${event.end}\n` +
        `Location: ${loc}\n` +
        `Description: ${desc}\n` +
        `Created by: ${creator}\n` +
        `Status: ${isPast ? 'Completed ✓' : 'Upcoming'}`
      );
    }
  };

  constructor(
    private sessionService: SessionService,
    private zone: NgZone,
    private authService: AuthService
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
      } else {
        this.handleUserNotLoggedIn();
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      this.handleUserNotLoggedIn();
    }
  }

  private loadUpcomingSessions(userId: string) {
    console.log('Loading sessions for user:', userId);
    
    this.sessionService.getUpcomingSessions(userId).subscribe({
      next: (sessions: Session[]) => {
        console.log('Sessions loaded:', sessions.length, 'sessions');
        
        this.zone.run(() => {
          this.allEvents = this.processSessions(sessions);
          this.calendarOptions = { ...this.calendarOptions, events: this.allEvents };
        });
      },
      error: (err) => {
        console.error('Error fetching sessions:', err);
      }
    });
  }

  private processSessions(sessions: Session[]): EventInput[] {
    const now = new Date();
    
    return sessions.map(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      const isPastSession = endTime < now;
      
      return {
        title: session.title,
        start: startTime,
        end: endTime,
        color: isPastSession ? '#6b7280' : '#003366',
        textColor: isPastSession ? '#9ca3af' : 'white',
        extendedProps: {
          description: session.description,
          location: session.location,
          creatorId: session.creatorId,
          isPast: isPastSession,
          sessionId: session.sessionId  // Fixed this line
        },
        classNames: isPastSession ? ['past-session'] : []
      };
    });
  }

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.AUTO_REFRESH_INTERVAL).subscribe(() => {
      if (this.currentUserId) {
        this.loadUpcomingSessions(this.currentUserId);
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  manualRefresh(): void {
    if (this.currentUserId) {
      this.loadUpcomingSessions(this.currentUserId);
    }
  }

  private handleUserNotLoggedIn(): void {
    this.allEvents = [];
    this.calendarOptions = { ...this.calendarOptions, events: this.allEvents };
  }
}