import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { User } from '../chat/chat';

export interface Chat {
  chatid: number;
  user1: User;
  user2: User;
  
}

export interface ChatMessage {
  messageid: number;
  chat: Chat;
  sender: User;
  sentDateTime: Date;
  message: string;
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

  getMessagesByChatId(chatid: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiBaseUrl}/api/chatMessage/getMessage?chatid=${chatid}`,
      {headers: this.getHeaders()}
    );
  }

  createMessage(messageData: ChatMessage): Observable<ChatMessage> {
    
    return this.http.post<ChatMessage>(
      `${environment.apiBaseUrl}/api/chatMessage/sendMessage`,
      {  // <-- This is the body (2nd parameter)
        chat: messageData.chat,
        sender: messageData.sender,
        sentDateTime: messageData.sentDateTime,
        message: messageData.message        
      }, 
      { headers: this.getHeaders() } 
    );
  }
}