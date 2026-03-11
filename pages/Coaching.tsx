import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { MessageSquarePlus, CalendarDays, MapPin, Users, CheckCircle2, ChevronRight, Clock, XCircle, Info, AlignLeft, CheckSquare, Edit2 } from 'lucide-react';
import CreateCoachingModal from '../components/CreateCoachingModal';
import { CoachingSession, User } from '../types';

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

const Coaching: React.FC = () => {
    const { currentUser, groups, users } = useAuth();
    const { getCoachingSessionsForUser, updateCoachingSession } = useData();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [editingSession, setEditingSession] = useState<CoachingSession | null>(null);

    if (!currentUser) return null;

    const sessions = getCoachingSessionsForUser(currentUser);

    // Handlers for Management
    const handleConfirmAttendance = async (sessionId: string, agent: User) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        // Check if agent is already in the attendance array
        const existingAttendance = session.attendance.find(a => a.agentId === agent.id);

        let newAttendance;
        if (existingAttendance) {
            newAttendance = session.attendance.map(a =>
                a.agentId === agent.id
                    ? { ...a, status: 'completed' as const, confirmedAt: new Date().toISOString() }
                    : a
            );
        } else {
            newAttendance = [
                ...session.attendance,
                { 
                    agentId: agent.id, 
                    agentName: agent.name || agent.email, 
                    groupId: agent.groupId, 
                    joinedAt: new Date().toISOString(), 
                    status: 'completed' as const, 
                    confirmedAt: new Date().toISOString() 
                }
            ];
        }

        await updateCoachingSession(sessionId, { attendance: newAttendance });
    };

    const handleConfirmAllAttendance = async (sessionId: string, invitedAgents: User[]) => {
        if (!window.confirm('Are you sure you want to mark ALL listed agents as confirmed?')) return;
        
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const newAttendance = [...session.attendance];
        
        invitedAgents.forEach(agent => {
            if (!canConfirmAgent(agent.groupId)) return;
            
            const existingIdx = newAttendance.findIndex(a => a.agentId === agent.id);
            if (existingIdx >= 0) {
                newAttendance[existingIdx] = { ...newAttendance[existingIdx], status: 'completed' as const, confirmedAt: new Date().toISOString() };
            } else {
                newAttendance.push({
                    agentId: agent.id,
                    agentName: agent.name || agent.email,
                    groupId: agent.groupId,
                    joinedAt: new Date().toISOString(),
                    status: 'completed' as const,
                    confirmedAt: new Date().toISOString()
                });
            }
        });

        await updateCoachingSession(sessionId, { attendance: newAttendance });
    };

    // Handler to cancel a session (management only)
    const handleCancelSession = async (sessionId: string) => {
        if (!window.confirm('Are you sure you want to cancel this coaching session? Agents will be notified and the time slot will be freed.')) return;
        await updateCoachingSession(sessionId, { status: 'cancelled' });
        if (selectedSessionId === sessionId) setSelectedSessionId(null);
    };

    // Only admin, master trainer, and group trainers manage sessions.
    // Group Leader and Agent are view-only.
    const isManagement = currentUser.role === UserRole.TRAINER ||
        currentUser.role === UserRole.MASTER_TRAINER ||
        currentUser.role === UserRole.ADMIN;

    // Who can manage attendance for a given session:
    // - Admin: full control over ALL sessions
    // - Master Trainer: full control over ALL sessions
    // - Group Trainer: only sessions THEY created
    const canManageSession = (sessionCreatorId: string) => {
        if (currentUser.role === UserRole.ADMIN) return true;
        if (currentUser.role === UserRole.MASTER_TRAINER) return true;
        if (currentUser.role === UserRole.TRAINER) return sessionCreatorId === currentUser.id;
        return false;
    };

    // Within a manageable session, can a trainer confirm this specific agent?
    // Group Trainer: only their managed group members
    const canConfirmAgent = (agentGroupId?: string) => {
        if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MASTER_TRAINER) return true;
        if (currentUser.role === UserRole.TRAINER) {
            return currentUser.managedGroupIds?.includes(agentGroupId || '') ?? false;
        }
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
            
            // Calculate 1 hour before start
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Coaching & Attendance</h1>
                    <p className="text-slate-500 mt-1">
                        {isManagement
                            ? 'Manage coaching sessions and track attendance.'
                            : 'View your assigned coaching sessions below.'}
                    </p>
                </div>

                {isManagement && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                        Create Session
                    </button>
                )}
            </div>

            {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-50 text-indigo-500 rounded-full mb-4">
                        <MessageSquarePlus className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Coaching Sessions</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        {isManagement
                            ? "You haven't scheduled any coaching sessions yet. Click the button above to create one."
                            : "You don't have any upcoming coaching sessions assigned right now."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List of Sessions */}
                    <div className={`col-span-1 ${isManagement ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-4`}>
                        <h2 className="font-semibold text-slate-700 uppercase text-xs tracking-wider mb-2">Your Sessions</h2>

                        {sessions.map(session => {
                            const isCancelled = session.status === 'cancelled';
                            const sessionOver = isSessionOver(session);
                            const isAgentConfirmed = !isManagement && session.attendance.some(a => a.agentId === currentUser.id && a.status === 'completed');

                            let cardClass = 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm';
                            if (isCancelled) {
                                cardClass = 'bg-red-50 border-red-200 opacity-80';
                            } else if (!isManagement) {
                                if (isAgentConfirmed) {
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

                            // Derive a colour for the type badge
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
                                        <h3 className={`font-bold ${isCancelled ? 'text-red-700 line-through' : 'text-slate-900'}`}>{session.title}</h3>
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

                                    <div className="space-y-2 mt-3 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-slate-400" />
                                            <span>{formatDate(session.date)} ({session.durationStart} - {session.durationEnd})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            <span>{session.venue} {session.venue === 'Online' && session.link ? `- ${session.link}` : session.venue === 'Face to Face' && session.link ? `- ${session.link}` : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span>{session.coachingType} | By: {session.createdByName}</span>
                                        </div>
                                        {session.description && (
                                            <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                                                <AlignLeft className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                                                <p className="text-sm font-medium text-slate-700 italic">{session.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Management: Edit and Cancel buttons */}
                                    {isManagement && !isCancelled && canManageSession(session.createdBy) && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end gap-2">
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

                                    {/* For Agents & Group Leaders: info-only notice */}
                                    {!isManagement && !isCancelled && (
                                        <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs font-bold ${
                                            isAgentConfirmed 
                                                ? 'text-emerald-700 border-emerald-200' 
                                                : sessionOver 
                                                    ? 'text-amber-700 border-amber-200' 
                                                    : 'text-slate-500 border-slate-100'
                                        }`}>
                                            {isAgentConfirmed ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Attendance Confirmed</>
                                            ) : sessionOver ? (
                                                <><Info className="w-4 h-4" /> Did Not Attend</>
                                            ) : (
                                                <><Clock className="w-4 h-4" /> Attendance tracked by trainer.</>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancelled notice for agents */}
                                    {!isManagement && isCancelled && (
                                        <div className="mt-3 pt-3 border-t border-red-100">
                                            <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                                                <XCircle className="w-3.5 h-3.5" />
                                                This session has been cancelled. You may join another session at this time.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Details & Attendance (For Management Only) */}
                    {isManagement && (
                        <div className="col-span-1 lg:col-span-2">
                            <h2 className="font-semibold text-slate-700 uppercase text-xs tracking-wider mb-2">Attendance Sheet</h2>

                            {selectedSessionId ? (() => {
                                const sel = sessions.find(s => s.id === selectedSessionId);
                                if (!sel) return null;

                                // Only show attendance panel if current user can manage this session
                                if (!canManageSession(sel.createdBy)) {
                                    return (
                                        <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-10 text-center text-slate-500">
                                            <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="font-medium">Attendance managed by the session creator.</p>
                                            <p className="text-xs mt-1">Only admins and the trainer who created this session can manage attendance.</p>
                                        </div>
                                    );
                                }

                                // Get the full list of agents invited (either by direct agent ID or via group ID)
                                const invitedAgents = users.filter(u => 
                                    u.role === UserRole.AGENT && 
                                    (
                                        (sel.targetAgentIds && sel.targetAgentIds.includes(u.id)) || 
                                        (u.groupId && sel.targetGroupIds && sel.targetGroupIds.includes(u.groupId)) ||
                                        // If empty arrays (like Peer Circles or "All Groups"), it applies to scoped agents
                                        (sel.targetAgentIds?.length === 0 && sel.targetGroupIds?.length === 0)
                                    )
                                ).filter(u => canConfirmAgent(u.groupId));

                                // Remove duplicates just in case
                                const uniqueInvitedAgents = Array.from(new Map(invitedAgents.map(a => [a.id, a])).values());
                                const selOver = isSessionOver(sel);

                                return (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg">{sel.title}</h3>
                                                    <p className="text-sm text-slate-500 mt-0.5">{sel.coachingType} · {formatDate(sel.date)} · {sel.durationStart}–{sel.durationEnd}</p>
                                                </div>
                                                {/* Actions */}
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    {uniqueInvitedAgents.length > 0 && uniqueInvitedAgents.some(a => sel.attendance.find(att => att.agentId === a.id)?.status !== 'completed') && (
                                                        selOver ? (
                                                            <button
                                                                onClick={() => handleConfirmAllAttendance(sel.id, uniqueInvitedAgents)}
                                                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-100/50 hover:bg-emerald-200/50 border border-emerald-200 rounded-xl transition-colors shadow-sm"
                                                            >
                                                                <CheckSquare className="w-4 h-4" />
                                                                Confirm All
                                                            </button>
                                                        ) : (
                                                            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium whitespace-nowrap">
                                                                Session must end before confirming
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-0">
                                            {uniqueInvitedAgents.length === 0 ? (
                                                <div className="p-10 text-center text-slate-500">
                                                    No agents are assigned to this session in your managed groups.
                                                </div>
                                            ) : (
                                                <table className="w-full text-left text-sm text-slate-600">
                                                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-6 py-4">Agent Name</th>
                                                            <th className="px-6 py-4 hidden md:table-cell">Group</th>
                                                            <th className="px-6 py-4 w-36">Status</th>
                                                            <th className="px-6 py-4 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {uniqueInvitedAgents.map(agent => {
                                                            const attendanceRecord = sel.attendance.find(a => a.agentId === agent.id);
                                                            const isConfirmed = attendanceRecord?.status === 'completed';

                                                            return (
                                                                <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <p className="font-medium text-slate-900">{agent.name || agent.email}</p>
                                                                    </td>
                                                                    <td className="px-6 py-4 hidden md:table-cell text-slate-500">
                                                                        {agent.groupId ? groups.find(g => g.id === agent.groupId)?.name || '' : 'N/A'}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {isConfirmed
                                                                            ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</span>
                                                                            : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" />Pending</span>
                                                                        }
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        {!isConfirmed && (
                                                                            <button
                                                                                disabled={!selOver}
                                                                                onClick={() => handleConfirmAttendance(selectedSessionId, agent)}
                                                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-sm ${
                                                                                    selOver 
                                                                                        ? 'text-emerald-700 bg-emerald-100/50 hover:bg-emerald-200/50 border border-emerald-200' 
                                                                                        : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                                                                                }`}
                                                                            >
                                                                                Confirm
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                    <ChevronRight className="w-8 h-8 text-slate-300 mb-2" />
                                    <p>Select a session from the list to view attendance.</p>
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
