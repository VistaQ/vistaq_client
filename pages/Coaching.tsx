
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Group, User, COACHING_TYPE_LABELS, TRAINING_MODE_LABELS } from '../types';
import { apiCall } from '../services/apiClient';
import {
    MessageSquarePlus, CalendarDays, MapPin, Users, CheckCircle2, Clock,
    XCircle, Info, AlignLeft, Edit2, LogIn, Loader2, AlertCircle,
    LayoutList, LayoutGrid, ChevronDown, X,
} from 'lucide-react';
import CreateCoachingModal from '../components/CreateCoachingModal';
import { CoachingSession } from '../types';

// ─── Timing helpers (±2 hour window) ─────────────────────────────────────────

const JOIN_WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000; // 2 hours before start
const JOIN_WINDOW_AFTER_MS  = 2 * 60 * 60 * 1000; // 2 hours after end

const getJoinWindowStart = (session: CoachingSession): Date =>
    new Date(new Date(session.start_date).getTime() - JOIN_WINDOW_BEFORE_MS);

const getJoinWindowEnd = (session: CoachingSession): Date =>
    new Date(new Date(session.end_date ?? session.start_date).getTime() + JOIN_WINDOW_AFTER_MS);

const isJoinWindowOpen = (session: CoachingSession): boolean => {
    try {
        const now = new Date();
        return now >= getJoinWindowStart(session) && now < getJoinWindowEnd(session);
    } catch { return false; }
};

const isSessionEnded = (session: CoachingSession): boolean => {
    try { return new Date() >= getJoinWindowEnd(session); }
    catch { return false; }
};

