import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { User, CoachingSession, Event, Prospect } from '../types';

/**
 * Represents a resolved time interval for conflict checking.
 */
interface TimeSlot {
    start: Date;
    end: Date;
    label: string;
    type: 'event' | 'coaching' | 'appointment';
}

/**
 * Returns true if the two minute-based intervals overlap.
 */
const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
    aStart < bEnd && aEnd > bStart;

/**
 * Build the unified list of occupied time slots for the current user.
 * NOTE: Cancelled coaching sessions and cancelled events are intentionally excluded
 * so those time slots become available for re-booking.
 */
const buildOccupiedSlots = (
    user: User,
    allCoachingSessions: CoachingSession[],
    allEvents: Event[],
    userProspects: Prospect[]
): TimeSlot[] => {
    const slots: TimeSlot[] = [];

    // --- 1. Coaching Sessions (skip cancelled) ---
    allCoachingSessions
        .filter(s => s.status !== 'cancelled')
        .forEach(s => {
            if (!s.start_date) return;
            try {
                const start = new Date(s.start_date);
                if (isNaN(start.getTime())) return;
                const end = s.end_date ? new Date(s.end_date) : new Date(start.getTime() + 60 * 60 * 1000);
                slots.push({ start, end, label: s.title, type: 'coaching' });
            } catch { }
        });

    // --- 2. Events (skip cancelled) ---
    allEvents
        .filter(e => e.status !== 'cancelled')
        .forEach(e => {
            if (!e.start_date) return;
            try {
                const start = new Date(e.start_date);
                if (isNaN(start.getTime())) return;
                // Events are treated as 1-hour blocks for overlap detection
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                slots.push({ start, end, label: e.event_title, type: 'event' });
            } catch { }
        });

    // --- 3. Prospect Appointments ---
    userProspects.forEach(p => {
        if (!p.appointment_date) return;
        // Only block times that are actively scheduled/rescheduled — not_done means the slot was missed, not occupied
        if (p.appointment_status !== 'scheduled' && p.appointment_status !== 'rescheduled') return;
        try {
            const base = new Date(p.appointment_date);
            if (isNaN(base.getTime())) return;
            if (p.appointment_start_time) {
                const [h, m] = p.appointment_start_time.split(':').map(Number);
                base.setHours(h, m, 0, 0);
            }
            const endTime = p.appointment_end_time
                ? (() => {
                    const [h, m] = p.appointment_end_time.split(':').map(Number);
                    const d = new Date(base);
                    d.setHours(h, m, 0, 0);
                    return d;
                })()
                : new Date(base.getTime() + 60 * 60 * 1000);
            slots.push({ start: base, end: endTime, label: `Appt: ${p.prospect_name}`, type: 'appointment' });
        } catch { }
    });

    return slots;
};

/**
 * Check whether a proposed date + time range conflicts with any existing occupied slot.
 * @param occupiedSlots   The occupied time slots to check against.
 * @param proposedDate    YYYY-MM-DD string
 * @param proposedStart   HH:MM string
 * @param proposedEnd     HH:MM string (use same as start for ~1hour point-in-time items)
 * @param excludeLabel    Optional label to skip (when editing an existing item)
 */
export const checkConflict = (
    occupiedSlots: TimeSlot[],
    proposedDate: string,
    proposedStart: string,
    proposedEnd: string,
    excludeLabel?: string
): { hasConflict: boolean; conflictWith: string; conflictType: string } => {
    if (!proposedDate || !proposedStart) return { hasConflict: false, conflictWith: '', conflictType: '' };

    try {
        // Parse proposed date — handle both YYYY-MM-DD and ISO strings
        const dateBase = new Date(proposedDate.includes('T') ? proposedDate : `${proposedDate}T00:00:00`);
        if (isNaN(dateBase.getTime())) return { hasConflict: false, conflictWith: '', conflictType: '' };

        const [sh, sm] = proposedStart.split(':').map(Number);
        const endStr = proposedEnd || proposedStart;
        const [eh, em] = endStr.split(':').map(Number);

        const newStartMins = sh * 60 + sm;
        // If end == start (single-point block), default to 1 hour
        const newEndMins = (eh * 60 + em === newStartMins) ? newStartMins + 60 : eh * 60 + em;

        for (const slot of occupiedSlots) {
            if (excludeLabel && slot.label === excludeLabel) continue;

            // Compare calendar day
            const isSameDay =
                slot.start.getFullYear() === dateBase.getFullYear() &&
                slot.start.getMonth() === dateBase.getMonth() &&
                slot.start.getDate() === dateBase.getDate();
            if (!isSameDay) continue;

            const slotStartMins = slot.start.getHours() * 60 + slot.start.getMinutes();
            const slotEndMins = slot.end.getHours() * 60 + slot.end.getMinutes();

            if (rangesOverlap(newStartMins, newEndMins, slotStartMins, slotEndMins)) {
                return { hasConflict: true, conflictWith: slot.label, conflictType: slot.type };
            }
        }
    } catch (e) {
        console.error('[useCalendarConflicts] checkConflict error:', e);
    }

    return { hasConflict: false, conflictWith: '', conflictType: '' };
};

/**
 * Hook — returns the occupied calendar slots for the currently authenticated user.
 * Coaching sessions and events with status === 'cancelled' are excluded,
 * freeing those time slots for new bookings.
 */
export const useCalendarConflicts = () => {
    const { currentUser } = useAuth();
    const { coachingSessions, getEventsForUser, prospects } = useData();

    const occupiedSlots = useMemo(() => {
        if (!currentUser) return [];
        const myEvents = getEventsForUser(currentUser);
        const myProspects = prospects.filter(p => p.agent_id === currentUser.id);
        const slots = buildOccupiedSlots(currentUser, coachingSessions, myEvents, myProspects);
        return slots;
    }, [currentUser, coachingSessions, prospects, getEventsForUser]);

    return { occupiedSlots };
};
