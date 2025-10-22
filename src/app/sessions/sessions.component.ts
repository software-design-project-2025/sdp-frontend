import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, forkJoin, lastValueFrom, Subject, Subscription, of } from 'rxjs';
import {catchError, debounceTime, filter} from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
// **** NEW: Import MatSnackBar ****
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

// Models
import { Session } from '../models/session.model';

// --- Interfaces ---
interface User {
  userid: string; username: string | "unknown"; email: string | "unknown"; role: string; status: string;
  bio: string; degreeid: number; yearofstudy: number; profile_picture: string | null;
}
interface UserCourse { userid: string; courseCode: string; }
interface Module { courseCode: string; courseName: string; facultyid: number; }
interface SupabaseUser { id: string; email: string; name: string; user_metadata: { [key: string]: any }; }

// Services
import { SessionsService, StudyHoursResponse, SessionCountResponse } from '../services/sessions.service';
import { AuthService } from '../services/auth.service';
import { AcademicApiService } from '../services/academic.service';
import { ApiService as FindPartnerApiService } from '../services/findpartner.service';
import { UserService as SupabaseUserService } from '../services/supabase.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  providers: [DatePipe, FindPartnerApiService, SupabaseUserService],
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.scss']
})
export class SessionsComponent implements OnInit, OnDestroy {
  isLoading$ = new BehaviorSubject<boolean>(true);
  currentUserId: string = '';
  currentUser: User | null = null;
  activeTab: string = 'suggestions';

  // --- Source Arrays ---
  private allSessions_src: Session[] = [];
  protected upcomingSessions_src: Session[] = [];
  protected myCreatedSessions_src: Session[] = [];
  protected pastSessions_src: Session[] = [];
  private suggestedSessions_src: Session[] = [];

  // --- Display Arrays ---
  filteredAllSessions: Session[] = [];
  filteredUpcomingSessions: Session[] = [];
  filteredMyCreatedSessions: Session[] = [];
  filteredPastSessions: Session[] = [];
  filteredSuggestedSessions: Session[] = [];

  allModules: Module[] = [];
  currentUserModules: Module[] = [];

  // --- Data Maps ---
  private userNameMap = new Map<string, string>();
  private userCourseMap = new Map<string, Set<string>>();
  private allPgUsers: User[] = [];
  private currentUserCourseCodes = new Set<string>();

  userStats: { totalHours: number, numSessions: number } | null = null;
  filters = { search: '', module: '', startDate: '' };
  showModal = false;
  modalError: string | null = null;
  isEditMode = false;
  editingSessionId: number | null = null;
  newSession = {
    title: '', start_time: '', end_time: '', status: 'scheduled',
    location: 'StudyLink', description: '', groupid: ''
  };

