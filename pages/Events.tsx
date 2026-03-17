import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Event } from '../types';
import {
    CalendarDays, Plus, MapPin, User, Users, X, Clock, Link as LinkIcon,
    Edit2, ExternalLink, LayoutGrid, ChevronLeft, ChevronRight, Archive, Search, Check
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────── */

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/* ─── Event Detail Popup ─────────────────────────────────── */

interface EventDetailPopupProps {
    event: Event;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    groups: { id: string; name: string }[];
}

const EventDetailPopup: React.FC<EventDetailPopupProps> = ({ event, onClose, onEdit, onDelete, groups }) => {
    const evtDate = new Date(event.date);
    const validDate = !isNaN(evtDate.getTime());

    const startTimeStr = validDate ? evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const timeDisplay = startTimeStr && event.endTime ? `${startTimeStr} – ${event.endTime}` : startTimeStr;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-xl p-2.5 text-center min-w-[48px]">
                                <div className="text-xs font-bold uppercase opacity-80">
                                    {validDate ? evtDate.toLocaleString('default', { month: 'short' }) : '--'}
                                </div>
                                <div className="text-2xl font-black leading-none">
                                    {validDate ? evtDate.getDate() : '?'}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1 block">Event</span>
                                <h2 className="text-lg font-bold leading-tight">{event.eventTitle}</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    {/* Day */}
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">{validDate ? evtDate.toLocaleDateString([], { weekday: 'long' }) : 'Day not set'}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{validDate ? evtDate.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not set'}</span>
                    </div>

                    {/* Type */}
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <div className="w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            {event.status && event.status !== 'upcoming'
                                ? event.status.charAt(0).toUpperCase() + event.status.slice(1)
                                : 'Event'}
                        </span>
                    </div>

                    {/* Time */}
                    {timeDisplay && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{timeDisplay}</span>
                        </div>
                    )}

                    {/* Venue */}
                    {event.venue && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{event.venue}</span>
                        </div>
                    )}

                    {event.createdByName && (
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>Organizer: <span className="font-medium">{event.createdByName}</span></span>
                        </div>
                    )}

                    {event.description && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">
                            {event.description}
                        </p>
                    )}

                    {event.groupIds?.length > 0 && (
                        <div className="text-xs text-gray-400">
                            Shared with:{' '}
                            {(event.groupNames && event.groupNames.length > 0)
                                ? event.groupNames.join(', ')
                                : event.groupIds.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')
                            }
                        </div>
                    )}

                    {event.meetingLink && (
                        <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Join Here
                        </a>
                    )}

                    {(onEdit || onDelete) && (
                        <div className="flex gap-2 pt-2 border-t">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={onDelete}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                >
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

/* ─── Day Events Popup ───────────────────────────────────── */

interface DayPopupProps {
    date: Date;
    events: Event[];
    onClose: () => void;
    onSelectEvent: (evt: Event) => void;
}

const DayPopup: React.FC<DayPopupProps> = ({ date, events, onClose, onSelectEvent }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" onClick={onClose}>
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
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {events.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No events on this day.</p>
                ) : events.map(evt => {
                    const d = new Date(evt.date);
                    const validDate = !isNaN(d.getTime());
                    const timeStr = validDate ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Time TBD';
                    const endStr = evt.endTime ? ` – ${evt.endTime}` : '';
                    return (
                        <button
                            key={evt.id}
                            onClick={() => onSelectEvent(evt)}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm truncate">{evt.eventTitle}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">Event</span>
                                    <span className="truncate">{timeStr}{endStr}</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

/* ─── Calendar View ──────────────────────────────────────── */

interface CalendarViewProps {
    events: Event[];
    isAdmin: boolean;
    includeArchived: boolean;
    onDayClick: (date: Date, events: Event[]) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, isAdmin, includeArchived, onDayClick }) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based

    // Determine navigation limits
    // If Admin and Include Archived is ON, can go back 5 years.
    // Otherwise (including Agents), limit past viewing to exactly 3 months ago.
    let minYear = currentYear;
    let minMonth = currentMonth;

    if (includeArchived && isAdmin) {
        minYear = currentYear - 5;
        minMonth = 0;
    } else {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        minYear = threeMonthsAgo.getFullYear();
        minMonth = threeMonthsAgo.getMonth();
    }

    const latestEventDate = useMemo(() => {
        if (events.length === 0) return null;
        return events.reduce((latest, e) => {
            const d = new Date(e.date);
            return d > latest ? d : latest;
        }, new Date(0));
    }, [events]);

    const maxYear = latestEventDate ? latestEventDate.getFullYear() : currentYear;
    const maxMonth = latestEventDate ? latestEventDate.getMonth() : currentMonth;

    const [viewYear, setViewYear] = useState(currentYear);
    const [viewMonth, setViewMonth] = useState(currentMonth);

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

    // Build grid
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (Date | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1))
    ];

    // Fill trailing cells to complete the last row
    while (cells.length % 7 !== 0) cells.push(null);

    // Map events to dates in this month
    const eventsOnDay = (date: Date) =>
        events.filter(e => {
            const d = new Date(e.date);
            return !isNaN(d.getTime()) && isSameDay(d, date);
        });

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <button
                    onClick={prevMonth}
                    disabled={!canGoPrev}
                    className={`p-2 rounded-lg transition-colors ${canGoPrev ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-gray-900">
                    {MONTHS[viewMonth]} {viewYear}
                </h3>
                <button
                    onClick={nextMonth}
                    disabled={!canGoNext}
                    className={`p-2 rounded-lg transition-colors ${canGoNext ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 border-b">
                {DAY_LABELS.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
                {cells.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="min-h-[6rem] h-full bg-gray-50/50 border-b border-r border-gray-100" />;
                    const dayEvts = eventsOnDay(date);
                    const isToday = isSameDay(date, today);
                    const hasFuture = dayEvts.some(e => new Date(e.date) >= today);
                    const hasPast = dayEvts.some(e => new Date(e.date) < today);
                    const isLast = idx % 7 === 6;

                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => dayEvts.length > 0 ? onDayClick(date, dayEvts) : undefined}
                            className={`min-h-[6rem] h-full flex flex-col p-1.5 border-b border-r border-gray-100 transition-colors relative w-full
                ${dayEvts.length > 0 ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}
                ${isLast ? 'border-r-0' : ''}
              `}
                        >
                            <div className="w-full flex justify-end mb-1">
                                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors
                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}
              `}>
                                    {date.getDate()}
                                </span>
                            </div>
                            {dayEvts.length > 0 && (
                                <div className="w-full space-y-1 text-left flex-1 flex flex-col justify-start overflow-hidden">
                                    {dayEvts.slice(0, 2).map(evt => {
                                        const isPastEvt = new Date(evt.date) < today;
                                        return (
                                            <div
                                                key={evt.id}
                                                className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate font-medium
                                                    ${isPastEvt ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
                                                `}
                                                title={evt.eventTitle}
                                            >
                                                {evt.eventTitle}
                                            </div>
                                        );
                                    })}
                                    {dayEvts.length > 2 && (
                                        <div className="text-[10px] text-gray-500 font-medium px-1 mt-0.5">
                                            +{dayEvts.length - 2} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium inline-block text-[10px]">Event</span>Upcoming</span>
                <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium inline-block text-[10px]">Event</span>Past</span>
                <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-blue-600 inline-flex items-center justify-center text-white font-bold text-[10px]">d</span>Today</span>
            </div>
        </div>
    );
};