const getDisplayStatus = (session: CoachingSession): { label: string; cls: string } => {
    if (session.status === 'cancelled') return { label: '✕ Cancelled', cls: 'bg-red-100 text-red-600' };
    if (isSessionEnded(session))        return { label: 'Ended',       cls: 'bg-gray-100 text-gray-500' };
    if (isJoinWindowOpen(session))      return { label: 'On-going',    cls: 'bg-emerald-50 text-emerald-600' };
    return { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600' };
};

const formatJoinWindowStart = (session: CoachingSession): string =>
    getJoinWindowStart(session).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COACHING_TYPE_BADGE: Record<string, string> = {
    individual_coaching: 'bg-blue-100 text-blue-700',
    group_coaching:      'bg-green-100 text-green-700',
    peer_circles:        'bg-purple-100 text-purple-700',
    seminar:             'bg-orange-100 text-orange-700',
};

// ─── Attendance Modal ─────────────────────────────────────────────────────────

const AttendanceModal: React.FC<{
    session: CoachingSession;
    onClose: () => void;
    formatDate: (s: string) => string;
    formatDateTime: (s: string) => string;
}> = ({ session, onClose, formatDate, formatDateTime }) => {
    const attended    = session.attendance.filter(a => a.status === 'joined');
    const notAttended = session.attendance.filter(a => a.status !== 'joined');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex items-start justify-between gap-4 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg leading-snug">{session.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {COACHING_TYPE_LABELS[session.coaching_type]} · {formatDate(session.start_date)}
                            · {new Date(session.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            –{session.end_date ? new Date(session.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                        </p>
                        <p className="text-xs font-semibold text-gray-500 mt-1.5">
                            {attended.length} of {session.attendance.length} attended
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                    {session.attendance.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">No agents assigned to this session.</div>
                    ) : (
                        <>
                            {/* Attended */}
                            <div className="p-5">
                                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Attended ({attended.length})
                                </h4>
                                {attended.length === 0
                                    ? <p className="text-sm text-gray-400 italic">No agents have logged attendance yet.</p>
                                    : <div className="space-y-2">
                                        {attended.map(rec => (
                                            <div key={rec.id} className="flex items-center justify-between py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{rec.agent_name}</p>
                                                    <p className="text-xs text-gray-500">{rec.group_name || 'No Group'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-0.5">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Attended
                                                    </span>
                                                    <p className="text-xs text-gray-400">{rec.joined_at ? formatDateTime(rec.joined_at) : '—'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>

                            {/* Not Attended */}
                            <div className="p-5">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" /> Not Attended ({notAttended.length})
                                </h4>
                                {notAttended.length === 0
                                    ? <p className="text-sm text-gray-400 italic">All invited agents attended.</p>
                                    : <div className="space-y-2">
                                        {notAttended.map(rec => (
                                            <div key={rec.id} className={`flex items-center justify-between py-2 px-3 border rounded-xl ${rec.status === 'did_not_attend' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{rec.agent_name}</p>
                                                    <p className="text-xs text-gray-500">{rec.group_name || 'No Group'}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rec.status === 'did_not_attend' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-gray-500'}`}>
                                                    {rec.status === 'did_not_attend' ? 'Did Not Attend' : 'Invited'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Coaching: React.FC = () => {
    const { currentUser } = useAuth();
    const { coachingSessions, updateCoachingSession, joinCoachingSession, markNonAttendees, refetchCoachingSessions, isLoadingCoaching, coachingError } = useData();

    const [groups, setGroups]               = useState<Group[]>([]);
    const [users, setUsers]                 = useState<User[]>([]);
    const [groupsLoadError, setGroupsLoadError] = useState(false);
    const [usersLoadError, setUsersLoadError]   = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSession, setEditingSession]       = useState<CoachingSession | null>(null);
    const [attendanceModal, setAttendanceModal]     = useState<CoachingSession | null>(null);

    // Filters & view
    const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past'>('all');
    const [filterMonth, setFilterMonth]   = useState<string>('');   // '' = all, '0'–'11'
    const [filterYear, setFilterYear]     = useState<number | null>(null); // null = all
    const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        refetchCoachingSessions();
        apiCall('/groups')
            .then(res => setGroups(Array.isArray(res.data) ? res.data : []))
            .catch(() => setGroupsLoadError(true));
        apiCall('/users')
            .then(res => setUsers(Array.isArray(res.data) ? res.data : []))
            .catch(() => setUsersLoadError(true));
    }, []);

    if (!currentUser) return null;

    // ─── Auto-mark non-attendees once per session per page load ──────────────
    const processedEndedSessions = useRef<Set<string>>(new Set());
    useEffect(() => {
        coachingSessions.forEach(session => {
            if (isSessionEnded(session) && session.status !== 'cancelled' && !processedEndedSessions.current.has(session.id)) {
                processedEndedSessions.current.add(session.id);
                markNonAttendees(session.id);
            }
        });
    }, [coachingSessions]);

    const handleJoinSession = async (sessionId: string) => {
        const session = coachingSessions.find(s => s.id === sessionId);
        await joinCoachingSession(sessionId);
        if (session?.link) window.open(session.link, '_blank', 'noopener,noreferrer');
    };

    const handleCancelSession = async (sessionId: string) => {
        if (!window.confirm('Cancel this coaching session? Agents will be notified and the time slot will be freed.')) return;
        await updateCoachingSession(sessionId, { status: 'cancelled' });
    };

    // ─── Role helpers ─────────────────────────────────────────────────────────
    const isManagement = [UserRole.TRAINER, UserRole.MASTER_TRAINER, UserRole.ADMIN, UserRole.GROUP_LEADER].includes(currentUser.role);

    const canManageSession = (creatorId: string) => {
        if ([UserRole.ADMIN, UserRole.MASTER_TRAINER].includes(currentUser.role)) return true;
        if ([UserRole.TRAINER, UserRole.GROUP_LEADER].includes(currentUser.role)) return creatorId === currentUser.id;
        return false;
    };

    const canEditSession = (session: CoachingSession) => {
        if (!canManageSession(session.created_by) || session.status === 'cancelled') return false;
        try { return Date.now() < new Date(session.start_date).getTime() - 60 * 60 * 1000; }
        catch { return false; }
    };

    // ─── Format helpers ───────────────────────────────────────────────────────
    const formatDate = (ds: string) => {
        const d = new Date(ds);
        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString([], { dateStyle: 'medium' });
    };
    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '—' : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };
    const timeRange = (s: CoachingSession) =>
        `${new Date(s.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}–${s.end_date ? new Date(s.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}`;

    // ─── Filter & sort ────────────────────────────────────────────────────────
    const availableYears = [...new Set(coachingSessions.map(s => new Date(s.start_date).getFullYear()))].sort((a, b) => b - a);

    const filteredSessions = [...coachingSessions]
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .filter(s => {
            const d = new Date(s.start_date);
            const now = new Date();
            if (filterStatus === 'upcoming' && d <= now) return false;
            if (filterStatus === 'past'     && d > now)  return false;
            if (filterMonth !== '' && d.getMonth() !== parseInt(filterMonth)) return false;
            if (filterYear !== null && d.getFullYear() !== filterYear) return false;
            return true;
        });

    // ─── Shared: participant action row (Join / attendance status) ────────────
    const ParticipantAction: React.FC<{ session: CoachingSession; compact?: boolean }> = ({ session, compact }) => {
        const isParticipant = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.GROUP_LEADER;
        if (!isParticipant || session.status === 'cancelled') return null;

        const myAttendance  = session.attendance.find(a => a.agent_id === currentUser.id);
        const hasJoined     = myAttendance?.status === 'joined';
        const didNotAttend  = myAttendance?.status === 'did_not_attend';
        const joinOpen      = isJoinWindowOpen(session);
        const ended         = isSessionEnded(session);

        if (hasJoined) return (
            <span className={`flex items-center gap-1.5 text-xs font-bold text-emerald-700 ${compact ? '' : 'mt-3 pt-3 border-t border-emerald-200'}`}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Attended {myAttendance?.joined_at ? `· ${formatDateTime(myAttendance.joined_at)}` : ''}
            </span>
        );
        if (didNotAttend || (ended && !hasJoined)) return (
            <span className={`flex items-center gap-1.5 text-xs font-bold text-amber-700 ${compact ? '' : 'mt-3 pt-3 border-t border-amber-200'}`}>
                <Info className="w-4 h-4 flex-shrink-0" /> Did Not Attend
            </span>
        );
        if (joinOpen) return (
            <button
                onClick={(e) => { e.stopPropagation(); handleJoinSession(session.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex-shrink-0"
            >
                <LogIn className="w-3.5 h-3.5" /> Join Session
            </button>
        );
        return (
            <span className={`flex items-center gap-1.5 text-xs font-medium text-gray-400 ${compact ? '' : 'mt-3 pt-3 border-t border-gray-100'}`}>
                <Clock className="w-4 h-4 flex-shrink-0" /> Available at {formatJoinWindowStart(session)}
            </span>
        );
    };

    // ─── Shared: management action buttons ───────────────────────────────────
    const ManagementActions: React.FC<{ session: CoachingSession; compact?: boolean }> = ({ session, compact }) => {
        if (!canManageSession(session.created_by) || session.status === 'cancelled') return null;
        return (
            <div className={`flex items-center gap-2 ${compact ? '' : 'mt-3 pt-3 border-t border-gray-100'} flex-shrink-0`}>
                <button
                    onClick={(e) => { e.stopPropagation(); setAttendanceModal(session); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                >
                    <Users className="w-3.5 h-3.5" /> Attendance
                </button>
                {canEditSession(session) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditingSession(session); setIsCreateModalOpen(true); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); handleCancelSession(session.id); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
                >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Error banners */}
            {coachingError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    Failed to load coaching sessions. Check your connection and refresh the page.
                </div>
            )}
            {(groupsLoadError || usersLoadError) && isManagement && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    Could not load {groupsLoadError && usersLoadError ? 'groups and users' : groupsLoadError ? 'groups' : 'users'} for session creation. Refresh to try again.
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coaching & Attendance</h1>
                    <p className="text-gray-500 mt-1">
                        {isManagement ? 'Manage coaching sessions and track attendance.' : 'View your assigned coaching sessions below.'}
                    </p>
                </div>
                {isManagement && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium"
                    >
                        <MessageSquarePlus className="w-4 h-4 mr-2" /> Create Session
                    </button>
                )}
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Status tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(['all', 'upcoming', 'past'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${filterStatus === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
                        </button>
                    ))}
                </div>

                {/* Month picker */}
                <div className="relative">
                    <select
                        value={filterMonth}
                        onChange={e => setFilterMonth(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="">All Months</option>
                        {MONTH_NAMES.map((m, i) => (
                            <option key={i} value={String(i)}>{m}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Year picker */}
                {availableYears.length > 0 && (
                    <div className="relative">
                        <select
                            value={filterYear ?? ''}
                            onChange={e => setFilterYear(e.target.value === '' ? null : parseInt(e.target.value))}
                            className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="">All Years</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                )}

                {/* View toggle */}
                <div className="ml-auto flex gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Card view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="List view"
                    >
                        <LayoutList className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Loading ── */}
            {isLoadingCoaching ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mr-3" />
                    <span className="text-sm font-medium">Loading sessions…</span>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-50 text-indigo-500 rounded-full mb-4">
                        <MessageSquarePlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Sessions Found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">
                        {filterStatus !== 'all' || filterMonth !== '' || filterYear !== null
                            ? 'No sessions match your current filters. Try adjusting the filters above.'
                            : isManagement
                                ? "You haven't scheduled any coaching sessions yet. Click the button above to create one."
                                : "You don't have any coaching sessions assigned right now."}
                    </p>
                </div>

            ) : viewMode === 'list' ? (
                /* ── LIST VIEW ───────────────────────────────────────────────── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {filteredSessions.map(session => {
                            const displayStatus = getDisplayStatus(session);
                            const isCancelled   = session.status === 'cancelled';
                            const isParticipant = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.GROUP_LEADER;
                            const myAttendance  = session.attendance.find(a => a.agent_id === currentUser.id);
                            const hasJoined     = isParticipant && myAttendance?.status === 'joined';
                            const joinOpen      = isJoinWindowOpen(session);
                            const ended         = isSessionEnded(session);

                            return (
                                <div key={session.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${isCancelled ? 'opacity-60' : ''}`}>
                                    {/* Status dot */}
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                                        isCancelled ? 'bg-red-400' :
                                        isJoinWindowOpen(session) ? 'bg-emerald-500' :
                                        ended ? 'bg-gray-300' : 'bg-blue-500'
                                    }`} />

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                            <span className={`font-semibold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                {session.title}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${COACHING_TYPE_BADGE[session.coaching_type] || 'bg-gray-100 text-gray-600'}`}>
                                                {COACHING_TYPE_LABELS[session.coaching_type]}
                                            </span>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${displayStatus.cls}`}>
                                                {displayStatus.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="w-3 h-3" />
                                                {formatDate(session.start_date)} · {timeRange(session)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {TRAINING_MODE_LABELS[session.training_mode]}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {session.created_by_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                        {/* Management buttons */}
                                        {canManageSession(session.created_by) && !isCancelled && (
                                            <>
                                                <button
                                                    onClick={() => setAttendanceModal(session)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                                                >
                                                    <Users className="w-3.5 h-3.5" /> Attendance
                                                </button>
                                                {canEditSession(session) && (
                                                    <button
                                                        onClick={() => { setEditingSession(session); setIsCreateModalOpen(true); }}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleCancelSession(session.id)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                            </>
                                        )}
                                        {/* Participant join */}
                                        {isParticipant && !isCancelled && (
                                            hasJoined ? (
                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Attended
                                                </span>
                                            ) : joinOpen ? (
                                                <button
                                                    onClick={() => handleJoinSession(session.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                                                >
                                                    <LogIn className="w-3.5 h-3.5" /> Join Session
                                                </button>
                                            ) : ended ? (
                                                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                                                    <Info className="w-3.5 h-3.5" /> Did Not Attend
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {formatJoinWindowStart(session)}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            ) : (
                /* ── GRID / CARD VIEW ────────────────────────────────────────── */
                <div className="space-y-4">
                    {filteredSessions.map(session => {
                        const isCancelled   = session.status === 'cancelled';
                        const displayStatus = getDisplayStatus(session);
                        const isParticipant = currentUser.role === UserRole.AGENT || currentUser.role === UserRole.GROUP_LEADER;
                        const myAttendance  = session.attendance.find(a => a.agent_id === currentUser.id);
                        const hasJoined     = isParticipant && myAttendance?.status === 'joined';
                        const didNotAttend  = isParticipant && (myAttendance?.status === 'did_not_attend' || (isSessionEnded(session) && !hasJoined));

                        let cardBorder = 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm';
                        if (isCancelled)   cardBorder = 'border-red-200 bg-red-50 opacity-80';
                        else if (hasJoined)     cardBorder = 'border-emerald-400 bg-emerald-50 shadow-sm';
                        else if (didNotAttend)  cardBorder = 'border-amber-400 bg-amber-50 shadow-sm';

                        return (
                            <div key={session.id} className={`border rounded-xl p-5 transition-all ${cardBorder}`}>
                                {/* Card header */}
                                <div className="flex justify-between items-start gap-3 mb-4">
                                    <h3 className={`font-bold text-base leading-snug ${isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>
                                        {session.title}
                                    </h3>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${COACHING_TYPE_BADGE[session.coaching_type] || 'bg-gray-100 text-gray-600'}`}>
                                            {COACHING_TYPE_LABELS[session.coaching_type]}
                                        </span>
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${displayStatus.cls}`}>
                                            {displayStatus.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span>{formatDate(session.start_date)} · {timeRange(session)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span>{TRAINING_MODE_LABELS[session.training_mode]}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span>{COACHING_TYPE_LABELS[session.coaching_type]} · By {session.created_by_name}</span>
                                    </div>
                                    {session.description && (
                                        <div className="flex items-start gap-2 pt-2 border-t border-gray-100 mt-2">
                                            <AlignLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-gray-600 italic">{session.description}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer: management + participant actions */}
                                {(canManageSession(session.created_by) || isParticipant) && !isCancelled && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                        <ManagementActions session={session} compact />
                                        <div className="ml-auto">
                                            <ParticipantAction session={session} compact />
                                        </div>
                                    </div>
                                )}

                                {isCancelled && isParticipant && (
                                    <div className="mt-4 pt-4 border-t border-red-100">
                                        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                                            <XCircle className="w-3.5 h-3.5" /> This session has been cancelled.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Session count */}
            {!isLoadingCoaching && filteredSessions.length > 0 && (
                <p className="text-xs text-gray-400 text-center">
                    Showing {filteredSessions.length} of {coachingSessions.length} session{coachingSessions.length !== 1 ? 's' : ''}
                </p>
            )}

            {/* Attendance Modal */}
            {attendanceModal && (
                <AttendanceModal
                    session={attendanceModal}
                    onClose={() => setAttendanceModal(null)}
                    formatDate={formatDate}
                    formatDateTime={formatDateTime}
                />
            )}

            {/* Create / Edit Modal */}
            {isCreateModalOpen && (
                <CreateCoachingModal
                    onClose={() => { setIsCreateModalOpen(false); setEditingSession(null); }}
                    editSession={editingSession || undefined}
                    groups={groups}
                    users={users}
                />
            )}
        </div>
    );
};

export default Coaching;
