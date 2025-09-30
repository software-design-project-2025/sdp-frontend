// Location: src/app/services/group.service.ts

import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Group } from '../models/group.model';
import {environment} from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = `${environment.apiBaseUrl}`;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) { }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl).pipe(
      catchError(this.handleError<Group[]>('getAllGroups', []))
    );
  }

  getGroupById(id: number): Observable<Group | undefined> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError<Group>('getGroupById'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }
}
