import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Session } from '../models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SessionsService {

  private mockSessions: Session[] = [
    {
      id: '1',
      title: 'Calculus Integration Techniques',
      status: 'confirmed',
      type: 'in-person',
      date: 'Today',
      time: '2:00 PM - 4:00 PM',
      location: 'Library Floor 3, Room 301',
      participantCount: 4,
      maxParticipants: 6,
      url: '',
      organizer: 'Sarah Chen',
      topics: ['Integration by Parts', 'Substitution Method']
    },
    {
      id: '2',
      title: 'Physics Quantum Mechanics',
      status: 'confirmed',
      type: 'online',
      date: 'Tomorrow',
      time: '10:00 AM - 12:00 PM',
      location: 'Virtual - Zoom',
      participantCount: 3,
      url: '',
      maxParticipants: 5,
      organizer: 'Mike Johnson',
      topics: ['Wave Functions', 'Schrödinger Equation']
    },
    {
      id: '3',
      title: 'Data Structures Review',
      status: 'open',
      type: 'in-person',
      date: 'Aug 12',
      time: '3:00 PM - 5:00 PM',
      location: 'Computer Lab B',
      participantCount: 2,
      url: '',
      maxParticipants: 4,
      organizer: 'Emma Davis',
      topics: []
    }
  ];

  constructor() { }

  getSessions(): Observable<Session[]> {
    return of(this.mockSessions);
  }
}
