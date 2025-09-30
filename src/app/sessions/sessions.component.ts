// Location: src/app/sessions/sessions.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionDisplay } from '../models/session.model';
import { SessionsService } from '../services/sessions.service';
import { GroupService } from '../services/group.service';
import { Group } from '../models/group.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit {
  sessions: SessionDisplay[] = [];
  pastSessions: any[] = [];
  groups: Group[] = [];

  // Modal control
  showModal = false;

  // Current user info (replace with actual auth service)
  currentUserId = 'user123'; // TODO: Get from auth service

  // Form for new session - simplified to match DB model
  newSession = {
    title: '',
    start_time: '',
    end_time: '',
    status: 'open',
    location: '',
    description: '',
    groupid: 0
  };

  constructor(
    private sessionsService: SessionsService,
    private groupService: GroupService
  ) { }

  ngOnInit(): void {
    console.log('SessionsComponent ngOnInit called');
    this.loadSessions();
    this.loadPastSessions();
    this.loadGroups();
  }

  loadSessions(): void {
    console.log('loadSessions called');
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        console.log('Received sessions:', sessions);
        this.sessions = sessions;
        console.log('Sessions assigned to component:', this.sessions);
      },
      error: (error) => {
        console.error('Error loading sessions:', error);
        this.sessions = [];
      }
    });
  }

  loadPastSessions(): void {
    this.pastSessions = [
      { id: 'past1', title: 'Linear Algebra Study Group', date: 'Aug 8', time: '1:00 PM - 3:00 PM', participantCount: 5, rating: 4.8 },
      { id: 'past2', title: 'Organic Chemistry Lab Prep', date: 'Aug 6', time: '4:00 PM - 6:00 PM', participantCount: 3, rating: 4.5 }
    ];
  }

  loadGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: (groups) => {
        console.log('Received groups:', groups);
        this.groups = groups;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.groups = [];
      }
    });
  }

  // Modal controls
  createSession(): void {
    this.showModal = true;
  }

  confirmSession(): void {
    console.log('Creating session:', this.newSession);

    // Validate required fields
    if (!this.newSession.title || !this.newSession.start_time || !this.newSession.groupid) {
      alert('Please fill in all required fields (Title, Start Time, Group)');
      return;
    }

    // Create the session object for backend
    const backendSession = {
      title: this.newSession.title,
      start_time: this.newSession.start_time,
      end_time: this.newSession.end_time || undefined,
      status: this.newSession.status,
      location: this.newSession.location || undefined,
      description: this.newSession.description || undefined,
      creatorid: this.currentUserId,
      groupid: this.newSession.groupid
    };

    console.log('Backend session:', backendSession);

    // Save to backend
    this.sessionsService.createSession(backendSession).subscribe({
      next: (createdSession) => {
        console.log('Session created successfully:', createdSession);
        // Reload sessions to show the new one
        this.loadSessions();
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating session:', error);
        alert('Failed to create session. Please check console for details.');
      }
    });
  }

  cancelSession(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.newSession = {
      title: '',
      start_time: '',
      end_time: '',
      status: 'open',
      location: '',
      description: '',
      groupid: 0
    };
    this.showModal = false;
  }

  // Existing methods
  getDirections(session: SessionDisplay): void {
    console.log('Get directions for:', session.title);
  }

  joinOnline(session: SessionDisplay): void {
    console.log('Join online session:', session.title);
    if (session.url) {
      window.open(session.url, '_blank');
    }
  }

  viewDetails(session: SessionDisplay): void {
    console.log('View details for:', session.title);
  }

  viewSummary(pastSession: any): void {
    console.log('View summary for:', pastSession.title);
  }

  scheduleAgain(pastSession: any): void {
    console.log('Schedule again:', pastSession.title);
  }
}
