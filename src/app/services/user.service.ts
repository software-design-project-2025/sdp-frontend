import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
//import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root' // Makes the service a singleton
})
export class UserApiService {
  constructor(private http: HttpClient) { }

  private url = `${environment.apiBaseUrl}`;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  getUserById(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/users/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  getUserCourses(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/courses/${userid}`,
      { headers: this.getHeaders() }
    );
  }
}
