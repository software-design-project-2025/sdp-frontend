import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Session } from '../models/session.model';
import { environment } from '../../environments/environment.prod';

// Exported the interface so it can be imported by other components
export interface StudyHoursResponse {
  userId: string;
  totalHours: number;
  exactHours: number;
}

// Exported the interface so it can be imported by other components
export interface SessionCountResponse {
  userId: string;
  numSessions: number;
}

@Injectable({
  providedIn: 'root'
})
export class SessionsService {

  // *** FIXED: Base URL now correctly points to the SessionController's root mapping
  private apiUrl = `${environment.apiBaseUrl}/api/sessions`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  // --- Main Session Discovery & CRUD ---

  /**
   * GET: discoverable sessions with optional filters.
   * This is for the main "All Sessions" view.
   */
  getDiscoverSessions(userId: string, search?: string, startDate?: string, endDate?: string): Observable<Session[]> {
    let params = new HttpParams();
    params = params.set('userId', userId); // <-- ADD THIS LINE

    if (search) {
      params = params.set('search', search);
    }
    if (startDate) {
      // Assumes startDate is an ISO string (e.g., new Date().toISOString())
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    // GET from /api/sessions
    return this.http.get<Session[]>(this.apiUrl, { headers: this.getHeaders(), params }).pipe(
      catchError(this.handleError<Session[]>('getDiscoverSessions', []))
    );
  }

  /**
   * GET: a single session by its ID.
   */
  getSessionById(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session>(`getSessionById id=${id}`))
    );
  }

  /**
   * POST: create a new session.
   * Backend will auto-join the creator.
   */
  createSession(session: Partial<Session>): Observable<Session> {
    // POST to /api/sessions
    return this.http.post<Session>(this.apiUrl, session, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session>('createSession'))
    );
  }

  /**
   * DELETE: a session. (Creator only)
   * Requires userId for backend authorization check.
   */
  deleteSession(sessionId: number, userId: string): Observable<Object> {
    //const params = new HttpParams().set('userId', userId);
    return this.http.delete(`${this.apiUrl}/delete/${sessionId.toString()}/${userId}`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Object>('deleteSession'))
    );
  }

  // --- Session Membership ---

  /**
   * POST: Join a session.
   * Backend performs overlap check.
   */
  joinSession(sessionId: number, userId: string): Observable<any> {
    const params = new HttpParams().set('userId', userId);
    // POST to /api/sessions/{id}/join
    return this.http.post(`${this.apiUrl}/${sessionId}/join`, {}, { headers: this.getHeaders(), params }).pipe(
      catchError(this.handleError<any>('joinSession'))
    );
  }

  /**
   * DELETE: Leave a session.
   * Backend prevents creator from leaving.
   */
  leaveSession(sessionId: number, userId: string): Observable<Object> {
    const params = new HttpParams().set('userId', userId);
    // DELETE from /api/sessions/{id}/leave
    return this.http.delete(`${this.apiUrl}/${sessionId}/leave`, { headers: this.getHeaders(), params }).pipe(
      catchError(this.handleError<Object>('leaveSession'))
    );
  }

  // --- Creator-Only Actions ---

  /**
   * PATCH: Extend a session's end time. (Creator only)
   */
  extendSession(sessionId: number, userId: string, newEndTime: string): Observable<Session> {
    const body = { userId, newEndTime }; // newEndTime should be an ISO String
    // PATCH to /api/sessions/{id}/extend
    return this.http.patch<Session>(`${this.apiUrl}/${sessionId}/extend`, body, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session>('extendSession'))
    );
  }

  /**
   * PATCH: End a session immediately. (Creator only)
   */
  endSession(sessionId: number, userId: string): Observable<Session> {
    const body = { userId };
    // PATCH to /api/sessions/{id}/end
    return this.http.patch<Session>(`${this.apiUrl}/${sessionId}/end`, body, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session>('endSession'))
    );
  }

  // --- Methods for Page Tabs ---

  /**
   * GET: sessions for "Future Sessions" tab
   */
  getUpcomingSessions(userId: string): Observable<Session[]> {
    const params = new HttpParams().set('userId', userId);
    // *** FIXED: URL changed from /auth/sessions/upcoming
    return this.http.get<Session[]>(`${this.apiUrl}/upcoming`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<Session[]>('getUpcomingSessions', [])));
  }

  /**
   * GET: sessions for "Past Sessions" tab
   */
  getPastSessions(userId: string): Observable<Session[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Session[]>(`${this.apiUrl}/past`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<Session[]>('getPastSessions', [])));
  }

  /**
   * GET: sessions for "My Sessions" (created) tab
   */
  getMyCreatedSessions(userId: string): Observable<Session[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Session[]>(`${this.apiUrl}/my-created`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<Session[]>('getMyCreatedSessions', [])));
  }

  /**
   * PUT: Update a session. (Creator only)
   * Requires userId for backend auth.
   */
  updateSession(sessionId: number, userId: string, session: Partial<Session>): Observable<Session> {
    const params = new HttpParams().set('userId', userId);
    return this.http.put<Session>(`${this.apiUrl}/${sessionId}`, session, { headers: this.getHeaders(), params }).pipe(
      catchError(this.handleError<Session>('updateSession'))
    );
  }

  // --- Methods for User Statistics ---

  /**
   * GET: study hours for stats box
   */
  getStudyHours(userId: string): Observable<StudyHoursResponse> {
    const params = new HttpParams().set('userId', userId);
    // *** FIXED: URL changed from /auth/sessions/study-hours
    return this.http.get<StudyHoursResponse>(`${this.apiUrl}/study-hours`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<StudyHoursResponse>('getStudyHours', { userId, totalHours: 0, exactHours: 0 })));
  }

  /**
   * GET: session count for stats box
   */
  getSessionCount(userId: string): Observable<SessionCountResponse> {
    const params = new HttpParams().set('userId', userId);
    // *** FIXED: URL changed from /auth/sessions/num-sessions
    return this.http.get<SessionCountResponse>(`${this.apiUrl}/num-sessions`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<SessionCountResponse>('getSessionCount', { userId, numSessions: 0 })));
  }

  // --- Private Error Handler ---

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      // Let the app keep running by returning an empty/default result.
      return of(result as T);
    };
  }
}
