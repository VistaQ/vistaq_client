
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

import type { components, paths } from './types.generated';

// ─── API response types (source of truth: openapi.yaml → types.generated.ts) ───

export type DashboardStats = components['schemas']['DashboardStatsObject'];
export type DashboardStatsPeriod = components['schemas']['DashboardStatsPeriod'];
export type GroupStats = components['schemas']['GroupStatsObject'];
export type GroupDetailStats = components['schemas']['GroupDetailStatsObject'];
export type AgentStats = components['schemas']['AgentStats'];
export type AgentPointsData = components['schemas']['AgentPointsObject'];
export type AgentPointsBreakdownItem = components['schemas']['AgentPointsBreakdownItem'];
export type AgentPointsResponse = { success: boolean; data: AgentPointsData };

export type User = Omit<components['schemas']['UserObject'], 'role'> & {
  role: UserRole;         // keep enum compatibility across the codebase
  password?: string;      // form-only, used for admin user creation
  managedGroupIds?: string[]; // derived from group_trainers junction table
};

export type Group = components['schemas']['GroupObject'] & {
  memberIds?: string[];  // derived
  memberCount?: number;  // derived
};

export type Prospect = Omit<components['schemas']['ProspectObject'], 'current_stage'> & {
  current_stage: ProspectStage; // keep enum compatibility across the codebase
};

export type Event = components['schemas']['EventObject'] & {
  groupNames?: string[];  // derived display names for groupIds
  // Fields pending backend addition to openapi spec
  created_by_name?: string | null;
  archived?: boolean;
};

// ─── Request body types (compiler-enforced payloads) ────────────────────────

export type ProspectCreateBody = paths['/prospects']['post']['requestBody']['content']['application/json'];
export type ProspectUpdateBody = paths['/prospects/{prospectId}']['put']['requestBody']['content']['application/json'];
export type EventCreateBody = paths['/events']['post']['requestBody']['content']['application/json'];
export type EventUpdateBody = paths['/events/{eventId}']['put']['requestBody']['content']['application/json'];

export interface Notification {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}



export interface BadgeTier {
  id: string;
  name: string;
  level: number;        // Numeric level (1 = Foundation, 8 = Achiever)
  threshold: number;
  color: string;
  bg: string;
  lottieUrl?: string; // Optional Lottie animation JSON URL
}

export interface PointConfig {
  // Category 1: Prospect Management
  prospectBasicInfo: number;      // default 2
  appointmentCompleted: number;   // default 3
  salesMeetingCompleted: number;  // default 6
  salesSuccessful: number;        // default 15
  // Category 2: Sales Completion (frontend-ready; backend TBD)
  salesIssuanceCertificate: number; // default 30 per certificate
  salesFYCt: number;                // default 30 per RM1,000
  salesACE: number;                 // default 30 per RM1,000
  // Category 3: Personal Development
  coachingIndividual: number;     // default 10
  coachingGroup: number;          // default 10
  coachingPeerCircles: number;    // default 10
  coachingFullDays: number;       // default 40
  coachingOnlineSeminar: number;  // default 10
}

export interface PointEntry {
  id: string;
  date: string;
  category: 'prospect' | 'sales' | 'coaching';
  action: string;
  subject: string;
  points: number;
}

export enum ProspectStage {
  PROSPECT = 'prospect',
  APPOINTMENT = 'appointment',
  SALES = 'sales'
}

// ProspectProduct matches the products_sold item shape from the API
export type ProspectProduct = {
  id?: string; // client-side only (used for keying product rows in the form)
  productName: string;
  amount: number;
};

// Coaching & Attendance Types
export interface CoachingAttendance {
  agentId: string;
  agentName: string;
  agentEmail?: string;
  groupId?: string; // Group the agent belongs to
  groupName?: string;
  status: 'pending' | 'joined' | 'did_not_attend';
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
