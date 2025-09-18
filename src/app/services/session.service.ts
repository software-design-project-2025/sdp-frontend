import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

    constructor(private http: HttpClient) {}

    getUpcomingSessions(userId: string): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.apiUrl}/sessions/upcoming?userId=${userId}`);
    }
}
