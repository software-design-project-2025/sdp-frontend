import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthService } from '../../services/auth.service';
import { SessionService, Session } from '../../services/session.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, FullCalendarModule, RouterModule]
})
export class HomeComponent implements OnInit {
  isLoading = true;
  userName = '';
  userId = '';   // 🔑 primary identifier in DB

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    height: 'auto',
    events: []  // will be filled dynamically
  };

  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log('HomeComponent: Initializing...');
    await this.checkAuthentication();
  }

  async checkAuthentication() {
    try {
      const { data: { session }, error } = await this.authService.getSession();

      if (error || !session) {
        console.error('HomeComponent: Authentication failed:', error);
        this.router.navigate(['/login']);
        return;
      }

      // ✅ set userid from session
      this.userId = session.user.id;

      // ✅ displayable name (fallback to userid if none in metadata)
      this.userName = session.user.user_metadata?.['name']
        || session.user.user_metadata?.['full_name']
        || this.userId;

      console.log('HomeComponent: User authenticated:', this.userName, 'ID:', this.userId);

      // ✅ fetch upcoming sessions
      this.loadUpcomingSessions(this.userId);

      this.isLoading = false;

    } catch (error) {
      console.error('HomeComponent: Error checking authentication:', error);
      this.router.navigate(['/login']);
    }
  }

  loadUpcomingSessions(userId: string) {
    this.sessionService.getUpcomingSessions(userId).subscribe({
      next: (sessions: Session[]) => {
        console.log('Fetched upcoming sessions:', sessions);

        // Map backend sessions to FullCalendar events
        this.calendarOptions.events = sessions.map(s => ({
          title: s.title,
          start: s.startTime,
          end: s.endTime,
          color: '#003366'
        }));
      },
      error: (err) => {
        console.error('Error fetching sessions:', err);
      }
    });
  }

  async logout() {
    try {
      console.log('HomeComponent: Logging out...');
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('HomeComponent: Logout error:', error);
    }
  }
}
