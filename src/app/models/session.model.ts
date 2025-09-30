export interface Session {
  sessionId?: number;
  title: string;
  start_time: string; // ISO date string
  end_time?: string; // ISO date string
  status: string;
  location?: string;
  description?: string;
  creatorid: string;
  groupid: number;
}

// Frontend display model (for component use)
export interface SessionDisplay {
  sessionId?: number;
  title: string;
  date: string;
  time: string;
  status: string;
  type: string;
  location?: string;
  url?: string;
  organizer: string;
  participantCount: number;
  maxParticipants: number;
  topics: string[];
  description?: string;
}
