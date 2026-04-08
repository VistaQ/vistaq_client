import { Prospect, CoachingSession, PointConfig, PointEntry, CoachingType, COACHING_TYPE_LABELS } from '../types';

export const DEFAULT_POINT_CONFIG: PointConfig = {
  prospectBasicInfo: 2,
  appointmentCompleted: 3,
  salesMeetingCompleted: 6,
  salesSuccessful: 15,
  salesIssuanceCertificate: 30,
  salesFYCt: 30,
  salesACE: 30,
  coachingIndividual: 10,
  coachingGroup: 10,
  coachingPeerCircles: 10,
  coachingSeminar: 10,
};

const COACHING_TYPE_TO_CONFIG_KEY: Record<CoachingType, keyof PointConfig> = {
  individual_coaching: 'coachingIndividual',
  group_coaching: 'coachingGroup',
  peer_circles: 'coachingPeerCircles',
  seminar: 'coachingSeminar',
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
      a => a.agent_id === userId && a.status === 'joined'
    );
    if (!record) continue;

    const configKey = COACHING_TYPE_TO_CONFIG_KEY[session.coaching_type];
    if (!configKey) continue;

    breakdown.push({
      id: `${session.id}_coaching`,
      date: record.joined_at || session.start_date,
      category: 'coaching',
      action: COACHING_TYPE_LABELS[session.coaching_type],
      subject: session.title,
      points: config[configKey],
    });
  }

  // Sort by date descending
  breakdown.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = breakdown.reduce((sum, e) => sum + e.points, 0);
  return { total, breakdown };
}
