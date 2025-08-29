// home.component.ts - FIXED VERSION
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
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
    await this.loadUserData();
  }

  async loadUserData() {
    try {
      const { data: { session } } = await this.authService.getSession();
      
      if (session?.user) {
        // Set user information - AuthGuard already verified user exists
        this.userName = session.user.user_metadata?.['name'] ||
                      session.user.user_metadata?.['full_name'] ||
                      session.user.email?.split('@')[0] ||
                      'User';
        this.userEmail = session.user.email || '';
        
        console.log('HomeComponent: User data loaded:', this.userName);
      }
      
      this.isLoading = false;
      
    } catch (error) {
      console.error('HomeComponent: Error loading user data:', error);
      this.isLoading = false;
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