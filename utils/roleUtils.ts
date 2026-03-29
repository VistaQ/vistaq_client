/**
 * Role-based access control helpers — single source of truth for role checks.
 * Import from here instead of repeating inline role comparisons.
 */

import { User, UserRole } from '../types';

export const isAdmin = (user: User | null | undefined): boolean =>
  user?.role === UserRole.ADMIN;

export const isMasterTrainer = (user: User | null | undefined): boolean =>
  user?.role === UserRole.MASTER_TRAINER;

/** True for ADMIN or MASTER_TRAINER — can see all data across all groups */
export const isManagement = (user: User | null | undefined): boolean =>
  user?.role === UserRole.ADMIN || user?.role === UserRole.MASTER_TRAINER;

/** True for ADMIN, MASTER_TRAINER, or TRAINER */
export const isSupervisor = (user: User | null | undefined): boolean =>
  isManagement(user) || user?.role === UserRole.TRAINER;

/** True for GROUP_LEADER */
export const isGroupLeader = (user: User | null | undefined): boolean =>
  user?.role === UserRole.GROUP_LEADER;

/** True for AGENT only */
export const isAgent = (user: User | null | undefined): boolean =>
  user?.role === UserRole.AGENT;

/** True for AGENT or GROUP_LEADER (field-level roles without admin access) */
export const isFieldRole = (user: User | null | undefined): boolean =>
  user?.role === UserRole.AGENT || user?.role === UserRole.GROUP_LEADER;

/**
 * Returns true if `user` has at least the specified minimum role.
 * Hierarchy: ADMIN > MASTER_TRAINER > TRAINER > GROUP_LEADER > AGENT
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.ADMIN]: 5,
  [UserRole.MASTER_TRAINER]: 4,
  [UserRole.TRAINER]: 3,
  [UserRole.GROUP_LEADER]: 2,
  [UserRole.AGENT]: 1,
};

export const hasMinRole = (user: User | null | undefined, minRole: UserRole): boolean => {
  if (!user) return false;
  return (ROLE_RANK[user.role] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
};
