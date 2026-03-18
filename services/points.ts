import { Prospect, CoachingSession, PointConfig, PointEntry, CoachingType } from '../types';

export const DEFAULT_POINT_CONFIG: PointConfig = {
  prospectBasicInfo: 2,
  appointmentCompleted: 3,
  salesMeetingCompleted: 6,
  salesSuccessful: 15,
  coachingIndividual: 10,
  coachingGroup: 10,
  coachingPeerCircles: 10,
  coachingFullDays: 40,
  coachingOnlineSeminar: 10,
};

const COACHING_TYPE_TO_CONFIG_KEY: Record<CoachingType, keyof PointConfig> = {
  'Individual Coaching': 'coachingIndividual',
  'Group Coaching': 'coachingGroup',
  'Peer Circles': 'coachingPeerCircles',
  '2 Full Days Seminar': 'coachingFullDays',
  '2 Hours Online Seminar': 'coachingOnlineSeminar',
};

export function computeUserPoints(
  userId: string,
  prospects: Prospect[],
  coachingSessions: CoachingSession[],
  config: PointConfig
): { total: number; breakdown: PointEntry[] } {
  const breakdown: PointEntry[] = [];

  // --- Prospect points ---
  const myProspects = prospects.filter(p => p.agent_id === userId);

  for (const p of myProspects) {
    // 1. Basic info added (every prospect earns this)
    breakdown.push({
      id: `${p.id}_basic`,
      date: p.created_at,
      category: 'prospect',
      action: 'Added Prospect',
      subject: p.prospect_name,
      points: config.prospectBasicInfo,
    });

    // 2. Appointment completed
    if (p.appointment_status === 'done') {
      breakdown.push({
        id: `${p.id}_appt`,
        date: p.appointment_completed_at || p.updated_at,
        category: 'prospect',
        action: 'Appointment Completed',
        subject: p.prospect_name,
        points: config.appointmentCompleted,
      });
    }

    // 3. Sales meeting completed (any sales outcome entered)
    if (p.sales_outcome) {
      breakdown.push({
        id: `${p.id}_meeting`,
        date: p.sales_completed_at || p.updated_at,
        category: 'prospect',
        action: 'Sales Meeting Completed',
        subject: p.prospect_name,
        points: config.salesMeetingCompleted,
      });
    }

    // 4. Successful sale
    if (p.sales_outcome === 'successful') {
      breakdown.push({
        id: `${p.id}_sale`,
        date: p.sales_completed_at || p.updated_at,
        category: 'prospect',
        action: 'Sale: Successful',
        subject: p.prospect_name,
        points: config.salesSuccessful,
      });
    }
  }

  // --- Coaching points (joined attendance) ---
  for (const session of coachingSessions) {
    const record = session.attendance.find(
      a => a.agentId === userId && a.status === 'joined'
    );
    if (!record) continue;

    const configKey = COACHING_TYPE_TO_CONFIG_KEY[session.coachingType];
    if (!configKey) continue;

    breakdown.push({
      id: `${session.id}_coaching`,
      date: record.joinedAt || session.date,
      category: 'coaching',
      action: session.coachingType,
      subject: session.title,
      points: config[configKey],
    });
  }

  // Sort by date descending
  breakdown.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = breakdown.reduce((sum, e) => sum + e.points, 0);
  return { total, breakdown };
}
