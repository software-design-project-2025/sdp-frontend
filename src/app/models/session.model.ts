export interface Session {
  id: string;
  title: string;
  status: 'confirmed' | 'open';
  type: 'in-person' | 'online';
  date: string;
  time: string;
  location: string;
  url: string;
  participantCount: number;
  maxParticipants: number;
  organizer: string;
  topics: string[];
}

