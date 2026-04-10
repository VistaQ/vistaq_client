
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
  coachingSeminar: number;        // default 10
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

// Coaching & Attendance Types (source of truth: openapi.yaml → types.generated.ts)
export type CoachingSession = components['schemas']['CoachingSessionObject'];
export type CoachingAttendance = components['schemas']['AttendanceRecordObject'];
export type CoachingType = components['schemas']['CoachingTypeEnum'];
export type TrainingMode = components['schemas']['TrainingModeEnum'];
export type SessionStatus = components['schemas']['SessionStatusEnum'];
export type AttendanceStatus = components['schemas']['AttendanceStatusEnum'];

export type CoachingSessionCreateBody = paths['/coaching-sessions']['post']['requestBody']['content']['application/json'];
export type CoachingSessionUpdateBody = paths['/coaching-sessions/{sessionId}']['put']['requestBody']['content']['application/json'];

export const COACHING_TYPE_LABELS: Record<CoachingType, string> = {
  individual_coaching: 'Individual Coaching',
  group_coaching: 'Group Coaching',
  peer_circles: 'Peer Circle Meeting',
  seminar: 'Seminar',
};

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  online: 'Online',
  face_to_face: 'Face to Face',
};
