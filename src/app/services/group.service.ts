import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Group } from '../models/group.model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  // CORRECTED: The API URL now correctly includes the /api prefix
  private apiUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) { }

  /**
   * Creates the required authorization headers for every API request,
   * ensuring the Bearer token is always included.
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
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
}
