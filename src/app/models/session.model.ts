export interface Session {
  sessionId?: number;
  title: string;
  start_time: string; // ISO date string
  // FIXED: Changed type to allow null, which matches the value from the component
  end_time?: string | null; // ISO date string
  status: string;
  // FIXED: Changed type to allow null for consistency
  location?: string | null;
  // FIXED: Changed type to allow null for consistency
  description?: string | null;
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
