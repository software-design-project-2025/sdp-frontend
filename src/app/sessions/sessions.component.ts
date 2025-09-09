import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Session } from '../models/session.model';
import { SessionsService } from '../services/sessions.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit {
  sessions: Session[] = [];
  pastSessions: any[] = [];

  // Modal control
  showModal = false;

  // Form for new session
  newSession: Session = {
    id: '',
    organizer: '',
    participantCount: 0,
    title: '',
    date: '',
    time: '',
    status: 'open',
    type: 'online',
    location: '',
    url: '',
    maxParticipants: 1,
    topics: []
  };

  topicInput = '';

  constructor(private sessionsService: SessionsService) { }

  ngOnInit(): void {
    console.log('SessionsComponent ngOnInit called');
    this.loadSessions();
    this.loadPastSessions();
  }

  loadSessions(): void {
    console.log('loadSessions called');
    this.sessionsService.getSessions().subscribe(sessions => {
      console.log('Received sessions:', sessions);
      this.sessions = sessions;
      console.log('Sessions assigned to component:', this.sessions);
    });
  }

  loadPastSessions(): void {
    this.pastSessions = [
      { id: 'past1', title: 'Linear Algebra Study Group', date: 'Aug 8', time: '1:00 PM - 3:00 PM', participantCount: 5, rating: 4.8 },
      { id: 'past2', title: 'Organic Chemistry Lab Prep', date: 'Aug 6', time: '4:00 PM - 6:00 PM', participantCount: 3, rating: 4.5 }
    ];
  }

  // Modal controls
  createSession(): void {
    this.showModal = true;
  }

  addTopic(): void {
    const topic = this.topicInput.trim();
    if (topic && !this.newSession.topics.includes(topic)) {
      this.newSession.topics.push(topic);
      this.topicInput = '';
    }
  }

  removeTopic(index: number): void {
    this.newSession.topics.splice(index, 1);
  }

  confirmSession(): void {
    // Optionally, save to backend via service
    this.sessions.push({ ...this.newSession, participantCount: 0, organizer: 'You' });
    this.resetForm();
  }

  cancelSession(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.newSession = {
      id: '',
      participantCount: 0,
      organizer: '',
      title: '',
      date: '',
      time: '',
      status: 'open',
      type: 'online',
      location: '',
      url: '',
      maxParticipants: 1,
      topics: []
    };
    this.topicInput = '';
    this.showModal = false;
  }

  // Existing methods
  getDirections(session: Session): void { console.log('Get directions for:', session.title); }
  joinOnline(session: Session): void { console.log('Join online session:', session.title); }
  viewDetails(session: Session): void { console.log('View details for:', session.title); }
  viewSummary(pastSession: any): void { console.log('View summary for:', pastSession.title); }
  scheduleAgain(pastSession: any): void { console.log('Schedule again:', pastSession.title); }
}
