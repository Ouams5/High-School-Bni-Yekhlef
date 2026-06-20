export enum UserRole {
  MEMBER = 'MEMBER',
  CLUB_LEADER = 'CLUB_LEADER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  DEV = 'DEV'
}

export type BadgeType = 'OWNER' | 'ADMIN' | 'DEV' | 'MENTIONED' | 'CLUB_LEADER' | 'CUSTOM';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  imageUrl: string;
  description?: string;
  assignedAt: string;
  clubId?: string; // Optional, for Leader badges
}

export interface MeritRecord {
  id: string;
  date: string;
  amount: number;
  action: 'GAIN' | 'DEDUCTION' | 'SYSTEM';
  reason: string;
  brokenRule?: string;
}

export interface DisciplineRecord {
  id: string;
  date: string;
  clubId: string;
  clubName: string;
  reason: string;
  brokenRule: string;
  reportedToAdmin: boolean;
}

export interface AdminReport {
  id: string;
  userId: string;
  userName: string;
  clubId: string;
  clubName: string;
  reason: string;
  brokenRule: string;
  clubRules: string[];
  date: string;
  resolved: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  joinedClubIds: string[]; 
  leadingClubId?: string;
  grade?: string;
  ip?: string;
  lastLogin?: string;
  plainPassword?: string;
  badges: Badge[]; // Unified badge array
  meritScore?: number;
  meritHistory?: MeritRecord[];
  disciplineRecord?: DisciplineRecord[];
  isOutOfSync?: boolean;
  isSuspended?: boolean;
  suspendedUntil?: string;
  suspendedReason?: string;
  zeroMeritOccurrenceCount?: number;
  isSuspendedIndefinitely?: boolean;
  limitedServices?: {
    services: string[];
    until: string;
    reason?: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'alert' | 'success';
  clubId?: string;
  announcementId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  date: string;
  isImportant: boolean;
  clubId?: string;
  clubName?: string;
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
  isHidden?: boolean;
  theme?: 'light' | 'dark' | 'midnight' | 'depressed' | 'cherry' | 'lethal' | 'coming-of-age' | 'devils-gate' | 'rare-gems' | 'infinite-void' | 'malevolent-shrine';
  
  // Leader Badge Customization
  badgeName?: string;
  badgeImageUrl?: string;
  badgeDescription?: string;

  category?: string;
  logoUrl?: string;
  bannerUrl?: string;
  createdAt?: string;
  
  // Merit and Points implementation
  requiredMerit?: number;
  rules?: string[];
  chatRules?: string[];
  
  requireRegistrationCode?: boolean;
  registrationCodes?: { code: string; expiresAt: string; createdBy: string }[];
  usedRegistrationCodes?: { code: string; usedBy: string; userName: string; usedAt: string }[];

  // Staff and Leading Roles
  presidentName?: string;
  presidentAvatar?: string;
  vicePresidentName?: string;
  vicePresidentAvatar?: string;
  teacherName?: string;
  teacherAvatar?: string;
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
  clubId?: string;
  status: 'In Progress' | 'Done';
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved';
  submittedBy: string;
  submitterName?: string;
  submitterIp?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: UserRole;
  createdAt: string;
  clubId?: string;
}

export interface Credit {
  id: string;
  name: string;
  role: string;
  message: string;
  addedBy: string;
  date: string;
}