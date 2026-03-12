import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Event, CoachingSession, Prospect } from '../types';
import {
    CalendarDays, Plus, MapPin, User, X, Clock, Link as LinkIcon,
    Edit2, ExternalLink, LayoutGrid, ChevronLeft, ChevronRight, Archive,
    BookOpen, Briefcase, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useCalendarConflicts, checkConflict } from '../hooks/useCalendarConflicts';

/* ─── Unified Calendar Item ─────────────────────────────────── */
type CalItemType = 'event' | 'coaching' | 'appointment';

interface CalItem {
    id: string;
    title: string;
    date: string; // ISO
    type: CalItemType;
    subType?: string;   // e.g. venue, coachingType, appointmentLocation
    link?: string;
    cancelled?: boolean;
    raw?: Event | CoachingSession | Prospect;
}

const TYPE_CONFIG: Record<CalItemType, { bg: string; text: string; dot: string; label: string }> = {
    event: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Event' },
    coaching: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Coaching' },
    appointment: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Appointment' },
};

/** Returns override styles for cancelled items regardless of type */
const cancelledStyle = { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400', label: 'Cancelled' };
const getItemStyle = (item: CalItem) =>
    item.cancelled ? cancelledStyle : TYPE_CONFIG[item.type];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

/* ─── Item Detail Popup ─────────────────────────────────── */
interface ItemDetailPopupProps {
    item: CalItem;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    groups: { id: string; name: string }[];
}

const ItemDetailPopup: React.FC<ItemDetailPopupProps> = ({ item, onClose, onEdit, onDelete, groups }) => {
    const cfg = getItemStyle(item);
    const d = new Date(item.date);
    const valid = !isNaN(d.getTime());
    const evt = item.type === 'event' ? (item.raw as Event) : null;
    const session = item.type === 'coaching' ? (item.raw as CoachingSession) : null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className={`px-6 py-5 text-white ${item.type === 'event' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : item.type === 'coaching' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-purple-600 to-violet-600'}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-xl p-2.5 text-center min-w-[48px]">
                                <div className="text-xs font-bold uppercase opacity-80">
                                    {valid ? d.toLocaleString('default', { month: 'short' }) : '--'}
                                </div>
                                <div className="text-2xl font-black leading-none">
                                    {valid ? d.getDate() : '?'}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1 block">{cfg.label}</span>
                                <h2 className="text-lg font-bold leading-tight">{item.title}</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>
                            {valid ? d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not set'}
                            {valid && item.type !== 'appointment' && ` · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                            {item.type === 'coaching' && session && ` · ${session.durationStart} – ${session.durationEnd}`}
                        </span>
                    </div>

                    {item.subType && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{item.subType}</span>
                        </div>
                    )}

                    {session?.createdByName && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>Organizer: <span className="font-medium">{session.createdByName}</span></span>
                        </div>
                    )}

                    {evt?.description && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{evt.description}</p>
                    )}

                    {evt?.groupIds && (
                        <div className="text-xs text-gray-400">
                            Shared with:{' '}
                            {(evt.groupNames && evt.groupNames.length > 0)
                                ? evt.groupNames.join(', ')
                                : evt.groupIds.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')
                            }
                        </div>
                    )}

                    {item.link && (
                        <a
                           href={(item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date)) ? '#' : item.link}
                           target={(item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date)) ? '_self' : '_blank'}
                           rel="noreferrer"
                           className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-md ${
                              item.type === 'coaching' && item.subType?.includes('Online') 
                                 ? new Date() < new Date(item.date) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                 : item.type === 'coaching' && item.subType?.includes('Face to Face')
                                    ? 'bg-orange-600 hover:bg-orange-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                           }`}
                        >
                           <ExternalLink className="w-4 h-4" /> 
                           {item.type === 'coaching' && item.subType?.includes('Face to Face') 
                              ? 'Event Info' 
                              : (item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date))
                                 ? 'Wait for Start'
                                 : 'Join Now'
                           }
                        </a>
                    )}

                    {(onEdit || onDelete) && (
                        <div className="flex gap-2 pt-2 border-t">
                            {onEdit && (
                                <button onClick={onEdit} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                            {onDelete && (
                                <button onClick={onDelete} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                    <X className="w-3.5 h-3.5" /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Day Popup ───────────────────────────────────────────── */
interface DayPopupProps {
    date: Date;
    items: CalItem[];
    onClose: () => void;
    onSelect: (item: CalItem) => void;
}

const DayPopup: React.FC<DayPopupProps> = ({ date, items, onClose, onSelect }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
                <div>
                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        {date.toLocaleString('default', { weekday: 'long' })}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                        {date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nothing scheduled.</p>
                ) : items.map(item => {
                    const cfg = getItemStyle(item);
                    return (
                        <button key={item.id} onClick={() => onSelect(item)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm truncate">{item.title}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                                    {item.subType && <span className="truncate">{item.subType}</span>}
                                </div>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

/* ─── Calendar Grid ──────────────────────────────────────── */
interface CalendarGridProps {
    items: CalItem[];
    isAdmin: boolean;
    includeArchived: boolean;
    onDayClick: (date: Date, items: CalItem[]) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ items, isAdmin, includeArchived, onDayClick }) => {
    const today = new Date();

    let minYear = today.getFullYear();
    let minMonth = today.getMonth();

    if (includeArchived && isAdmin) {
        minYear = today.getFullYear() - 5;
        minMonth = 0;
    } else {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        minYear = threeMonthsAgo.getFullYear();
        minMonth = threeMonthsAgo.getMonth();
    }

    const latestDate = useMemo(() => {
        if (items.length === 0) return null;
        return items.reduce((latest, item) => {
            const d = new Date(item.date);
            return d > latest ? d : latest;
        }, new Date(0));
    }, [items]);

    const maxYear = latestDate ? latestDate.getFullYear() : today.getFullYear();
    const maxMonth = latestDate ? latestDate.getMonth() : today.getMonth();

    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const canGoPrev = !(viewYear === minYear && viewMonth === minMonth);
    const canGoNext = !(viewYear === maxYear && viewMonth === maxMonth);

    const prevMonth = () => {
        if (!canGoPrev) return;
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (!canGoNext) return;
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1))
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const itemsOnDay = (date: Date) =>
        items.filter(item => {
            const d = new Date(item.date);
            return !isNaN(d.getTime()) && isSameDay(d, date);
        });

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <button onClick={prevMonth} disabled={!canGoPrev}
                    className={`p-2 rounded-lg transition-colors ${canGoPrev ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}>
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-gray-900">{MONTHS[viewMonth]} {viewYear}</h3>
                <button onClick={nextMonth} disabled={!canGoNext}
                    className={`p-2 rounded-lg transition-colors ${canGoNext ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 border-b">
                {DAY_LABELS.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {cells.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="min-h-[6rem] bg-gray-50/50 border-b border-r border-gray-100" />;
                    const dayItems = itemsOnDay(date);
                    const isToday = isSameDay(date, today);
                    const isLast = idx % 7 === 6;

                    return (
                        <button key={date.toISOString()}
                            onClick={() => dayItems.length > 0 ? onDayClick(date, dayItems) : undefined}
                            className={`min-h-[6rem] flex flex-col p-1.5 border-b border-r border-gray-100 transition-colors w-full text-left
                                ${dayItems.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}
                                ${isLast ? 'border-r-0' : ''}
                            `}
                        >
                            <div className="w-full flex justify-end mb-1">
                                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}
                                `}>{date.getDate()}</span>
                            </div>
                            <div className="space-y-0.5 overflow-hidden flex-1">
                                {dayItems.slice(0, 3).map(item => {
                                    const cfg = getItemStyle(item);
                                    return (
                                        <div key={item.id}
                                            className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.text}`}
                                            title={item.title}>
                                            {item.title}
                                        </div>
                                    );
                                })}
                                {dayItems.length > 3 && (
                                    <div className="text-[10px] text-gray-500 font-medium px-1">+{dayItems.length - 3} more</div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t bg-gray-50 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {(Object.entries(TYPE_CONFIG) as [CalItemType, typeof TYPE_CONFIG['event']][]).map(([type, cfg]) => (
                    <span key={type} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full inline-block ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                ))}
                <span className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 inline-flex items-center justify-center text-white font-bold text-[10px]">d</span>
                    Today
                </span>
            </div>
        </div>
    );
};

/* ─── Card List View ──────────────────────────────────────── */
interface CardListProps {
    items: CalItem[];
    currentUserId: string;
    isAdminOrCreator: (item: CalItem) => boolean;
    onSelect: (item: CalItem) => void;
    onEdit: (item: CalItem) => void;
    onDelete: (item: CalItem) => void;
}

const CardList: React.FC<CardListProps> = ({ items, isAdminOrCreator, onSelect, onEdit, onDelete }) => {
    if (items.length === 0) {
        return (
            <div className="col-span-2 p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No calendar items to display.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map(item => {
                const cfg = getItemStyle(item);
                const d = new Date(item.date);
                const valid = !isNaN(d.getTime());
                const isPast = valid && d < new Date();
                const canEdit = isAdminOrCreator(item);

                return (
                    <div key={item.id}
                        className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col cursor-pointer hover:border-blue-200 transition-colors ${isPast ? 'border-gray-100 opacity-80' : 'border-gray-100'}`}
                        onClick={() => onSelect(item)}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center border ${isPast ? 'bg-gray-50 text-gray-400 border-gray-200' : `${cfg.bg} border-transparent`}`}>
                                    <span className="text-[10px] font-bold uppercase">{valid ? d.toLocaleString('default', { month: 'short' }) : 'NA'}</span>
                                    <span className={`text-xl font-bold leading-none ${isPast ? '' : cfg.text}`}>{valid ? d.getDate() : '?'}</span>
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                                    <h3 className="text-base font-bold text-gray-900 leading-tight">{item.title}</h3>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => onDelete(item)} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto space-y-1.5 text-sm text-gray-600 border-t pt-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{valid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Time TBD'}</span>
                            </div>
                            {item.subType && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate">{item.subType}</span>
                                </div>
                            )}
                            {item.link && (
                                <div className="pt-1" onClick={e => e.stopPropagation()}>
                                    <a
                                       href={(item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date)) ? '#' : item.link}
                                       target={(item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date)) ? '_self' : '_blank'}
                                       rel="noreferrer"
                                       className={`inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-colors ${
                                          item.type === 'coaching' && item.subType?.includes('Online') 
                                             ? new Date() < new Date(item.date) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                             : item.type === 'coaching' && item.subType?.includes('Face to Face')
                                                ? 'bg-orange-600 hover:bg-orange-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                       }`}
                                    >
                                       <ExternalLink className="w-3.5 h-3.5" /> 
                                       {item.type === 'coaching' && item.subType?.includes('Face to Face') 
                                          ? 'Event Info' 
                                          : (item.type === 'coaching' && item.subType?.includes('Online') && new Date() < new Date(item.date))
                                             ? 'Wait for Start'
                                             : 'Join Now'
                                       }
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* ─── Main Page ──────────────────────────────────────────── */
const MyCalendar: React.FC = () => {
    const { currentUser, groups } = useAuth();
    const { addEvent, deleteEvent, updateEvent, getEventsForUser, refetchEvents, getCoachingSessionsForUser, refetchCoachingSessions, prospects } = useData();
    const { occupiedSlots } = useCalendarConflicts();

    useEffect(() => {
      refetchEvents();
      refetchCoachingSessions();
    }, []);

    const [viewMode, setViewMode] = useState<'calendar' | 'card'>('calendar');
    const [showArchived, setShowArchived] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
    const [selectedDayItems, setSelectedDayItems] = useState<CalItem[]>([]);
    const [detailItem, setDetailItem] = useState<CalItem | null>(null);

    const [formData, setFormData] = useState({
        eventTitle: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        meetingLink: '',
        groupIds: [] as string[],
        status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled'
    });
    const [eventError, setEventError] = useState('');

    if (!currentUser) return null;

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isManagementOnly =
        isAdmin ||
        currentUser.role === UserRole.MASTER_TRAINER ||
        currentUser.role === UserRole.TRAINER;

    const canManageEvents = isManagementOnly || currentUser.role === UserRole.GROUP_LEADER;

    // --- Build unified CalItem list ---
    const calItems = useMemo((): CalItem[] => {
        const result: CalItem[] = [];

        // 1. Events & Meetings (all roles)
        const myEvents = getEventsForUser(currentUser);
        myEvents.forEach(e => {
            result.push({
                id: `evt_${e.id}`,
                title: e.eventTitle,
                date: e.date,
                type: 'event',
                subType: e.venue,
                link: e.meetingLink,
                cancelled: e.status === 'cancelled',
                raw: e,
            });
        });

        // 2. Coaching Sessions (all roles — filtered by getCoachingSessionsForUser)
        const mySessions = getCoachingSessionsForUser(currentUser);
        mySessions.forEach(s => {
            // Build datetime from date + durationStart
            let sessionDate = s.date;
            try {
                const base = new Date(s.date);
                if (!isNaN(base.getTime()) && s.durationStart) {
                    const [h, m] = s.durationStart.split(':').map(Number);
                    base.setHours(h, m, 0, 0);
                    sessionDate = base.toISOString();
                }
            } catch (_) { }

            result.push({
                id: `coaching_${s.id}`,
                title: s.title,
                date: sessionDate,
                type: 'coaching',
                subType: `${s.durationStart || ''}${s.durationStart && s.durationEnd ? ` – ${s.durationEnd}` : ''} · ${s.venue}`,
                link: s.venue === 'Online' ? s.link : undefined,
                cancelled: s.status === 'cancelled',
                raw: s,
            });
        });

        // 3. Prospect Appointments (Agents & Group Leaders only)
        if (!isManagementOnly) {
            const myProspects = prospects.filter(p => p.uid === currentUser.id);
            myProspects.forEach(p => {
                if (!p.appointmentDate) return;
                // Show all non-declined/non-completed appointments on the calendar
                if (
                    p.appointmentStatus === 'declined' ||
                    p.appointmentStatus === 'completed' ||
                    p.appointmentStatus === 'kiv'
                ) return;
                const apptDate = new Date(p.appointmentDate);
                if (isNaN(apptDate.getTime())) return;

                // Apply time part so the card shows correct time
                if (p.appointmentStartTime) {
                    const [h, m] = p.appointmentStartTime.split(':').map(Number);
                    apptDate.setHours(h, m, 0, 0);
                }

                // Build a readable time subType
                const timeDisplay = p.appointmentStartTime
                    ? `${p.appointmentStartTime}${p.appointmentEndTime ? ` – ${p.appointmentEndTime}` : ''}`
                    : '';
                const locationDisplay = p.appointmentLocation || '';
                const subType = [timeDisplay, locationDisplay].filter(Boolean).join(' · ');

                result.push({
                    id: `appt_${p.id}`,
                    title: `Appt: ${p.prospectName}`,
                    date: apptDate.toISOString(),
                    type: 'appointment',
                    subType: subType || undefined,
                    raw: p,
                });
            });
        }

        return result;
    }, [currentUser, prospects, showArchived, getEventsForUser, getCoachingSessionsForUser]);

    const sortedItems = [...calItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Groups available to target for event creation
    let targetableGroups = groups;
    if (currentUser.role === UserRole.TRAINER) {
        targetableGroups = groups.filter(g => currentUser.managedGroupIds?.includes(g.id));
    } else if (currentUser.role === UserRole.GROUP_LEADER) {
        targetableGroups = groups.filter(g => g.id === currentUser.groupId);
    } else if (!isAdmin && currentUser.role !== UserRole.MASTER_TRAINER) {
        targetableGroups = [];
    }

    // Event CRUD handlers
    const handleOpenEventModal = (item?: CalItem) => {
        if (item && item.type === 'event') {
            const evt = item.raw as Event;
            const d = new Date(evt.date);
            const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
            const timeStr = !isNaN(d.getTime()) ? d.toTimeString().slice(0, 5) : '';
            setEditingEventId(evt.id);
            setFormData({ eventTitle: evt.eventTitle, description: evt.description, date: dateStr, time: timeStr, venue: evt.venue, meetingLink: evt.meetingLink || '', groupIds: evt.groupIds, status: evt.status || 'upcoming' });
        } else {
            setEditingEventId(null);
            const initialGroups = (currentUser.role === UserRole.GROUP_LEADER && currentUser.groupId) ? [currentUser.groupId] : [];
            setFormData({ eventTitle: '', description: '', date: '', time: '', venue: '', meetingLink: '', groupIds: initialGroups, status: 'upcoming' });
        }
        setIsEventModalOpen(true);
        setDetailItem(null);
    };

    const handleSaveEvent = async () => {
        if (!formData.eventTitle || !formData.date || !formData.time || !formData.venue || !formData.description || formData.groupIds.length === 0) {
            alert('Please fill in all required fields (Title, Date, Time, Venue, Description, Groups).');
            return;
        }
        const dateTime = new Date(`${formData.date}T${formData.time}`);
        if (isNaN(dateTime.getTime())) { alert('Invalid date or time.'); return; }

        // ── Double Booking Check ──────────────────────────────────
        const { hasConflict, conflictWith } = checkConflict(
            occupiedSlots,
            formData.date,
            formData.time,
            formData.time, // Events are single-point; default to 1-hr block in the checker
            editingEventId ? formData.eventTitle : undefined // skip self when editing
        );
        if (hasConflict) {
            setEventError(`This time slot conflicts with "${conflictWith}" already in your calendar. Please choose a different date or time.`);
            return;
        }
        setEventError('');
        // ─────────────────────────────────────────────────────────

        const eventData: Partial<Event> = {
            eventTitle: formData.eventTitle,
            description: formData.description,
            venue: formData.venue,
            meetingLink: formData.meetingLink || undefined,
            date: dateTime.toISOString(),
            groupIds: formData.groupIds,
            status: formData.status
        };
        if (editingEventId) {
            await updateEvent(editingEventId, eventData);
        } else {
            await addEvent({ ...eventData, createdBy: currentUser.id, createdByName: currentUser.name });
        }
        setIsEventModalOpen(false);
    };

    const toggleGroup = (id: string) => {
        setFormData(prev => prev.groupIds.includes(id)
            ? { ...prev, groupIds: prev.groupIds.filter(g => g !== id) }
            : { ...prev, groupIds: [...prev.groupIds, id] }
        );
    };

    const handleDeleteEvent = async (item: CalItem) => {
        if (item.type !== 'event') return;
        const evt = item.raw as Event;
        if (window.confirm('Delete this event?')) {
            await deleteEvent(evt.id);
            setDetailItem(null);
        }
    };

    const isAdminOrCreatorOfItem = (item: CalItem) => {
        if (item.type !== 'event') return false;
        const evt = item.raw as Event;
        return isAdmin || evt.createdBy === currentUser.id;
    };

    const inputClass = 'block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm';
    const labelClass = 'block text-xs font-semibold text-gray-500 uppercase mb-1';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                    <p className="text-sm text-gray-500">Your appointments, coaching sessions, and meetings in one place.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Archive Toggle — admin only */}
                    {isAdmin && (
                        <button onClick={() => setShowArchived(s => !s)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                            <Archive className="w-4 h-4" />
                            {showArchived ? 'Archived: On' : 'Show Archived'}
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <CalendarDays className="w-4 h-4" /> Calendar
                        </button>
                        <button onClick={() => setViewMode('card')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <LayoutGrid className="w-4 h-4" /> Cards
                        </button>
                    </div>

                    {/* Create Event Button */}
                    {canManageEvents && (
                        <button onClick={() => handleOpenEventModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium">
                            <Plus className="w-4 h-4 mr-2" /> Create Event
                        </button>
                    )}
                </div>
            </div>

            {/* Archived banner */}
            {isAdmin && showArchived && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <Archive className="w-4 h-4 flex-shrink-0" />
                    <span>Showing <strong>archived events</strong>. Only visible to Admin.</span>
                </div>
            )}

            {/* Calendar / Card View */}
            {viewMode === 'calendar' ? (
                <CalendarGrid
                    items={sortedItems}
                    isAdmin={isAdmin}
                    includeArchived={showArchived}
                    onDayClick={(date, items) => { setSelectedDayDate(date); setSelectedDayItems(items); }}
                />
            ) : (
                <CardList
                    items={sortedItems}
                    currentUserId={currentUser.id}
                    isAdminOrCreator={isAdminOrCreatorOfItem}
                    onSelect={setDetailItem}
                    onEdit={handleOpenEventModal}
                    onDelete={handleDeleteEvent}
                />
            )}

            {/* Day Popup */}
            {selectedDayDate && (
                <DayPopup
                    date={selectedDayDate}
                    items={selectedDayItems}
                    onClose={() => { setSelectedDayDate(null); setSelectedDayItems([]); }}
                    onSelect={item => { setSelectedDayDate(null); setSelectedDayItems([]); setDetailItem(item); }}
                />
            )}

            {/* Item Detail Popup */}
            {detailItem && (
                <ItemDetailPopup
                    item={detailItem}
                    groups={groups}
                    onClose={() => setDetailItem(null)}
                    onEdit={isAdminOrCreatorOfItem(detailItem) ? () => handleOpenEventModal(detailItem) : undefined}
                    onDelete={isAdminOrCreatorOfItem(detailItem) ? () => handleDeleteEvent(detailItem) : undefined}
                />
            )}

            {/* Create / Edit Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{editingEventId ? 'Edit Event' : 'Create New Event'}</h3>
                            <button onClick={() => setIsEventModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={labelClass}>Event Title <span className="text-red-500">*</span></label>
                                <input type="text" className={inputClass} value={formData.eventTitle} onChange={e => setFormData({ ...formData, eventTitle: e.target.value })} placeholder="e.g. Weekly Huddle" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                                    <input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Time <span className="text-red-500">*</span></label>
                                    <input type="time" className={inputClass} value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Venue / Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="text" className={`${inputClass} pl-9`} value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} placeholder="Meeting Room A" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Meeting Link (URL)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input type="url" className={`${inputClass} pl-9`} value={formData.meetingLink} onChange={e => setFormData({ ...formData, meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Description</label>
                                <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Agenda or details..." />
                            </div>
                            {editingEventId && (
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select className={inputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Share with Group(s) <span className="text-red-500">*</span></label>
                                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                                    {targetableGroups.length > 0 ? targetableGroups.map(g => (
                                        <label key={g.id} className="flex items-center space-x-2 mb-2 last:mb-0 cursor-pointer">
                                            <input type="checkbox" checked={formData.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="text-blue-600 rounded border-gray-300" />
                                            <span className="text-sm text-gray-800">{g.name}</span>
                                        </label>
                                    )) : (
                                        <p className="text-xs text-gray-400">No groups available.</p>
                                    )}
                                </div>
                            </div>
                            {/* Conflict Error */}
                            {eventError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    <span className="font-bold mt-0.5">⚠</span>
                                    <span>{eventError}</span>
                                </div>
                            )}
                            <div className="pt-2 flex justify-end">
                                <button onClick={handleSaveEvent} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm">
                                    {editingEventId ? 'Update Event' : 'Publish Event'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCalendar;
