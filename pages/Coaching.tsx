
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, Group, User } from '../types';
import { apiCall } from '../services/apiClient';
import { MessageSquarePlus, CalendarDays, MapPin, Users, CheckCircle2, ChevronRight, Clock, XCircle, Info, AlignLeft, Edit2, LogIn, Loader2, AlertCircle } from 'lucide-react';
import CreateCoachingModal from '../components/CreateCoachingModal';
import { CoachingSession } from '../types';

const isSessionOver = (session: CoachingSession) => {
    try {
        const sessionDate = new Date(session.date);
        if (isNaN(sessionDate.getTime())) return false;
        const [eh, em] = session.durationEnd.split(':').map(Number);
        sessionDate.setHours(eh, em, 0, 0);
        return new Date() > sessionDate;
    } catch {
        return false;
    }
};

const isSessionOngoing = (session: CoachingSession) => {
    try {
        const sessionDate = new Date(session.date);
        if (isNaN(sessionDate.getTime())) return false;
        const [sh, sm] = session.durationStart.split(':').map(Number);
        const [eh, em] = session.durationEnd.split(':').map(Number);
        const startDate = new Date(sessionDate);
        startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(sessionDate);
        endDate.setHours(eh, em, 0, 0);
        const now = new Date();
        return now >= startDate && now < endDate;
    } catch {
        return false;
    }
};

