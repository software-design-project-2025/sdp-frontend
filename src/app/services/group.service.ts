import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
//import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
//import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

// Define interfaces for strong typing
export interface Group {
    groupid: number;
    title: string;
    goal: string;
    creatorid: string;
}

export interface GroupJoinRequest {
    requestId: number;
    groupId: number;
    groupTitle: string;
    userId: string;
    userName: string;
    status: 'pending' | 'approved' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  // CORRECTED: The API URL now correctly includes the /api prefix
  private apiUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) { }

    //This private method creates the authorization headers
    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
        'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
        });
    }

  /**
   * Generic error handler for API calls.
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }

    // Method to create a new group
    createGroup(groupData: { title: string; goal: string; creatorid: string }): Observable<Group> {
        return this.http.post<Group>(`${environment.apiBaseUrl}/api/auth/groups`, groupData, { headers: this.getHeaders() });
    }

    // approve a join request
    approveRequest(requestId: number): Observable<any> {
        return this.http.post(`${environment.apiBaseUrl}/api/auth/join-requests/${requestId}/approve`, {}, { headers: this.getHeaders() });
    }

    // reject a join request
    rejectRequest(requestId: number): Observable<any> {
        return this.http.post(`${environment.apiBaseUrl}/api/auth/join-requests/${requestId}/reject`, {}, { headers: this.getHeaders() });
    }

   // Fetches 5 random groups the user can join.
    discoverGroups(userId: string): Observable<Group[]> {
        const params = new HttpParams().set('userId', userId);
        return this.http.get<Group[]>(`${environment.apiBaseUrl}/api/auth/groups/discover`, {
        params,
        headers: this.getHeaders()
        });
    }

   // Sends a request for a user to join a group.
    requestToJoin(groupId: number, userId: string): Observable<GroupJoinRequest> {
        return this.http.post<GroupJoinRequest>(`${environment.apiBaseUrl}/api/auth/join-requests`,
        { groupId, userId },
        { headers: this.getHeaders() }
        );
    }

   // Gets the status of all requests a user has made, with detailed information.
    getMyRequests(userId: string): Observable<GroupJoinRequest[]> {
        const params = new HttpParams().set('userId', userId);
        return this.http.get<GroupJoinRequest[]>(`${environment.apiBaseUrl}/api/auth/join-requests/my-status/details`, {
        params,
        headers: this.getHeaders()
        });
    }

   // Gets pending join requests for groups created by the specified user.
    getPendingRequestsForCreator(creatorId: string): Observable<GroupJoinRequest[]> {
        const params = new HttpParams().set('creatorId', creatorId);
            return this.http.get<GroupJoinRequest[]>(`${environment.apiBaseUrl}/api/auth/join-requests/for-creator`, {
            params,
            headers: this.getHeaders()
        });
    }
  /**
   * Fetches all groups that the user is a part of.
   * Endpoint: GET /api/auth/groups
   */
  getAllGroups(): Observable<Group[]> {
    // CORRECTED: The endpoint now matches the GroupController's @RequestMapping
    return this.http.get<Group[]>(`${this.apiUrl}/auth/groups`, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError<Group[]>('getAllGroups', []))
    );
  }
  getUnreadCount(userid: string): Observable<number> {
    return this.http.get<number>(`${environment.apiBaseUrl}/api/chat/getTotalUnreadCount?userid=${userid}`, {
      headers: this.getHeaders()
    });
  }
}




