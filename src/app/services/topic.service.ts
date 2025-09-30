import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root' // Makes the service a singleton
})
export class TopicApiService {
  constructor(private http: HttpClient) { }

  private url = `${environment.apiBaseUrl}`;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  getAllTopics(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/topic/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  getTopicStats(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/topic/stats/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  getWeeklyStats(userid: string): Observable<any> {
    return this.http.get(`${this.url}/api/topic/weekly-hours/${userid}`,
      { headers: this.getHeaders() }
    );
  }

  getTopicsCount(userId: string): Observable<any> {
    const params = new HttpParams().set('userId', userId);
    
    console.log('🔍 [TopicApiService] Getting topics count for user:', userId);
    
    return this.http.get<any>(`${this.url}/api/topic/topics/num-topics`, {
      params,
      headers: this.getHeaders()
    });
  }

}
