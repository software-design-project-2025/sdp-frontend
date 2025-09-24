import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root' // Makes the service a singleton
})
export class ApiService {
  constructor(private http: HttpClient) { }

  private url = environment.apiBaseUrl;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`, //needs fixing
      'Content-Type': 'application/json'
    });
  }

  getUser(): Observable<any> {
    return this.http.get(`${this.url}/api/users/all`,
        {headers: this.getHeaders()}
    );
  }

  getDegree(): Observable<any> {
    return this.http.get(`${this.url}/api/degree/all`,
      {headers: this.getHeaders()}
    );
  }

  getModule(): Observable<any> {
    return this.http.get(`${this.url}/api/module/all`,
      {headers: this.getHeaders()}
    );
  }

  getUserCourseById(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/courses/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  getAllUserCourses(): Observable<any> {
    return this.http.get(`${this.url}/api/courses/all`,
      { headers: this.getHeaders() }
    );
  }

  postData(data: any): Observable<any> {
    return this.http.post('YOUR_API_ENDPOINT/data', data);
  }
}
