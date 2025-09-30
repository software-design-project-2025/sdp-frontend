// Location: src/app/services/sessions.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Session, SessionDisplay } from '../models/session.model';
import {environment} from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {
  private apiUrl = `${environment.apiBaseUrl}`;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) { }

  getSessions(): Observable<SessionDisplay[]> {
    return this.http.get<Session[]>(this.apiUrl).pipe(
      map(sessions => sessions.map(s => this.convertToDisplay(s))),
      catchError(this.handleError<SessionDisplay[]>('getSessions', []))
    );
  }

  getSessionById(id: number): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError<Session>('getSessionById'))
    );
  }

  getSessionsByCreator(creatorId: string): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/creator/${creatorId}`).pipe(
      catchError(this.handleError<Session[]>('getSessionsByCreator', []))
    );
  }

  getSessionsByGroup(groupId: number): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/group/${groupId}`).pipe(
      catchError(this.handleError<Session[]>('getSessionsByGroup', []))
    );
  }

  createSession(session: any): Observable<Session> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Session>(this.apiUrl, session, { headers }).pipe(
      catchError(this.handleError<Session>('createSession'))
    );
  }

  updateSession(id: number, session: Session): Observable<Session> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<Session>(`${this.apiUrl}/${id}`, session, { headers }).pipe(
      catchError(this.handleError<Session>('updateSession'))
    );
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError<void>('deleteSession'))
    );
  }

  // Convert backend Session to frontend SessionDisplay
  private convertToDisplay(session: Session): SessionDisplay {
    const startTime = new Date(session.start_time);
    const endTime = session.end_time ? new Date(session.end_time) : null;

    // Determine if it's online or in-person based on location
    const isUrl = session.location && (session.location.startsWith('http://') || session.location.startsWith('https://'));
    const isOnline = !session.location || session.location === 'online' || isUrl;

    return {
      sessionId: session.sessionId,
      title: session.title,
      date: startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${endTime ? ' - ' + endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`,
      status: session.status,
      type: isOnline ? 'online' : 'in-person',
      location: !isUrl && session.location ? session.location : undefined,
      url: isUrl ? session.location : undefined,
      organizer: session.creatorid,
      participantCount: 0, // You'll need to get this from SessionMembers
      maxParticipants: 10, // Default or get from elsewhere
      topics: session.description ? session.description.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
      description: session.description
    };
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }
}
