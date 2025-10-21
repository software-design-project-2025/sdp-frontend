import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, forkJoin, lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Models
import { Session } from '../models/session.model';
// NEW: Add models for academic data
interface Module {
  courseCode: string;
  courseName: string;
  facultyId: number;
}

// Services
import { SessionsService, StudyHoursResponse, SessionCountResponse } from '../services/sessions.service';
// import { GroupService } from '../services/group.service'; // Removed for now
import { AuthService } from '../services/auth.service';
// FIXED: Corrected import path
import { AcademicApiService } from '../services/academic.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  providers: [DatePipe], // DatePipe is provided here
  imports: [CommonModule, FormsModule],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit {
  isLoading$ = new BehaviorSubject<boolean>(true);
  currentUserId: string = '';

  // State for tabs
  activeTab: string = 'future';

  // Separate arrays for each tab
  allSessions: Session[] = [];
  upcomingSessions: Session[] = [];
  myCreatedSessions: Session[] = [];
  pastSessions: Session[] = [];

  groups: any[] = [];
  modules: Module[] = [];

  userStats: { totalHours: number, numSessions: number } | null = null;

  // Filter object
  filters = {
    search: '',
    module: '',
    startDate: '',
    endDate: ''
  };

  showModal = false;
  modalError: string | null = null;

  // NEW: State for create/edit modal
  isEditMode = false;
  editingSessionId: number | null = null;

  newSession = {
    title: '',
    start_time: '', // Will be in 'yyyy-MM-ddTHH:mm' format for datetime-local
    end_time: '',   // Will be in 'yyyy-MM-ddTHH:mm' format for datetime-local
    status: 'scheduled',
    location: '',
    description: '',
    groupid: 0
  };

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private academicApiService: AcademicApiService,
    private datePipe: DatePipe // NEW: Inject DatePipe for formatting
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const userResponse = await this.authService.getCurrentUser();
      if (!userResponse.data?.user?.id) {
        throw new Error('User not authenticated.');
      }
      this.currentUserId = userResponse.data.user.id;
      this.loadAllData();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.isLoading$.next(false);
    }
  }

  async loadAllData(): Promise<void> {
    this.isLoading$.next(true);
    const now = new Date(); // Get the current time once

    forkJoin({
      upcoming: this.sessionsService.getUpcomingSessions(this.currentUserId),
      created: this.sessionsService.getMyCreatedSessions(this.currentUserId),
      past: this.sessionsService.getPastSessions(this.currentUserId),
      discover: this.sessionsService.getDiscoverSessions(this.currentUserId),
      statsHours: this.sessionsService.getStudyHours(this.currentUserId),
      statsCount: this.sessionsService.getSessionCount(this.currentUserId),
      modules: this.academicApiService.getAllModules()
    }).subscribe({
      next: ({ upcoming, created, past, discover, statsHours, statsCount, modules }) => {

        // --- NEW DISCOVER FILTERING LOGIC ---
        const createdSessionIds = new Set(created.map(session => session.sessionId));
        const upcomingSessionIds = new Set(upcoming.map(session => session.sessionId));

        // --- DEBUGGING DISCOVER ---
        console.log("--- DEBUGGING DISCOVER ---");
        console.log("Current Time:", now.toISOString());
        console.log("Created IDs:", createdSessionIds);
        console.log("Joined IDs:", upcomingSessionIds);
        console.log("Raw Discover List (before filter):", discover);
        // --- END DEBUGGING ---

        // --- FIX IS HERE: (session: any) ---
        // This tells TypeScript to allow us to read session.startTime
        // (which exists on the raw data) even if it's not in the Session model.
        const filteredDiscover = discover.filter((session: any) => {
          // Use the raw camelCase startTime from the API for comparison
          const sessionStartTime = new Date(session.startTime);

          // Check all 3 rules
          const notCreated = !createdSessionIds.has(session.sessionId);
          const notJoined = !upcomingSessionIds.has(session.sessionId);
          const isFuture = sessionStartTime > now;

          // --- ADD THIS LOGIC ---
          if (!isFuture) {
            console.log(`FILTERED (Past): ${session.title} (Start: ${session.startTime})`);
          } else if (!notJoined) {
            console.log(`FILTERED (Joined): ${session.title} (ID: ${session.sessionId})`);
          } else if (!notCreated) {
            console.log(`FILTERED (Created): ${session.title} (ID: ${session.sessionId})`);
          }
          // --- END LOGIC ---

          return notCreated && notJoined && isFuture;
        });
        // --- END NEW FILTERING LOGIC ---

        // Now convert all the final, filtered lists for the templates
        this.upcomingSessions = this.convertSessionDates(upcoming);
        this.myCreatedSessions = this.convertSessionDates(created);
        this.pastSessions = this.convertSessionDates(past);
        this.allSessions = this.convertSessionDates(filteredDiscover); // Assign the new filtered list

        this.userStats = {
          totalHours: statsHours.totalHours,
          numSessions: statsCount.numSessions
        };

        this.modules = modules;

        // --- Console logs ---
        console.log("--- Sessions Data After Processing ---");
        console.log("Discover (allSessions):", this.allSessions);
        console.log("Future (upcomingSessions):", this.upcomingSessions);
        console.log("My Sessions (myCreatedSessions):", this.myCreatedSessions);
        console.log("Past (pastSessions):", this.pastSessions);
        // --- END ---

        this.isLoading$.next(false);
      },
      error: (err) => {
        console.error('Failed to load page data', err);
        this.isLoading$.next(false);
      }
    });
  }

  // NEW: Helper method to convert date strings to Date objects
  private convertSessionDates(sessions: any[]): Session[] { // Use any[] to handle incoming shape
    return sessions.map(session => {

      // Create Date objects from the camelCase properties
      const newStartTime = typeof session.startTime === 'string'
        ? new Date(session.startTime)
        : session.startTime;

      const newEndTime = session.endTime === 'infinity'
        ? 'infinity'
        : (typeof session.endTime === 'string' ? new Date(session.endTime) : session.endTime);

      return {
        ...session,

        // Assign the new Date objects to the snake_case properties
        // that the HTML template expects.
        start_time: newStartTime,
        end_time: newEndTime
      };
    }) as Session[];
  }

  // --- Filter Methods ---

  applyFilters(): void {
    this.isLoading$.next(true);
    const now = new Date(); // Get current time

    this.sessionsService.getDiscoverSessions(
      this.currentUserId,
      this.filters.search,
      this.filters.startDate ? new Date(this.filters.startDate).toISOString() : undefined,
      this.filters.endDate ? new Date(this.filters.endDate).toISOString() : undefined
    ).subscribe(sessions => {

      // --- ROBUST FILTER FIX ---
      const createdSessionIds = new Set(this.myCreatedSessions.map(s => s.sessionId));
      const upcomingSessionIds = new Set(this.upcomingSessions.map(s => s.sessionId));

      // --- ADD DEBUG LOGS ---
      console.log("--- DEBUGGING FILTERS ---");
      console.log("Current Time:", now.toISOString());
      console.log("Created IDs:", createdSessionIds);
      console.log("Joined IDs:", upcomingSessionIds);
      // --- END DEBUG LOGS ---

      // --- FIX IS HERE: (session: any) ---
      const filteredSessions = sessions.filter((session: any) => {
        // Use the raw camelCase startTime from the API for comparison
        const sessionStartTime = new Date(session.startTime);

        const notCreated = !createdSessionIds.has(session.sessionId);
        const notJoined = !upcomingSessionIds.has(session.sessionId);
        const isFuture = sessionStartTime > now;

        // --- ADD THIS LOGIC ---
        if (!isFuture) {
          console.log(`FILTERED (Past): ${session.title} (Start: ${session.startTime})`);
        } else if (!notJoined) {
          console.log(`FILTERED (Joined): ${session.title}`);
        } else if (!notCreated) {
          console.log(`FILTERED (Created): ${session.title}`);
        }
        // --- END LOGIC ---

        return notCreated && notJoined && isFuture;
      });

      this.allSessions = this.convertSessionDates(filteredSessions);
      // --- END ROBUST FILTER FIX ---

      this.isLoading$.next(false);
    });
  }

  clearFilters(): void {
    this.filters = { search: '', module: '', startDate: '', endDate: '' };
    this.applyFilters(); // Re-run with no filters
  }

  // --- Modal & Create/Edit Methods ---

  createSession(): void {
    this.isEditMode = false;
    this.editingSessionId = null;
    this.resetForm();
    this.showModal = true;
  }

  // NEW: Method to open modal in edit mode
  onEditSession(session: Session): void {
    if (!session.sessionId) return;

    // --- ADDED RULE ---
    // Enforce rule: "I can't edit sessions from the past"
    // We only allow editing if the session is still 'scheduled'.
    if (session.status !== 'scheduled') {
      alert("You can only edit sessions that are still scheduled. Past or in-progress sessions cannot be modified.");
      return;
    }
    // --- END ADDED RULE ---

    this.isEditMode = true;
    this.editingSessionId = session.sessionId;
    this.modalError = null;

    // Format dates for the datetime-local input
    const format = 'yyyy-MM-ddTHH:mm';

    // Handle 'infinity' string when formatting for the input
    const endTime = session.end_time === 'infinity'
      ? ''
      : this.datePipe.transform(session.end_time, format) || '';

    this.newSession = {
      title: session.title,
      // Use DatePipe to format ISO string to datetime-local string
      start_time: this.datePipe.transform(session.start_time, format) || '',
      end_time: endTime,
      status: session.status,
      location: session.location || '',
      description: session.description || '',
      groupid: session.groupid
    };
    this.showModal = true;
  }


  cancelSession(): void {
    this.showModal = false;
    this.modalError = null;
    this.isEditMode = false; // NEW: Reset edit mode
    this.editingSessionId = null; // NEW: Reset editing ID
  }

  private resetForm(): void {
    this.newSession = { title: '', start_time: '', end_time: '', status: 'scheduled', location: '', description: '', groupid: 0 };
  }

  // UPDATED: This method now handles BOTH create and edit
  async confirmSession(): Promise<void> {
    if (!this.newSession.title || !this.newSession.start_time) {
      this.modalError = 'Please fill in all required fields: Title and Start Time.';
      return;
    }

    try {
      if (this.isEditMode && this.editingSessionId) {
        // --- EDIT MODE ---
        // Build a payload with the camelCase keys the backend expects
        // Only include fields that are allowed to be updated
        const updatePayload = {
          title: this.newSession.title,
          description: this.newSession.description,
          location: this.newSession.location,
          // Map snake_case from form to camelCase for backend
          startTime: new Date(this.newSession.start_time).toISOString(),
          endTime: this.newSession.end_time ? new Date(this.newSession.end_time).toISOString() : 'infinity'
        };

        console.log("Sending UPDATE payload:", updatePayload);
        await lastValueFrom(this.sessionsService.updateSession(this.editingSessionId, this.currentUserId, updatePayload));
        alert('Session updated successfully!');

      } else {
        // --- CREATE MODE ---
        // Build a payload with the camelCase keys the backend expects
        // Include all fields needed for a new session
        const createPayload = {
          title: this.newSession.title,
          description: this.newSession.description,
          location: this.newSession.location,
          status: this.newSession.status,
          creatorid: this.currentUserId,
          // Map snake_case from form to camelCase for backend
          startTime: new Date(this.newSession.start_time).toISOString(),
          endTime: this.newSession.end_time ? new Date(this.newSession.end_time).toISOString() : 'infinity',
          groupId: this.newSession.groupid // <-- Map groupid to groupId
        };

        console.log("Sending CREATE payload:", createPayload);
        await lastValueFrom(this.sessionsService.createSession(createPayload));
        alert('Session created successfully!');
      }

      this.cancelSession();
      this.loadAllData(); // Refresh all data on success

    } catch (err: any) {
      console.error('Error saving session:', err);
      if (err.status === 403) {
        this.modalError = 'Failed to save: You do not have permission or the session is not in a scheduled state.';
      } else {
        // This will catch the 400 error if validation fails again
        const errorMsg = err.error?.message || 'Failed to save session. Please try again later.';
        this.modalError = `Failed to save session. Server responded with: "${errorMsg}"`;
      }
    }
  }

  // --- Session Action Methods ---

  async onJoinSession(sessionId: number): Promise<void> {
    try {
      await lastValueFrom(this.sessionsService.joinSession(sessionId, this.currentUserId));
      alert('Session joined successfully!');
      this.activeTab = 'future';
      this.loadAllData();
    } catch (error: any) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 409) {
          alert('Failed to join: This session conflicts with another session you are already in.');
        } else {
          alert(`An error occurred: ${error.message}`);
        }
      } else {
        console.error('An unexpected error occurred:', error);
        alert('An unexpected error occurred. Please try again.');
      }
    }
  }

  async onLeaveSession(sessionId: number): Promise<void> {
    if (sessionId === undefined) return;
    if (!confirm('Are you sure you want to leave this session?')) return;
    try {
      await lastValueFrom(this.sessionsService.leaveSession(sessionId, this.currentUserId));
      alert('You have left the session.');
      this.loadAllData();
    } catch (error) {
      console.error('Error leaving session:', error);
      alert('Failed to leave session.');
    }
  }

  async onEndSession(sessionId: number): Promise<void> {
    if (sessionId === undefined) return;
    if (!confirm('Are you sure you want to end this session now? This cannot be undone.')) return;
    try {
      await lastValueFrom(this.sessionsService.endSession(sessionId, this.currentUserId));
      alert('Session has been ended.');
      this.loadAllData();
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session.');
    }
  }

  async onExtendSession(sessionId: number): Promise<void> {
    if (sessionId === undefined) return;
    const newTime = prompt('Enter new end time (YYYY-MM-DDTHH:MM):', this.datePipe.transform(new Date(), 'yyyy-MM-ddTHH:mm') || undefined);
    if (!newTime) return;

    try {
      await lastValueFrom(this.sessionsService.extendSession(sessionId, this.currentUserId, new Date(newTime).toISOString()));
      alert('Session extended.');
      this.loadAllData();
    } catch (error) {
      console.error('Error extending session:', error);
      alert('Failed to extend session.');
    }
  }

  async onDeleteSession(sessionId: number): Promise<void> {
    if (sessionId === undefined) return;
    if (!confirm('Are you sure you want to permanently delete this session?')) return;
    try {
      await lastValueFrom(this.sessionsService.deleteSession(sessionId, this.currentUserId));
      alert('Session deleted.');
      this.loadAllData();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session.');
    }
  }

  // --- Helper & Utility Methods ---

  scheduleAgain(pastSession: Session): void {
    this.resetForm();
    this.newSession = {
      title: `Copy of: ${pastSession.title}`,
      groupid: pastSession.groupid,
      description: pastSession.description ?? '',
      location: pastSession.location ?? '',
      status: 'scheduled',
      start_time: '',
      end_time: ''
    };
    this.isEditMode = false; // Ensure it's in create mode
    this.editingSessionId = null;
    this.showModal = true;
  }

  isOnline(session: Session): boolean {
    return !!session.location?.startsWith('http');
  }

  isCreator(session: Session): boolean {
    return session.creatorid === this.currentUserId;
  }

  getDirections(session: Session): void { console.log('Getting directions for:', session.title); }
  joinOnline(session: Session): void {
    if (session.location) {
      window.open(session.location, '_blank');
    }
  }
  viewDetails(session: Session): void { console.log('Viewing details for:', session.title); }
  viewSummary(pastSession: Session): void { console.log('Viewing summary for:', pastSession.title); }
}
