// home.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  standalone: true,
  imports: [FullCalendarModule, RouterModule]
})
export class HomeComponent {
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
      // Sample events - replace with your actual data
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
}