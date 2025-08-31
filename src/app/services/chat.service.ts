import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Chat {
  chatid: number;
  user1id: number;
  user2id: number;
  
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  getChatById(userid: number): Observable<Chat> {
    return this.http.get<Chat>(`${environment.apiBaseUrl}/chat/getChat?userid=${userid}`,
      {headers: this.getHeaders()}
    );
  }
}