import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

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

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`
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

  getUserStats(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/users/stats/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  patchUser(userid: string, userData: any): Observable<any> {
    return this.http.patch(
      `${this.url}/api/users/patch/${userid}`,
      userData,
      { headers: this.getHeaders() }
    );
  }

  postUserCourse(userid: string, courseCode: string): Observable<any> {
    console.log("haha", courseCode);
    return this.http.post<any>(
      `${this.url}/api/courses/post/${userid}`,
      {courseCode: courseCode},
      { headers: this.getHeaders() }
    );
  }

  deleteUserCourse(userid: string, course_code: string): Observable<any> {
    return this.http.delete<any>(
      `${this.url}/api/courses/delete/${userid}/${course_code}`,
      { headers: this.getHeaders() }
    );
  }

  uploadProfilePicture(userId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.put(
      `${this.url}/api/users/${userId}/profile-picture`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }
}