const Coaching: React.FC = () => {
    const { currentUser } = useAuth();
    const { getCoachingSessionsForUser, updateCoachingSession, joinCoachingSession, refetchCoachingSessions, isLoadingCoaching, coachingError } = useData();

    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        refetchCoachingSessions();
        apiCall('/groups').then(res => setGroups(Array.isArray(res.data) ? res.data : [])).catch(() => {});
        apiCall('/users').then(res => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    }, []);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [editingSession, setEditingSession] = useState<CoachingSession | null>(null);

    if (!currentUser) return null;

    const sessions = getCoachingSessionsForUser(currentUser);

    // Handler for agents/group leaders to self-register attendance
    const handleJoinSession = async (sessionId: string) => {
        await joinCoachingSession(sessionId, currentUser);
    };

    // Handler to cancel a session (management only)
    const handleCancelSession = async (sessionId: string) => {
        if (!window.confirm('Are you sure you want to cancel this coaching session? Agents will be notified and the time slot will be freed.')) return;
        await updateCoachingSession(sessionId, { status: 'cancelled' });
        if (selectedSessionId === sessionId) setSelectedSessionId(null);
    };

    // Only admin, master trainer, group trainers, and group leaders manage sessions.
    const isManagement = currentUser.role === UserRole.TRAINER ||
        currentUser.role === UserRole.MASTER_TRAINER ||
        currentUser.role === UserRole.ADMIN ||
        currentUser.role === UserRole.GROUP_LEADER;

    // Who can manage a given session:
    // - Admin / Master Trainer: full control over ALL sessions
    // - Group Trainer: only sessions THEY created
    // - Group Leader: only Peer Circle sessions THEY created
    const canManageSession = (sessionCreatorId: string) => {
        if (currentUser.role === UserRole.ADMIN) return true;
        if (currentUser.role === UserRole.MASTER_TRAINER) return true;
        if (currentUser.role === UserRole.TRAINER) return sessionCreatorId === currentUser.id;
        if (currentUser.role === UserRole.GROUP_LEADER) return sessionCreatorId === currentUser.id;
        return false;
    };

    // A session can be edited by its creator (or admin/master) up to 1 hour before it starts
    const canEditSession = (session: CoachingSession) => {
        if (!canManageSession(session.createdBy)) return false;
        if (session.status === 'cancelled') return false;
        try {
            const d = new Date(session.date);
            if (isNaN(d.getTime())) return false;
            const [sh, sm] = session.durationStart.split(':').map(Number);
            d.setHours(sh, sm, 0, 0);
            const editWindowClosed = d.getTime() - (60 * 60 * 1000);
            return Date.now() < editWindowClosed;
        } catch {
            return false;
        }
    };

    const formatDate = (ds: string) => {
        const dateObj = new Date(ds);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        return dateObj.toLocaleDateString([], { dateStyle: 'medium' });
    };

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };

    return (
        <div className="space-y-6">
            {/* Error Banner */}
            {coachingError && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Failed to load coaching sessions. Check your connection and refresh the page.</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coaching & Attendance</h1>
                    <p className="text-gray-500 mt-1">
                        {currentUser.role === UserRole.GROUP_LEADER
                            ? 'Schedule Peer Circle sessions and track attendance for your team.'
                            : isManagement
                            ? 'Manage coaching sessions and track attendance.'
                            : 'View your assigned coaching sessions below.'}
                    </p>
                </div>

                {isManagement && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm text-sm font-medium"
                    >
                        <MessageSquarePlus className="w-4 h-4 mr-2" />
                        Create Session
                    </button>
                )}
            </div>

            {isLoadingCoaching ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mr-3" />
                    <span className="text-sm font-medium">Loading sessions...</span>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-50 text-indigo-500 rounded-full mb-4">
                        <MessageSquarePlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Coaching Sessions</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">
                        {currentUser.role === UserRole.GROUP_LEADER
                            ? "No sessions yet. Click 'Create Session' to run a Peer Circle with your agents."
                            : isManagement
                            ? "You haven't scheduled any coaching sessions yet. Click the button above to create one."
                            : "You don't have any upcoming coaching sessions assigned right now."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List of Sessions */}
                    <div className={`col-span-1 ${isManagement ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
                        <h2 className="font-semibold text-gray-700 uppercase text-xs tracking-wider mb-2">Your Sessions</h2>

                        {sessions.map(session => {
                            const isCancelled = session.status === 'cancelled';
                            const sessionOver = isSessionOver(session);
                            const sessionOngoing = isSessionOngoing(session);
                            // isParticipant: agents always, group leaders when they didn't create the session
                            const isParticipant = currentUser.role === UserRole.AGENT ||
                                (currentUser.role === UserRole.GROUP_LEADER && session.createdBy !== currentUser.id);
                            const myAttendance = session.attendance.find(a => a.agentId === currentUser.id);
                            const hasJoined = isParticipant && myAttendance?.status === 'joined';

                            let cardClass = 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm';
                            if (isCancelled) {
                                cardClass = 'bg-red-50 border-red-200 opacity-80';
                            } else if (isParticipant) {
                                if (hasJoined) {
                                    cardClass = 'bg-emerald-50 border-emerald-500 shadow-sm';
                                } else if (sessionOver) {
                                    cardClass = 'bg-amber-50 border-amber-500 shadow-sm text-amber-900';
                                } else if (selectedSessionId === session.id) {
                                    cardClass = 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500';
                                }
                            } else {
                                if (selectedSessionId === session.id) {
                                    cardClass = 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500';
                                }
                            }

                            const typeBadgeClass = {
                                'Individual Coaching': 'bg-blue-100 text-blue-700',
                                'Group Coaching': 'bg-green-100 text-green-700',
                                'Peer Circles': 'bg-purple-100 text-purple-700',
                                '2 Full Days Seminar': 'bg-orange-100 text-orange-700',
                                '2 Hours Online Seminar': 'bg-teal-100 text-teal-700',
                            }[session.coachingType] || 'bg-gray-100 text-gray-600';

                            return (
                                <div
                                    key={session.id}
                                    className={`border rounded-xl p-4 transition-all cursor-pointer ${cardClass}`}
                                    onClick={() => setSelectedSessionId(session.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-bold ${isCancelled ? 'text-red-700 line-through' : 'text-gray-900'}`}>{session.title}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${typeBadgeClass}`}>
                                                {session.coachingType}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${isCancelled ? 'bg-red-100 text-red-600'
                                                : session.status === 'upcoming' ? 'bg-blue-50 text-blue-600'
                                                    : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {isCancelled ? '✕ CANCELLED' : session.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-gray-400" />
                                            <span>{formatDate(session.date)} ({session.durationStart} - {session.durationEnd})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>{session.venue} {session.venue === 'Online' && session.link ? `- ${session.link}` : session.venue === 'Face to Face' && session.link ? `- ${session.link}` : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <span>{session.coachingType} | By: {session.createdByName}</span>
                                        </div>
                                        {session.description && (
                                            <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                                                <AlignLeft className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                                <p className="text-sm font-medium text-gray-700 italic">{session.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Management: Edit and Cancel buttons */}
                                    {isManagement && !isCancelled && canManageSession(session.createdBy) && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                                            {canEditSession(session) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingSession(session); setIsCreateModalOpen(true); }}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Edit Session
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleCancelSession(session.id); }}
                                                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Cancel Session
                                            </button>
                                        </div>
                                    )}

                                    {/* For Agents & participating Group Leaders: attendance status + Join button */}
                                    {isParticipant && !isCancelled && (
                                        <div className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 ${
                                            hasJoined
                                                ? 'border-emerald-200'
                                                : sessionOver
                                                    ? 'border-amber-200'
                                                    : 'border-gray-100'
                                        }`}>
                                            {hasJoined ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Attendance Logged — {myAttendance?.joinedAt ? formatDateTime(myAttendance.joinedAt) : ''}
                                                </span>
                                            ) : sessionOngoing ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleJoinSession(session.id); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                                                >
                                                    <LogIn className="w-3.5 h-3.5" /> Join Session
                                                </button>
                                            ) : sessionOver ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                                    <Info className="w-4 h-4" /> Did Not Attend
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                                                    <Clock className="w-4 h-4" /> Join button available at {session.durationStart}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancelled notice for participants */}
                                    {isParticipant && isCancelled && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                                                <XCircle className="w-3.5 h-3.5" />
                                                This session has been cancelled.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Attendance Log (For Management Only) */}
                    {isManagement && (
                        <div className="col-span-1 lg:col-span-2">
                            <h2 className="font-semibold text-gray-700 uppercase text-xs tracking-wider mb-2">Attendance Log</h2>

                            {selectedSessionId ? (() => {
                                const sel = sessions.find(s => s.id === selectedSessionId);
                                if (!sel) return null;

                                if (!canManageSession(sel.createdBy)) {
                                    return (
                                        <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed p-10 text-center text-gray-500">
                                            <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                            <p className="font-medium">Attendance managed by the session creator.</p>
                                            <p className="text-xs mt-1">Only admins and the trainer who created this session can view the attendance log.</p>
                                        </div>
                                    );
                                }

                                // Get the full list of agents invited (agents + group leaders who participate)
                                const invitedAgents = Array.from(
                                    new Map(
                                        users.filter(u =>
                                            (u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER) &&
                                            (
                                                (sel.targetAgentIds && sel.targetAgentIds.includes(u.id)) ||
                                                (u.group_id && sel.targetGroupIds && sel.targetGroupIds.includes(u.group_id)) ||
                                                (sel.targetAgentIds?.length === 0 && sel.targetGroupIds?.length === 0)
                                            )
                                        ).map(a => [a.id, a])
                                    ).values()
                                );

                                const attendedAgents = invitedAgents.filter(u =>
                                    sel.attendance.find(a => a.agentId === u.id)?.status === 'joined'
                                );
                                const notAttendedAgents = invitedAgents.filter(u =>
                                    !sel.attendance.find(a => a.agentId === u.id && a.status === 'joined')
                                );
                                const selOver = isSessionOver(sel);

                                return (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        {/* Panel Header */}
                                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                                            <h3 className="font-bold text-gray-900 text-lg">{sel.title}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{sel.coachingType} · {formatDate(sel.date)} · {sel.durationStart}–{sel.durationEnd}</p>
                                            <p className="text-xs font-semibold text-gray-500 mt-2">
                                                {attendedAgents.length} of {invitedAgents.length} attended
                                            </p>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {invitedAgents.length === 0 ? (
                                                <div className="p-10 text-center text-gray-500">
                                                    No agents are assigned to this session.
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Attended Section */}
                                                    <div className="p-5">
                                                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Attended ({attendedAgents.length})
                                                        </h4>
                                                        {attendedAgents.length === 0 ? (
                                                            <p className="text-sm text-gray-400 italic">No agents have logged attendance yet.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {attendedAgents.map(agent => {
                                                                    const rec = sel.attendance.find(a => a.agentId === agent.id);
                                                                    return (
                                                                        <div key={agent.id} className="flex items-center justify-between py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                                            <div>
                                                                                <p className="text-sm font-semibold text-gray-900">{agent.name || agent.email}</p>
                                                                                <p className="text-xs text-gray-500">{agent.group_id ? groups.find(g => g.id === agent.group_id)?.name || '' : 'No Group'}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-0.5">
                                                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Attended
                                                                                </span>
                                                                                <p className="text-xs text-gray-400">{rec?.joinedAt ? formatDateTime(rec.joinedAt) : '—'}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Did Not Attend Section */}
                                                    <div className="p-5">
                                                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${selOver ? 'text-amber-600' : 'text-gray-400'}`}>
                                                            <Info className="w-3.5 h-3.5" />
                                                            {selOver ? `Did Not Attend (${notAttendedAgents.length})` : `Not Yet Joined (${notAttendedAgents.length})`}
                                                        </h4>
                                                        {notAttendedAgents.length === 0 ? (
                                                            <p className="text-sm text-gray-400 italic">All invited agents attended.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {notAttendedAgents.map(agent => (
                                                                    <div key={agent.id} className={`flex items-center justify-between py-2 px-3 border rounded-xl ${selOver ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-900">{agent.name || agent.email}</p>
                                                                            <p className="text-xs text-gray-500">{agent.group_id ? groups.find(g => g.id === agent.group_id)?.name || '' : 'No Group'}</p>
                                                                        </div>
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selOver ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-gray-500'}`}>
                                                                            {selOver ? 'Did Not Attend' : 'Invited'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                                    <ChevronRight className="w-8 h-8 text-gray-300 mb-2" />
                                    <p>Select a session from the list to view the attendance log.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {isCreateModalOpen && (
                <CreateCoachingModal
                    onClose={() => { setIsCreateModalOpen(false); setEditingSession(null); }}
                    editSession={editingSession || undefined}
                />
            )}
        </div>
    );
};

export default Coaching;
