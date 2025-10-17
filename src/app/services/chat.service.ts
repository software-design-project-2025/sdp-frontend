import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';
import { User } from '../chat/chat';

export interface Chat {
  chatid: number;
  user1: User;
  user2: User;
  
}

export interface ChatMessage {
  messageid: number;
  chatid: number;
  message: string;
  senderid: string;
  sent_datetime: Date;
  read_status: boolean;
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
  partnerID: string | null = null;

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
        //messageid: messageData.messageid,
        chatid: messageData.chatid,
        senderid: messageData.senderid,
        sent_datetime: messageData.sent_datetime,
        message: messageData.message        
      }, 
      { headers: this.getHeaders() } 
    );
  }

  createChat(chat: any): Observable<Chat> {
    return this.http.post<Chat>(
      `${environment.apiBaseUrl}/api/chat/createChat`,
      chat,
      {headers: this.getHeaders()}
    );
  }

  updateStatus(messageid: number, read_status: boolean): Observable<void> {
    return this.http.put<void>(
      `${environment.apiBaseUrl}/api/chatMessage/updateStatus?messageid=${messageid}&read_status=${read_status}`,
      null,
      {
        headers: this.getHeaders(),
        responseType: 'text' as 'json'
      }
    )
  }

  setPartnerID(id: string) {
    this.partnerID = id;
  }

  getPartnerID(): string | null {
    return this.partnerID;
  }
}