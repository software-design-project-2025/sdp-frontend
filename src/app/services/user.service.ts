// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api' // Your Spring Boot backend;

  constructor(private http: HttpClient) { }

  createUser(userData: any) {
    return this.http.post(`${this.apiUrl}/users`, userData);
  }

  getUser(supabaseUserId: string) {
    return this.http.get(`${this.apiUrl}/users/${supabaseUserId}`);
  }

  updateUser(supabaseUserId: string, updates: any) {
    return this.http.put(`${this.apiUrl}/users/${supabaseUserId}`, updates);
  }
}