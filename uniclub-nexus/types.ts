export enum UserRole {
  MEMBER = 'MEMBER',
  CLUB_LEADER = 'CLUB_LEADER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  joinedClubIds: string[]; // Changed to array for multiple clubs
  leadingClubId?: string; // If they are a leader of a club
  grade?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  date: string;
  isImportant: boolean;
  clubId?: string; // Optional: if null, it's a global announcement
}

export interface Club {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberIds: string[];
  imageUrl: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  contributors: string[];
  clubId?: string; // Optional: linked to a specific club
  status: 'In Progress' | 'Done';
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved';
  submittedBy: string;
}