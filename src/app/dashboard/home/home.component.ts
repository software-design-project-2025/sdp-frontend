// home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthService } from '../../services';

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
  userEmail = '';

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    height: 'auto',
    events: [
      {
        title: 'Math Study Group',
        date: '2025-08-15',
        color: '#003366'
      },
      {
        title: 'Physics Session',
        date: '2025-08-18',
        color: '#0055aa'
      }
    ]
  };

  constructor(
    private authService: AuthService,
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

      // Set user information
      this.userName = session.user.user_metadata?.['name'] ||
        session.user.user_metadata?.['full_name'] ||
        session.user.email?.split('@')[0] ||
        'User';
      this.userEmail = session.user.email || '';

      console.log('HomeComponent: User authenticated:', this.userName);
      this.isLoading = false;

    } catch (error) {
      console.error('HomeComponent: Error checking authentication:', error);
      this.router.navigate(['/login']);
    }
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
