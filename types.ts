
export enum UserRole {
  ADMIN = 'admin',
  MASTER_TRAINER = 'master_trainer',
  TRAINER = 'trainer',
  GROUP_LEADER = 'group_leader',
  AGENT = 'agent'
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  master_trainer: 'Master Trainer',
  trainer: 'Trainer',
  group_leader: 'Group Leader',
  agent: 'Agent',
};

export const getRoleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

export interface User {
  id: string;
  uid?: string; // Firebase UID
  name: string;
  email: string;
  role: UserRole;
  groupId?: string; // Primary group for Agents/Leaders
  groupName?: string; // Group name from API
  managedGroupIds?: string[]; // For Trainers handling multiple groups
  avatarUrl?: string;
  password?: string; // For mock auth only
  agentCode?: string; // "Agent Code" - Required for AGENT only
  // Performance metrics from API
  totalProspects?: number;
  totalAppointments?: number;
  totalSales?: number;
  totalACE?: number;
}

export interface Notification {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}



export interface BadgeTier {
  id: string;
  name: string;
  threshold: number;
  color: string;
  bg: string;
  lottieUrl?: string; // Optional Lottie animation JSON URL
}

export interface PointConfig {
  prospectBasicInfo: number;      // default 2
  appointmentCompleted: number;   // default 3
  salesMeetingCompleted: number;  // default 6
  salesSuccessful: number;        // default 15
  coachingIndividual: number;     // default 10
  coachingGroup: number;          // default 10
  coachingPeerCircles: number;    // default 10
  coachingFullDays: number;       // default 40
  coachingOnlineSeminar: number;  // default 10
}

export interface PointEntry {
  id: string;
  date: string;
  category: 'prospect' | 'coaching';
  action: string;
  subject: string;
  points: number;
}

export enum ProspectStage {
  PROSPECT = 'prospect',
  APPOINTMENT = 'appointment',
  SALES_OUTCOME = 'sales_outcome'
}

export interface ProspectProduct {
  id: string;
  productName: string;
  aceAmount: number;
}

export interface Prospect {
  id: string;

  // Agent info (auto-filled from auth token on create)
  uid: string;
  agentCode?: string;
  agentName?: string;
  agentEmail?: string;
  groupId?: string;
  groupName?: string;

  // Prospect info
  prospectName: string;
  prospectPhone?: string;
  prospectEmail?: string;
  prospectEnteredAt?: string;

  currentStage: ProspectStage;

  // Appointment stage
  appointmentDate?: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
  appointmentLocation?: string;
  appointmentStatus?: 'not_done' | 'scheduled' | 'rescheduled' | 'completed' | 'declined' | 'kiv';
  appointmentCompletedAt?: string;
  salesPartsCompleted?: string[];

  // Sales outcome stage
  salesOutcome?: 'successful' | 'unsuccessful' | 'kiv';
  productsSold?: ProspectProduct[];
  totalACE?: number;
  unsuccessfulReason?: string;
  salesCompletedAt?: string;

  stageHistory?: { stage: string; enteredAt: string }[];

  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  eventTitle: string;
  date: string; // ISO String (start time)
  endTime?: string; // e.g. "11:00"
  eventType?: 'online' | 'face-to-face';
  venue?: string;
  description: string;
  meetingLink?: string;

  // Targeting
  groupIds: string[];
  groupNames?: string[];
  targetAgentIds?: string[]; // specific individual agents invited

  // Creator info (auto-filled from auth token on create)
  createdBy: string;
  createdByName: string;
  createdByRole?: string;

  status?: 'upcoming' | 'completed' | 'cancelled';
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Group {
  id: string;
  name: string;

  // Leadership
  leaderId?: string;
  leaderName?: string;
  leaderEmail?: string;

  // Trainers
  trainerIds?: string[];
  trainerNames?: string[];

  // Members
  memberIds?: string[];
  memberCount?: number;

  // Performance stats (from API)
  totalProspects?: number;
  totalAppointments?: number;
  totalSales?: number;
  totalACE?: number;
  totalPoints?: number;

  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// AI Service Types
export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Coaching & Attendance Types
export interface CoachingAttendance {
  agentId: string;
  agentName: string;
  agentEmail?: string;
  groupId?: string; // Group the agent belongs to
  groupName?: string;
  status: 'pending' | 'joined';
  joinedAt?: string; // ISO String when agent clicks "Join" — this is the attendance log timestamp
}

export type CoachingType =
  | 'Individual Coaching'
  | 'Group Coaching'
  | 'Peer Circles'
  | '2 Full Days Seminar'
  | '2 Hours Online Seminar';

export interface CoachingSession {
  id: string;
  coachingType: CoachingType;
  title: string;
  description?: string;
  date: string; // ISO String for the selected date
  durationStart: string; // e.g., "14:00"
  durationEnd: string; // e.g., "15:00"
  venue: 'Online' | 'Face to Face';
  link?: string; // e.g. Zoom link or venue location

  // Creator Info
  createdBy: string;
  createdByName: string;
  createdByRole: string; // e.g. 'master_trainer', 'trainer', 'group_leader'

  // Target Audience (Assigned Groups/Agents)
  targetGroupIds?: string[]; // Empty means all groups (for master trainer) or specific groups
  targetAgentIds?: string[]; // Specific agents selected

  // Attendance tracking
  attendance: CoachingAttendance[];

  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}