  private filterChange$ = new Subject<void>();
  private filterSubscription: Subscription | null = null;

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private academicApiService: AcademicApiService,
    private datePipe: DatePipe,
    private findPartnerApiService: FindPartnerApiService,
    private supabaseUserService: SupabaseUserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    this.filterSubscription = this.filterChange$.pipe(debounceTime(400))
      .subscribe(() => this.applyFiltersToAllTabs());
    try {
      const userResponse = await this.authService.getCurrentUser();
      if (!userResponse.data?.user?.id) throw new Error('User not authenticated.');
      this.currentUserId = userResponse.data.user.id;
      this.loadAllData();
    } catch (error) {
      console.error('Error loading initial data:', error); this.isLoading$.next(false);
    }
  }

  ngOnDestroy(): void { this.filterSubscription?.unsubscribe(); }

  async loadAllData(): Promise<void> {
    // ... (rest of loadAllData logic remains the same, including forkJoin) ...
    this.isLoading$.next(true);
    const now = new Date();

    forkJoin({
      upcoming: this.sessionsService.getUpcomingSessions(this.currentUserId).pipe(catchError(() => of([]))),
      created: this.sessionsService.getMyCreatedSessions(this.currentUserId).pipe(catchError(() => of([]))),
      past: this.sessionsService.getPastSessions(this.currentUserId).pipe(catchError(() => of([]))),
      discover: this.sessionsService.getDiscoverSessions(this.currentUserId).pipe(catchError(() => of([]))),
      statsHours: this.sessionsService.getStudyHours(this.currentUserId).pipe(catchError(() => of({ userId: this.currentUserId, totalHours: 0, exactHours: 0 }))),
      statsCount: this.sessionsService.getSessionCount(this.currentUserId).pipe(catchError(() => of({ userId: this.currentUserId, numSessions: 0 }))),
      allModules: this.academicApiService.getAllModules().pipe(catchError(() => of([]))),
      allPgUsers: this.findPartnerApiService.getUser().pipe(catchError(() => of([]))),
      allSupabaseUsers: this.supabaseUserService.getAllUsers(), // Promise
      allUserCourses: this.findPartnerApiService.getAllUserCourses().pipe(catchError(() => of([]))),
    }).subscribe({
      next: async (results) => {
        try {
          const supabaseUsers = results.allSupabaseUsers || [];

          // 1. Process User & Module Data
          this.userNameMap.clear();
          supabaseUsers.forEach((u: any) => {
            if (u && u.id && (u.user_metadata?.name || u.name)) {
              this.userNameMap.set(u.id, u.user_metadata?.name || u.name);
            }
          });
          this.allPgUsers = (results.allPgUsers || []) as User[];
          this.currentUser = this.allPgUsers.find(u => u?.userid === this.currentUserId) || null;
          this.userCourseMap.clear();
          (results.allUserCourses || []).forEach((uc: UserCourse) => {
            if (uc && uc.userid && uc.courseCode) {
              if (!this.userCourseMap.has(uc.userid)) this.userCourseMap.set(uc.userid, new Set<string>());
              this.userCourseMap.get(uc.userid)?.add(uc.courseCode);
            }
          });
          this.currentUserCourseCodes = this.userCourseMap.get(this.currentUserId) || new Set<string>();
          this.allModules = (results.allModules || []) as Module[];
          this.currentUserModules = this.allModules.filter(m => m && this.currentUserCourseCodes.has(m.courseCode));

          // 2. Process Session Data
          const createdSessionIds = new Set((results.created || []).map(s => s?.sessionId).filter(id => id != null));
          const upcomingSessionIds = new Set((results.upcoming || []).map(s => s?.sessionId).filter(id => id != null));
          const filteredDiscover = (results.discover || []).filter((s: any) => {
            if (!s || !s.startTime || s.sessionId == null) return false;
            const sessionStartTime = new Date(s.startTime);
            return !createdSessionIds.has(s.sessionId) && !upcomingSessionIds.has(s.sessionId) && sessionStartTime > now;
          });

          // Assign to source arrays
          this.upcomingSessions_src = this.convertSessionDatesAndAddCount(results.upcoming || []);
          this.myCreatedSessions_src = this.convertSessionDatesAndAddCount(results.created || []);
          this.pastSessions_src = this.convertSessionDatesAndAddCount(results.past || []);
          this.allSessions_src = this.convertSessionDatesAndAddCount(filteredDiscover);

          // 3. Create Suggestions List
          this.suggestedSessions_src = [...this.allSessions_src];
          if (this.currentUser) {
            this.suggestedSessions_src.sort((a, b) => {
              if (!a) return 1; if (!b) return -1;
              try {
                const scoreB = this.calculateRelevanceScore(b, this.currentUser!);
                const scoreA = this.calculateRelevanceScore(a, this.currentUser!);
                if (isNaN(scoreB) || isNaN(scoreA)) return 0;
                return scoreB - scoreA;
              } catch (e) { console.error("Sort Error:", e, a, b); return 0; }
            });
          }

          // 4. Finalize
          this.applyFiltersToAllTabs();
          this.userStats = {
            totalHours: results.statsHours?.totalHours ?? 0,
            numSessions: results.statsCount?.numSessions ?? 0
          };
          this.isLoading$.next(false);

        } catch (processingError) {
          console.error("Error processing loaded data:", processingError);
          this.isLoading$.next(false);
        }
      },
      error: (err) => {
        console.error('Failed to load page data:', err);
        this.resetStateOnError();
        this.isLoading$.next(false);
        // **** NEW: Show snackbar on load error ****
        this.showSnackbar('Error loading session data. Please refresh the page.', true);
      }
    });
  }

  // UPDATED: convertSessionDates - using placeholder count '1'
  private convertSessionDatesAndAddCount(sessions: any[]): Session[] {
    return (sessions || []).map(session => {
      if (!session || session.sessionId == null) return null;
      let newStartTime: Date | null = null;
      if (session.startTime && typeof session.startTime === 'string') {
        try { const d=new Date(session.startTime); if(!isNaN(d.getTime())) newStartTime=d; else console.warn("Invalid startTime:", session.startTime); } catch(e){ console.error("Err parsing start:", e);}
      } else if (session.startTime instanceof Date) { newStartTime = session.startTime; }

      let newEndTime: Date | 'infinity' | null = null;
      if (session.endTime === 'infinity') { newEndTime = 'infinity'; }
      else if (session.endTime && typeof session.endTime === 'string') {
        try { const d=new Date(session.endTime); if(!isNaN(d.getTime())) newEndTime=d; else console.warn("Invalid endTime:", session.endTime); } catch(e){ console.error("Err parsing end:", e);}
      } else if (session.endTime instanceof Date) { newEndTime = session.endTime; }

      // Placeholder count
      const participantCount = 1;

      if (newStartTime) {
        return {
          sessionId: session.sessionId, title: session.title || '',
          start_time: newStartTime, end_time: newEndTime,
          status: session.status || 'unknown', location: session.location || '',
          description: session.description || '', creatorid: session.creatorid || '',
          groupid: session.groupid, participantCount: participantCount
        } as Session;
      }
      return null;
    }).filter(s => s !== null) as Session[];
  }

  // --- Filter Logic ---
  onFilterChange(): void { this.filterChange$.next(); }
  applyFiltersToAllTabs(): void {
    this.filteredAllSessions = this.filterSessions(this.allSessions_src);
    this.filteredUpcomingSessions = this.filterSessions(this.upcomingSessions_src);
    this.filteredMyCreatedSessions = this.filterSessions(this.myCreatedSessions_src);
    this.filteredPastSessions = this.filterSessions(this.pastSessions_src);
    this.filteredSuggestedSessions = this.filterSessions(this.suggestedSessions_src);
  }
  private filterSessions(sessions: Session[]): Session[] {
    if (!Array.isArray(sessions)) return [];
    return sessions.filter(session => {
      if (!session || typeof session !== 'object') return false;
      const searchLower = (this.filters.search || '').toLowerCase();
      const titleLower = (session.title || '').toLowerCase();
      const descriptionLower = (session.description || '').toLowerCase();
      const matchesSearch = !searchLower || titleLower.includes(searchLower) || descriptionLower.includes(searchLower);
      const creatorCourseSet = this.userCourseMap.get(session.creatorid) || new Set<string>();
      const matchesModule = !this.filters.module || creatorCourseSet.has(this.filters.module);
      let matchesDate = true;
      if (this.filters.startDate) {
        try { if (session.start_time instanceof Date && !isNaN(session.start_time.getTime())) { const d = new Date(this.filters.startDate); d.setHours(0,0,0,0); matchesDate = session.start_time >= d; } else { matchesDate = false;} }
        catch(e) { matchesDate = false; console.error("Date filter error:", e); }
      }
      return matchesSearch && matchesModule && matchesDate;
    });
  }
  clearFilters(): void {
    this.filters = { search: '', module: '', startDate: '' };
    this.applyFiltersToAllTabs();
  }

  // --- Relevance & Helper Methods ---
  calculateRelevanceScore(session: Session, currentUser: User): number {
    if (!currentUser || !session?.creatorid) return 0; let score = 0;
    const creator = this.allPgUsers.find(u => u?.userid === session.creatorid); if (!creator) return 0;
    if (creator.degreeid != null && currentUser.degreeid != null && creator.degreeid === currentUser.degreeid) score += 10;
    const creatorCourses = this.userCourseMap.get(creator.userid);
    if (creatorCourses && this.currentUserCourseCodes) {
      const shared = [...this.currentUserCourseCodes].filter(c => creatorCourses.has(c)).length; score += shared * 2;
    } return score;
  }
  getCreatorName = (userId?: string): string => userId ? this.userNameMap.get(userId) || 'Unknown User' : 'Unknown User';

  // --- Modal & Create/Edit Methods ---
  createSession(): void { this.isEditMode = false; this.editingSessionId = null; this.resetForm(); this.showModal = true; }
  onEditSession(session: Session): void {
    if (!session?.sessionId) return;
    if (session.status !== 'scheduled') {
      // **** UPDATED: Use snackbar ****
      this.showSnackbar("Only scheduled sessions can be edited.", true); return;
    }
    this.isEditMode = true; this.editingSessionId = session.sessionId; this.modalError = null;
    const format = 'yyyy-MM-ddTHH:mm';
    const start = (session.start_time instanceof Date && !isNaN(session.start_time.getTime())) ? this.datePipe.transform(session.start_time, format) || '' : '';
    const end = (session.end_time instanceof Date && !isNaN(session.end_time.getTime())) ? this.datePipe.transform(session.end_time, format) || '' : '';
    this.newSession = {
      title: session.title || '', start_time: start, end_time: session.end_time === 'infinity' ? '' : end,
      status: session.status || 'scheduled', location: session.location || 'StudyLink',
      description: session.description || '', groupid: session.groupid ? String(session.groupid) : ''
    }; this.showModal = true;
  }
  cancelSession(): void { this.showModal = false; this.modalError = null; this.isEditMode = false; this.editingSessionId = null; }
  private resetForm(): void { this.newSession = { title: '', start_time: '', end_time: '', status: 'scheduled', location: 'StudyLink', description: '', groupid: '' }; }

  async confirmSession(): Promise<void> {
    if (!this.newSession.title || !this.newSession.start_time) { this.modalError = 'Title and Start Time required.'; return; }
    let startTimeISO: string; let endTimeValue: string | 'infinity';
    try {
      startTimeISO = new Date(this.newSession.start_time).toISOString();
      if(this.newSession.end_time) {
        const endDate = new Date(this.newSession.end_time);
        if (endDate <= new Date(this.newSession.start_time)) { this.modalError = 'End time must be after start.'; return; }
        endTimeValue = endDate.toISOString();
      } else { endTimeValue = 'infinity'; }
    } catch (e) { this.modalError = 'Invalid date/time.'; return; }

    try {
      const finalLocation = this.newSession.location || 'StudyLink';
      const payloadBase = {
        title: this.newSession.title, description: this.newSession.description || '', location: finalLocation,
        startTime: startTimeISO, endTime: endTimeValue,
        groupid: this.newSession.groupid || 0 // Assuming backend wants 0 for general
      };

      if (this.isEditMode && this.editingSessionId) {
        const updatePayload = { ...payloadBase };
        await lastValueFrom(this.sessionsService.updateSession(this.editingSessionId, this.currentUserId, updatePayload as Partial<Session>));
        // **** UPDATED: Use snackbar ****
        this.showSnackbar('Session updated successfully!');
      } else {
        const createPayload = { ...payloadBase, status: this.newSession.status, creatorid: this.currentUserId };
        await lastValueFrom(this.sessionsService.createSession(createPayload as Partial<Session>));
        // **** UPDATED: Use snackbar ****
        this.showSnackbar('Session created successfully!');
      }
      this.cancelSession(); this.loadAllData();
    } catch (err: any) {
      console.error('Error saving session:', err);
      let msg = 'Failed to save session.';
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) msg = 'Save failed: Permission denied or session not scheduled.';
        else if (err.error?.message) msg = `Save failed: ${err.error.message}`;
        else msg = `HTTP error (${err.status}).`;
      } else if (err instanceof Error) msg = `Unexpected error: ${err.message}`;
      this.modalError = msg; // Keep modal error for form issues
      // **** NEW: Show snackbar for general save errors ****
      this.showSnackbar(msg, true); // Show error snackbar as well
    }
  }

  // --- Session Action Methods ---
  async onJoinSession(sessionId: number | undefined): Promise<void> {
    if (sessionId === undefined) return;
    try {
      await lastValueFrom(this.sessionsService.joinSession(sessionId, this.currentUserId));
      // **** UPDATED: Use snackbar ****
      this.showSnackbar('Session joined successfully!');
      this.activeTab = 'future'; this.loadAllData();
    } catch (error: any) {
      let msg = 'Error joining session.';
      if (error instanceof HttpErrorResponse && error.status === 409) {
        msg = 'Failed to join: This session conflicts with another session you are already in.';
      } else { console.error('Join Error:', error); }
      // **** UPDATED: Use snackbar ****
      this.showSnackbar(msg, true);
    }
  }
  onLeaveSession(sessionId: number | undefined): void { // Changed return type, no longer async directly
    if (sessionId === undefined) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { message: 'Are you sure you want to leave this session?' },
      width: '350px' // Optional: Set a width
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true) // Only proceed if the user confirmed (clicked 'Yes')
    ).subscribe(async () => { // Make the inner part async
      try {
        await lastValueFrom(this.sessionsService.leaveSession(sessionId, this.currentUserId));
        this.showSnackbar('You have left the session.');
        this.loadAllData();
      } catch (error) {
        console.error('Leave Error:', error);
        this.showSnackbar('Error leaving session.', true);
      }
    });
  }
  onEndSession(sessionId: number | undefined): void { // Changed return type
    if (sessionId === undefined) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { title: 'Confirm End Session', message: 'Are you sure you want to end this session now? This cannot be undone.' },
      width: '350px'
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true)
    ).subscribe(async () => {
      try {
        await lastValueFrom(this.sessionsService.endSession(sessionId, this.currentUserId));
        this.showSnackbar('Session has been ended.');
        this.loadAllData();
      } catch (error) {
        console.error('End Error:', error);
        this.showSnackbar('Error ending session.', true);
      }
    });
  }
  async onExtendSession(sessionId: number | undefined): Promise<void> {
    if (sessionId === undefined) return;
    const defaultTime = this.datePipe.transform(new Date(), 'yyyy-MM-ddTHH:mm') || '';
    const newTimeStr = prompt('Enter new end time (YYYY-MM-DDTHH:MM):', defaultTime); // Keep prompt for input
    if (!newTimeStr) return;
    try {
      const newTime = new Date(newTimeStr);
      if (isNaN(newTime.getTime())) throw new Error("Invalid date format");
      await lastValueFrom(this.sessionsService.extendSession(sessionId, this.currentUserId, newTime.toISOString()));
      // **** UPDATED: Use snackbar ****
      this.showSnackbar('Session extended successfully.');
      this.loadAllData();
    } catch (error) {
      console.error('Extend Error:', error);
      // **** UPDATED: Use snackbar ****
      this.showSnackbar('Error extending session. Invalid format?', true);
    }
  }
  onDeleteSession(sessionId: number | undefined): void { // Changed return type
    if (sessionId === undefined) return;

    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: { title: 'Confirm Delete', message: 'Are you sure you want to permanently delete this session?' },
      width: '350px'
    });

    dialogRef.afterClosed().pipe(
      filter(result => result === true)
    ).subscribe(async () => {
      try {
        await lastValueFrom(this.sessionsService.deleteSession(sessionId, this.currentUserId));
        this.showSnackbar('Session deleted successfully.');
        this.loadAllData();
      } catch (error) {
        console.error('Delete Error:', error);
        this.showSnackbar('Error deleting session.', true);
      }
    });
  }

  // --- Helper Methods ---
  scheduleAgain(pastSession: Session): void {
    if (!pastSession) return; this.resetForm();
    this.newSession = { ...this.newSession, title: `Copy of: ${pastSession.title || 'Session'}`, groupid: pastSession.groupid ? String(pastSession.groupid) : '', description: pastSession.description ?? '', status: 'scheduled', start_time: '', end_time: '' };
    this.isEditMode = false; this.editingSessionId = null; this.showModal = true;
  }
  isOnline(session: Session | null | undefined): boolean { return !!session?.location?.startsWith('http') || session?.location === 'StudyLink'; }
  isCreator(session: Session | null | undefined): boolean { return !!session && session.creatorid === this.currentUserId; }
  joinOnline(session: Session): void {
    if (session?.location?.startsWith('http')) { window.open(session.location, '_blank'); }
    else if (session?.location === 'StudyLink' && session.sessionId) { console.log('Join internal:', session.sessionId); this.showSnackbar(`Navigating to StudyLink session ${session.sessionId}... (TODO)`); } // Use snackbar
    else { console.warn('Invalid location:', session?.location); this.showSnackbar('Cannot join this session online.', true); } // Use snackbar
  }
  getDirections(session: Session): void { console.log('Directions for:', session?.title); }
  viewDetails(session: Session): void { console.log('Details for:', session?.title); }
  viewSummary(pastSession: Session): void { console.log('Summary for:', pastSession?.title); }

  private showSnackbar(message: string, isError: boolean = false): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000, // Duration in milliseconds
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
      verticalPosition: 'top', // Or 'bottom'
      horizontalPosition: 'center' // Or 'start', 'end'
    });
  }

  private resetStateOnError(): void {
    this.allSessions_src = []; this.upcomingSessions_src = []; this.myCreatedSessions_src = []; this.pastSessions_src = []; this.suggestedSessions_src = []; this.currentUserModules = []; this.userNameMap.clear(); this.userCourseMap.clear(); this.allPgUsers = []; this.currentUser = null; this.userStats = null; this.applyFiltersToAllTabs();
  }
}
