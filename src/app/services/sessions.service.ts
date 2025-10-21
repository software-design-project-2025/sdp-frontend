import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Session } from '../models/session.model';
import { environment } from '../../environments/environment.prod';

// FIXED: Exported the interface so it can be imported by other components
export interface StudyHoursResponse {
  userId: string;
  totalHours: number;
  exactHours: number;
}

// FIXED: Exported the interface so it can be imported by other components
export interface SessionCountResponse {
  userId: string;
  numSessions: number;
}

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  // Corrected the base URL to include '/api'
  private apiUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  // Corrected method name to getSessions, returns raw Session objects
  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/sessions`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session[]>('getSessions', []))
    );
  }

  // FIXED: The parameter type now correctly reflects the data sent from the component
  // It accepts a partial session object, as 'sessionId' is not known on creation.
  createSession(session: Partial<Session>): Observable<Session> {
    return this.http.post<Session>(`${this.apiUrl}/sessions`, session, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Session>('createSession'))
    );
  }

  // --- Methods for User Statistics ---

  getUpcomingSessions(userId: string): Observable<Session[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Session[]>(`${this.apiUrl}/auth/sessions/upcoming`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<Session[]>('getUpcomingSessions', [])));
  }

  getStudyHours(userId: string): Observable<StudyHoursResponse> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<StudyHoursResponse>(`${this.apiUrl}/auth/sessions/study-hours`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<StudyHoursResponse>('getStudyHours', { userId, totalHours: 0, exactHours: 0 })));
  }

  getSessionCount(userId: string): Observable<SessionCountResponse> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<SessionCountResponse>(`${this.apiUrl}/auth/sessions/num-sessions`, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError<SessionCountResponse>('getSessionCount', { userId, numSessions: 0 })));
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }
}

