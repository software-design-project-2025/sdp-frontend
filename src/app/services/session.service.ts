import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Session {
    sessionId: number;
    title: string;
    startTime: string;  // ISO string from backend
    endTime: string;
    status: string;
    location: string;
    description: string;
    creatorId: string;
    groupId?: number | null;
}

@Injectable({
    providedIn: 'root'
})
export class SessionService {
    private apiUrl = 'http://localhost:8080/api/auth';

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
        'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        });
    }

    constructor(private http: HttpClient) {}

    getUpcomingSessions(userId: string): Observable<Session[]> {
        const params = new HttpParams().set('userId', userId);
        return this.http.get<Session[]>(`${this.apiUrl}/sessions/upcoming`,
        { params,
        headers: this.getHeaders()
        });
    }
}
