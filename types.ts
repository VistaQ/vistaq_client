
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
  name: string;
  email: string;
  role: UserRole;
  groupId?: string; // Primary group for Agents/Leaders
  managedGroupIds?: string[]; // For Trainers handling multiple groups
  avatarUrl?: string;
  password?: string; // For mock auth only
  agentCode?: string; // "Agent Code" - Required for AGENT only
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
  date: string; // ISO String
  venue: string;
  description: string;
  meetingLink?: string;

  // Groups
  groupIds: string[];
  groupNames?: string[];

  // Creator info (auto-filled from auth token on create)
  createdBy: string;
  createdByName: string;
  createdByRole?: string;

  status?: 'upcoming' | 'completed' | 'cancelled';
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
