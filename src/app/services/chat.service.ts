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
  //private apiUrl = 'https://localhost:8080/api/chat';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.API_KEY_ADMIN}`,
      'Content-Type': 'application/json'
    });
  }

  getChatById(id: number): Observable<Chat> {
    return this.http.get<Chat>(`${environment.apiBaseUrl}/chat/${id}`,
      {headers: this.getHeaders()}
    );
  }
}