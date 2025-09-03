import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../chat/chat';

export interface Chat {
  chatid: number;
  user1: User;
  user2: User;
  
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  getChatById(userid: String): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${environment.apiBaseUrl}/api/chat/getChat?userid=${userid}`,
      {headers: this.getHeaders()}
    );
  }
}