/* ─── Main Events Page ───────────────────────────────────── */

const Events: React.FC = () => {
    const { currentUser, groups, users } = useAuth();
    const { addEvent, deleteEvent, updateEvent, getEventsForUser, refetchEvents } = useData();

    useEffect(() => { refetchEvents(); }, []);

    const [viewMode, setViewMode] = useState<'card' | 'calendar'>('calendar');
    const [showArchived, setShowArchived] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<Event[]>([]);
    const [detailEvent, setDetailEvent] = useState<Event | null>(null);

    const [formData, setFormData] = useState({
        eventTitle: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        eventType: 'online' as 'online' | 'face-to-face',
        venue: '',
        meetingLink: '',
        groupIds: [] as string[],
        targetAgentIds: [] as string[],
        allGroups: false,
        allAgents: false,
        status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled'
    });
    const [agentSearch, setAgentSearch] = useState('');

    if (!currentUser) return null;

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const canManage = isAdmin ||
        currentUser.role === UserRole.MASTER_TRAINER ||
        currentUser.role === UserRole.TRAINER ||
        currentUser.role === UserRole.GROUP_LEADER;

    const myEvents = getEventsForUser(currentUser);
    // Locally filter archived events based on showArchived toggle for Admin
    const visibleEvents = myEvents.filter(e => {
        if (!isAdmin) return !e.archived;
        if (!showArchived) return !e.archived;
        return true;
    });

    const sortedEvents = [...visibleEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let targetableGroups = groups;
    if (currentUser.role === UserRole.TRAINER) {
        targetableGroups = groups.filter(g => currentUser.managedGroupIds?.includes(g.id));
    } else if (currentUser.role === UserRole.GROUP_LEADER) {
        targetableGroups = groups.filter(g => g.id === currentUser.groupId);
    } else if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MASTER_TRAINER) {
        targetableGroups = [];
    }

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        if (newStart) {
            const [h, m] = newStart.split(':').map(Number);
            const endH = (h + 1) % 24;
            const autoEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, startTime: newStart, endTime: autoEnd }));
        } else {
            setFormData(prev => ({ ...prev, startTime: newStart }));
        }
    };

    const handleOpenModal = (event?: Event) => {
        setAgentSearch('');
        if (event) {
            const d = new Date(event.date);
            let dateStr = '', startTimeStr = '', endTimeStr = '';
            if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
                startTimeStr = d.toTimeString().slice(0, 5);
                if (event.endTime) {
                    endTimeStr = event.endTime;
                } else {
                    const endH = (d.getHours() + 1) % 24;
                    endTimeStr = `${endH.toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                }
            } else {
                const now = new Date();
                dateStr = now.toISOString().split('T')[0];
                startTimeStr = '09:00';
                endTimeStr = '10:00';
            }
            setEditingEventId(event.id);
            setFormData({
                eventTitle: event.eventTitle,
                description: event.description,
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                eventType: event.eventType || 'online',
                venue: event.venue || '',
                meetingLink: event.meetingLink || '',
                groupIds: event.groupIds,
                targetAgentIds: event.targetAgentIds || [],
                allGroups: false,
                allAgents: false,
                status: event.status || 'upcoming'
            });
        } else {
            setEditingEventId(null);
            const initialGroups = (currentUser.role === UserRole.GROUP_LEADER && currentUser.groupId) ? [currentUser.groupId] : [];
            setFormData({ eventTitle: '', description: '', date: '', startTime: '', endTime: '', eventType: 'online', venue: '', meetingLink: '', groupIds: initialGroups, targetAgentIds: [], allGroups: false, allAgents: false, status: 'upcoming' });
        }
        setIsModalOpen(true);
        setDetailEvent(null);
    };

    const handleSave = async () => {
        if (!formData.eventTitle || !formData.date || !formData.startTime || !formData.description) {
            alert('Please fill in all required fields (Title, Date, Start Time, Description).');
            return;
        }
        if (formData.eventType === 'face-to-face' && !formData.venue) {
            alert('Please enter a Venue / Location for a Face to Face event.');
            return;
        }
        if (formData.eventType === 'online' && !formData.meetingLink) {
            alert('Please enter a Meeting URL for an Online event.');
            return;
        }
        const hasGroupTarget = formData.groupIds.length > 0;
        const hasAgentTarget = formData.targetAgentIds.length > 0;
        if (!hasGroupTarget && !hasAgentTarget && currentUser.role !== UserRole.GROUP_LEADER) {
            alert('Please select at least one group or agent to share this event with.');
            return;
        }
        const dateTime = new Date(`${formData.date}T${formData.startTime}`);
        if (isNaN(dateTime.getTime())) { alert('Invalid date or time selected.'); return; }
        const eventData: Partial<Event> = {
            eventTitle: formData.eventTitle,
            description: formData.description,
            eventType: formData.eventType,
            venue: formData.eventType === 'face-to-face' ? formData.venue : undefined,
            meetingLink: formData.eventType === 'online' ? formData.meetingLink : undefined,
            date: dateTime.toISOString(),
            endTime: formData.endTime || undefined,
            groupIds: formData.groupIds,
            targetAgentIds: formData.targetAgentIds.length > 0 ? formData.targetAgentIds : undefined,
            status: formData.status
        };
        if (editingEventId) {
            await updateEvent(editingEventId, eventData);
        } else {
            await addEvent({ ...eventData, createdBy: currentUser.id, createdByName: currentUser.name });
        }
        setIsModalOpen(false);
        setEditingEventId(null);
        setFormData({ eventTitle: '', description: '', date: '', startTime: '', endTime: '', eventType: 'online', venue: '', meetingLink: '', groupIds: [], targetAgentIds: [], allGroups: false, allAgents: false, status: 'upcoming' });
    };

    const toggleGroup = (id: string) => {
        setFormData(prev => prev.groupIds.includes(id)
            ? { ...prev, groupIds: prev.groupIds.filter(g => g !== id) }
            : { ...prev, groupIds: [...prev.groupIds, id] }
        );
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this event?')) {
            await deleteEvent(id);
            setDetailEvent(null);
        }
    };

    const handleDayClick = (date: Date, evts: Event[]) => {
        setSelectedDayDate(date);
        setSelectedDayEvents(evts);
    };

    const closeDayPopup = () => { setSelectedDayDate(null); setSelectedDayEvents([]); };

    const inputClass = 'block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm';
    const labelClass = 'block text-xs font-semibold text-gray-500 uppercase mb-1';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Events &amp; Meetings</h1>
                    <p className="text-sm text-gray-500">Training sessions, huddles, and group meetings.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Archive Toggle — admin only */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowArchived(s => !s)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showArchived
                                ? 'bg-amber-50 border-amber-300 text-amber-700'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Archive className="w-4 h-4" />
                            {showArchived ? 'Archived: On' : 'Show Archived'}
                        </button>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <CalendarDays className="w-4 h-4" /> Calendar
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Cards
                        </button>
                    </div>

                    {/* Create Button */}
                    {canManage && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create Event
                        </button>
                    )}
                </div>
            </div>

            {/* Archived banner */}
            {isAdmin && showArchived && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <Archive className="w-4 h-4 flex-shrink-0" />
                    <span>Showing <strong>archived events</strong> (previous years). Only visible to Admin.</span>
                </div>
            )}

            {/* ── CALENDAR VIEW ── */}
            {viewMode === 'calendar' && (
                <CalendarView
                    events={sortedEvents}
                    isAdmin={isAdmin}
                    includeArchived={showArchived}
                    onDayClick={handleDayClick}
                />
            )}

            {/* ── CARD VIEW ── */}
            {viewMode === 'card' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sortedEvents.length > 0 ? sortedEvents.map(evt => {
                        const isCreator = evt.createdBy === currentUser.id;
                        const canEditEvent = isAdmin || isCreator;
                        const evtDate = new Date(evt.date);
                        const validDate = !isNaN(evtDate.getTime());
                        const isPast = validDate && evtDate < new Date();

                        return (
                            <div
                                key={evt.id}
                                className={`bg-white p-6 rounded-xl shadow-sm border flex flex-col hover:border-blue-300 transition-colors cursor-pointer ${isPast ? 'border-gray-100 opacity-80' : 'border-gray-100'
                                    }`}
                                onClick={() => setDetailEvent(evt)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center mr-4 border ${isPast ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                            <span className="text-xs font-bold uppercase">
                                                {validDate ? evtDate.toLocaleString('default', { month: 'short' }) : 'NA'}
                                            </span>
                                            <span className="text-xl font-bold leading-none">
                                                {validDate ? evtDate.getDate() : '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{evt.eventTitle}</h3>
                                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {validDate
                                                    ? evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                                    : 'Time not set'}
                                            </div>
                                        </div>
                                    </div>
                                    {canEditEvent && (
                                        <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleOpenModal(evt)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(evt.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{evt.description}</p>

                                <div className="mt-auto space-y-2 border-t pt-4">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="font-medium">{evt.venue || 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <User className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="truncate">Organizer: {evt.createdByName}</span>
                                    </div>
                                    {evt.meetingLink && (
                                        <div className="pt-2" onClick={e => e.stopPropagation()}>
                                            <a
                                                href={evt.meetingLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" /> Join Here
                                            </a>
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 font-medium">
                                        Shared with:{' '}
                                        {(evt.groupNames && evt.groupNames.length > 0)
                                            ? evt.groupNames.join(', ')
                                            : evt.groupIds.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')
                                        }
                                    </div>
                                    {evt.archived && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                            <Archive className="w-3 h-3" /> Archived
                                        </span>
                                    )}
                                    {evt.status && evt.status !== 'upcoming' && (
                                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${evt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {evt.status.charAt(0).toUpperCase() + evt.status.slice(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-2 p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No events available.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Day Popup ── */}
            {selectedDayDate && (
                <DayPopup
                    date={selectedDayDate}
                    events={selectedDayEvents}
                    onClose={closeDayPopup}
                    onSelectEvent={evt => { closeDayPopup(); setDetailEvent(evt); }}
                />
            )}

            {/* ── Event Detail Popup ── */}
            {detailEvent && (
                <EventDetailPopup
                    event={detailEvent}
                    groups={groups}
                    onClose={() => setDetailEvent(null)}
                    onEdit={(isAdmin || detailEvent.createdBy === currentUser.id) ? () => { handleOpenModal(detailEvent); } : undefined}
                    onDelete={(isAdmin || detailEvent.createdBy === currentUser.id) ? () => handleDelete(detailEvent.id) : undefined}
                />
            )}

            {/* ── CREATE / EDIT MODAL ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{editingEventId ? 'Edit Event' : 'Create New Event'}</h2>
                                <p className="text-sm text-gray-500 mt-1">{editingEventId ? 'Update the details of this event.' : 'Schedule a new event for your team.'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* ── Section 1: Event Details ── */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-blue-500" />
                                    Event Details
                                </h3>

                                <div>
                                    <label className={labelClass}>Event Title <span className="text-red-500">*</span></label>
                                    <input type="text" className={inputClass} value={formData.eventTitle} onChange={e => setFormData({ ...formData, eventTitle: e.target.value })} placeholder="e.g. Weekly Huddle" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                                        <input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Start Time <span className="text-red-500">*</span></label>
                                        <input type="time" className={inputClass} value={formData.startTime} onChange={handleStartTimeChange} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>End Time</label>
                                        <input type="time" className={inputClass} value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                                    </div>
                                </div>

                                {editingEventId && (
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <select className={inputClass} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as 'upcoming' | 'completed' | 'cancelled' })}>
                                            <option value="upcoming">Upcoming</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-200" />

                            {/* ── Section 2: Event Type & Location ── */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    Event Type &amp; Location
                                </h3>

                                <div>
                                    <label className={labelClass}>Event Type <span className="text-red-500">*</span></label>
                                    <select
                                        className={inputClass}
                                        value={formData.eventType}
                                        onChange={e => {
                                            const val = e.target.value as 'online' | 'face-to-face';
                                            setFormData({ ...formData, eventType: val, venue: '', meetingLink: '' });
                                        }}
                                    >
                                        <option value="online">Online</option>
                                        <option value="face-to-face">Face to Face</option>
                                    </select>
                                </div>

                                {formData.eventType === 'online' && (
                                    <div>
                                        <label className={labelClass}>Meeting URL <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input type="url" className={`${inputClass} pl-9`} value={formData.meetingLink} onChange={e => setFormData({ ...formData, meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." />
                                        </div>
                                    </div>
                                )}

                                {formData.eventType === 'face-to-face' && (
                                    <div>
                                        <label className={labelClass}>Venue / Google Maps or Waze Direction <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input type="text" className={`${inputClass} pl-9`} value={formData.venue} onChange={e => setFormData({ ...formData, venue: e.target.value })} placeholder="e.g. Level 12, Menara XYZ or paste Google Maps / Waze link" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-200" />

                            {/* ── Section 3: Description ── */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    Description
                                </h3>
                                <div>
                                    <label className={labelClass}>Event Description <span className="text-red-500">*</span></label>
                                    <textarea className={inputClass} rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Agenda, objectives, or details about this event..." />
                                </div>
                            </div>

                            <hr className="border-gray-200" />

                            {/* ── Section 4: Audience ── */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    Audience
                                </h3>

                                {currentUser.role === UserRole.GROUP_LEADER ? (
                                    /* Group Leader: agents in their group */
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={formData.allAgents}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        allAgents: checked,
                                                        groupIds: checked ? (currentUser.groupId ? [currentUser.groupId] : []) : [],
                                                        targetAgentIds: checked ? [] : []
                                                    }));
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-700">All agents in my group</span>
                                        </label>
                                        {!formData.allAgents && (
                                            <>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                                    <input type="text" placeholder="Search agents..." className={`${inputClass} pl-8`} value={agentSearch} onChange={e => setAgentSearch(e.target.value)} />
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                    {users
                                                        .filter(u => u.groupId === currentUser.groupId && (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER) && u.id !== currentUser.id)
                                                        .filter(u => u.name?.toLowerCase().includes(agentSearch.toLowerCase()))
                                                        .map(u => (
                                                            <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                    checked={formData.targetAgentIds.includes(u.id)}
                                                                    onChange={() => setFormData(prev => ({
                                                                        ...prev,
                                                                        targetAgentIds: prev.targetAgentIds.includes(u.id) ? prev.targetAgentIds.filter(id => id !== u.id) : [...prev.targetAgentIds, u.id]
                                                                    }))}
                                                                />
                                                                <span className="text-sm text-gray-800 font-medium truncate">{u.name}</span>
                                                            </label>
                                                        ))
                                                    }
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* Admin / Master Trainer / Trainer */
                                    <div className="space-y-4">
                                        {/* Groups */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Groups</p>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={formData.allGroups}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setFormData(prev => ({ ...prev, allGroups: checked, groupIds: checked ? targetableGroups.map(g => g.id) : [] }));
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-gray-700">All groups</span>
                                            </label>
                                            {!formData.allGroups && (
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                                    {targetableGroups.length > 0 ? targetableGroups.map(g => (
                                                        <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                            <input type="checkbox" checked={formData.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                            <span className="text-sm text-gray-800 font-medium">{g.name}</span>
                                                        </label>
                                                    )) : <p className="text-xs text-gray-400 col-span-2">No groups available.</p>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Individual Agents */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Individual Agents (optional)</p>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                                <input type="text" placeholder="Search by name..." className={`${inputClass} pl-8`} value={agentSearch} onChange={e => setAgentSearch(e.target.value)} />
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                                {(() => {
                                                    const pool = users.filter(u =>
                                                        (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER) &&
                                                        (targetableGroups.length === 0 || targetableGroups.some(g => g.id === u.groupId)) &&
                                                        u.name?.toLowerCase().includes(agentSearch.toLowerCase())
                                                    );
                                                    if (pool.length === 0) return <p className="text-xs text-gray-400 col-span-2">No agents found.</p>;
                                                    return pool.map(u => (
                                                        <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                checked={formData.targetAgentIds.includes(u.id)}
                                                                onChange={() => setFormData(prev => ({
                                                                    ...prev,
                                                                    targetAgentIds: prev.targetAgentIds.includes(u.id) ? prev.targetAgentIds.filter(id => id !== u.id) : [...prev.targetAgentIds, u.id]
                                                                }))}
                                                            />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm text-gray-900 font-medium truncate">{u.name}</span>
                                                                <span className="text-[10px] text-gray-400 truncate">{groups.find(g => g.id === u.groupId)?.name || ''}</span>
                                                            </div>
                                                        </label>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20">
                                <Check className="w-4 h-4" />
                                {editingEventId ? 'Update Event' : 'Publish Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Events;
