
export enum UserRole {
  MEMBER = 'MEMBER',
  CLUB_LEADER = 'CLUB_LEADER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  DEV = 'DEV'
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
  ip?: string; // New: IP Address
  lastLogin?: string; // New: Last Login Timestamp
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
  clubId?: string; // To filter notifications based on joined clubs
  announcementId?: string; // Link to the specific announcement
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  date: string;
  isImportant: boolean;
  clubId?: string; // Optional: if null, it's a global announcement
  clubName?: string; // To display on the main feed
  translations?: {
    en?: { title: string; content: string };
    fr?: { title: string; content: string };
    ar?: { title: string; content: string };
  };
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

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: UserRole;
  createdAt: string;
}