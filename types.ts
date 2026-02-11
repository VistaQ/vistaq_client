
export enum UserRole {
  ADMIN = 'ADMIN',
  MASTER_TRAINER = 'MASTER_TRAINER', // New Role
  TRAINER = 'TRAINER',
  GROUP_LEADER = 'GROUP_LEADER', // Kept for data compatibility, but hidden from Add User UI
  AGENT = 'AGENT'
}

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
  INFO = 1,
  APPOINTMENT = 2,
  MEETING = 3, // New Stage
  SALES = 4,
  POINTS = 5,
  CLOSED = 6
}

export interface ProspectProduct {
  id: string;
  name: string;
  amount: number;
}

export interface Prospect {
  id: string;
  agentId: string;
  name: string;
  phone: string;
  email?: string;
  currentStage: ProspectStage;
  
  // Card 2 Data (Appointment)
  appointmentDate?: string; // ISO string (Date + Start Time) for sorting/dashboard compatibility
  appointmentEndTime?: string; // HH:mm string
  location?: string; // New field
  appointmentStatus?: 'Completed' | 'KIV' | 'Declined' | 'Not done' | 'Scheduled' | 'Rescheduled'; // Updated statuses
  
  // Card 3 Data (Meeting Checklist - New)
  meetingChecklist?: {
    rapport: boolean;
    factFinding: boolean;
    presentation: boolean;
  };

  // Card 4 Data (Sales)
  productType?: string; // Summary string for backward compatibility
  policyAmountMYR?: number; // Total sum
  products?: ProspectProduct[]; // Multiple products support
  
  saleStatus?: 'SUCCESSFUL' | 'UNSUCCESSFUL' | 'KIV'; // Added KIV
  saleReason?: string; // Mandatory if unsuccessful
  paymentReceived?: boolean;
  
  // Card 5 Data (Points)
  pointsAwarded?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  link?: string; // URL for online meetings
  date: string; // ISO String
  createdBy: string; // User ID
  createdByName: string; // User Name
  targetGroupIds: string[]; // ['g_star', 'g_legend'] etc.
}

export interface Group {
  id: string;
  name: string;
  leaderId: string;
}

// AI Service Types
export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
