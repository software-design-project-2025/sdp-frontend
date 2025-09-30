import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Session } from '../models/session.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {

  private mockSessions: Session[] = [
    {
      id: '1',
      title: 'Calculus Integration Techniques',
      status: 'confirmed',
      type: 'in-person',
      date: 'Today',
      time: '2:00 PM - 4:00 PM',
      location: 'Library Floor 3, Room 301',
      participantCount: 4,
      maxParticipants: 6,
      url: '',
      organizer: 'Sarah Chen',
      topics: ['Integration by Parts', 'Substitution Method']
    },
    {
      id: '2',
      title: 'Physics Quantum Mechanics',
      status: 'confirmed',
      type: 'online',
      date: 'Tomorrow',
      time: '10:00 AM - 12:00 PM',
      location: 'Virtual - Zoom',
      participantCount: 3,
      url: '',
      maxParticipants: 5,
      organizer: 'Mike Johnson',
      topics: ['Wave Functions', 'Schrödinger Equation']
    },
    {
      id: '3',
      title: 'Data Structures Review',
      status: 'open',
      type: 'in-person',
      date: 'Aug 12',
      time: '3:00 PM - 5:00 PM',
      location: 'Computer Lab B',
      participantCount: 2,
      url: '',
      maxParticipants: 4,
      organizer: 'Emma Davis',
      topics: []
    }
  ];

    constructor(private http: HttpClient) {}

  getSessions(): Observable<Session[]> {
    return of(this.mockSessions);
  }

  private apiUrl = 'http://localhost:8080/api/auth';

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
        'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        });
    }

    getUpcomingSessions(userId: string): Observable<Session[]> {
    const params = new HttpParams().set('userId', userId);
    
    console.log('🔍 [SessionService] Calling:', `${this.apiUrl}/sessions/upcoming`);
    console.log('🔍 [SessionService] With userId:', userId);
    
    return this.http.get<Session[]>(`${this.apiUrl}/sessions/upcoming`, {
        params,
        headers: this.getHeaders()
    });
    }

    getStudyHours(userId: string): Observable<any> {
    const params = new HttpParams().set('userId', userId);
    
    console.log('🔍 [SessionService] Getting study hours for user:', userId);
    
    return this.http.get<any>(`${this.apiUrl}/sessions/study-hours`, {
      params,
      headers: this.getHeaders()
    });
  }

  getSessionsCount(userId: string): Observable<any> {
    const params = new HttpParams().set('userId', userId);
    
    console.log('🔍 [SessionService] Getting sessions count for user:', userId);
    
    return this.http.get<any>(`${this.apiUrl}/sessions/num-sessions`, {
      params,
      headers: this.getHeaders()
    });
  }

}
