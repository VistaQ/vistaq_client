import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, CoachingType, CoachingSession } from '../types';
import { X, Calendar as CalendarIcon, MapPin, Link as LinkIcon, Users, Check, Clock, AlertTriangle, Info } from 'lucide-react';
import { useCalendarConflicts, checkConflict } from '../hooks/useCalendarConflicts';

interface CreateCoachingModalProps {
    onClose: () => void;
    editSession?: CoachingSession;
}

// ─── Coaching type options by role ───────────────────────────────────────────
type TypeOption = { value: CoachingType; label: string; description: string };

const MANAGEMENT_TYPES: TypeOption[] = [
    { value: 'Individual Coaching', label: 'Individual Coaching', description: 'One-on-one or small group coaching with selected agents.' },
    { value: 'Group Coaching', label: 'Group Coaching', description: 'Coaching targeting one or more full groups.' },
    { value: '2 Full Days Seminar', label: '2 Full Days Seminar', description: 'Two-day training seminar for selected groups or agents.' },
    { value: '2 Hours Online Seminar', label: '2 Hours Online Seminar', description: 'Short online seminar for selected groups or agents.' },
];

const LEADER_TYPES: TypeOption[] = [
    { value: 'Peer Circles', label: 'Peer Circles', description: 'Group leader-led peer session for your agents.' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateCoachingModal: React.FC<CreateCoachingModalProps> = ({ onClose, editSession }) => {
    const { currentUser, groups, users } = useAuth();
    const { addCoachingSession, updateCoachingSession } = useData();
    const { occupiedSlots } = useCalendarConflicts();

    const isGroupLeader = currentUser?.role === UserRole.GROUP_LEADER;
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
    const isTrainer = currentUser?.role === UserRole.TRAINER; // Group Trainer

    const typeOptions = isGroupLeader ? LEADER_TYPES : MANAGEMENT_TYPES;

    // Default to editSession values if available
    const [coachingType, setCoachingType] = useState<CoachingType>(editSession?.coachingType || typeOptions[0].value);
    const [title, setTitle] = useState(editSession?.title || '');
    const [description, setDescription] = useState(editSession?.description || '');
    const [date, setDate] = useState(() => {
        if (!editSession?.date) return '';
        const d = new Date(editSession.date);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    });
    const [durationStart, setDurationStart] = useState(editSession?.durationStart || '10:00');
    const [durationEnd, setDurationEnd] = useState(editSession?.durationEnd || '11:00');
    const [venue, setVenue] = useState<'Online' | 'Face to Face'>(editSession?.venue || 'Online');
    const [link, setLink] = useState(editSession?.link || '');

    // Participant selection defaults based on editSession array lengths
    const determineParticipantMode = (session?: CoachingSession) => {
        if (!session) return 'all';
        if (session.coachingType === 'Individual Coaching') return 'specific_agents';
        if (session.targetAgentIds?.length && session.targetGroupIds?.length) return 'mixed';
        if (session.targetGroupIds?.length) return 'specific_groups';
        if (session.targetAgentIds?.length) return 'specific_agents';
        return 'all';
    };

    const [participantMode, setParticipantMode] = useState<'all' | 'specific_groups' | 'specific_agents' | 'mixed'>(
        determineParticipantMode(editSession)
    );
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(editSession?.targetGroupIds || []);
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(editSession?.targetAgentIds || []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // ── Derived data ─────────────────────────────────────────────────────────
    const availableGroups = React.useMemo(() => {
        if (!currentUser) return [];
        if (isAdmin || isMasterTrainer) return groups;
        if (isTrainer) return groups.filter(g => currentUser.managedGroupIds?.includes(g.id));
        if (isGroupLeader) return groups.filter(g => g.id === currentUser.groupId);
        return [];
    }, [currentUser, groups, isAdmin, isMasterTrainer, isTrainer, isGroupLeader]);

    const availableAgents = React.useMemo(() => {
        if (!currentUser) return [];
        if (isAdmin || isMasterTrainer) return users.filter(u => u.role === UserRole.AGENT);
        if (isTrainer) return users.filter(u => u.role === UserRole.AGENT && currentUser.managedGroupIds?.includes(u.groupId || ''));
        if (isGroupLeader) return users.filter(u => u.role === UserRole.AGENT && u.groupId === currentUser.groupId);
        return [];
    }, [currentUser, users, isAdmin, isMasterTrainer, isTrainer, isGroupLeader]);

    const toggleGroup = (id: string) =>
        setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

    const toggleAgent = (id: string) =>
        setSelectedAgentIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    // Reset participant state when coaching type changes
    const handleTypeChange = useCallback((type: CoachingType) => {
        setCoachingType(type);
        setSelectedGroupIds([]);
        setSelectedAgentIds([]);
        if (type === 'Individual Coaching') setParticipantMode('specific_agents');
        else if (type === 'Peer Circles') setParticipantMode('all');
        else if (type === 'Group Coaching') {
            // Admin/Master Trainer can pick groups; Trainer auto-selects all managed groups
            setParticipantMode((isAdmin || isMasterTrainer) ? 'specific_groups' : 'all');
        } else {
            // Seminar types default to mixed selection
            setParticipantMode('specific_groups');
        }
    }, [isAdmin, isMasterTrainer]);

    // Auto-calculate end time 1 hour after start time
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setDurationStart(newStart);
        if (newStart) {
            const [h, m] = newStart.split(':').map(Number);
            const endH = (h + 1) % 24;
            setDurationEnd(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !durationStart || !durationEnd) return;

        try {
            setError('');
            setIsSubmitting(true);

            // Pass title as excludeLabel when editing
            const { hasConflict, conflictWith } = checkConflict(occupiedSlots, date, durationStart, durationEnd, editSession ? title : undefined);
            if (hasConflict) {
                setError(`Time slot conflicts with "${conflictWith}" in your calendar. Please choose a different date or time.`);
                setIsSubmitting(false);
                return;
            }

            let tGroups: string[] = [];
            let tAgents: string[] = [];

            if (coachingType === 'Individual Coaching') {
                tAgents = selectedAgentIds;
            } else if (coachingType === 'Group Coaching') {
                if (participantMode === 'specific_groups') {
                    tGroups = selectedGroupIds;
                } else {
                    // Auto-select all available groups for trainer/admin
                    tGroups = availableGroups.map(g => g.id);
                }
            } else if (coachingType === 'Peer Circles') {
                if (participantMode === 'specific_agents') {
                    tAgents = selectedAgentIds;
                } else {
                    tAgents = availableAgents.map(a => a.id);
                }
            } else {
                // Seminar types — groups and/or agents
                tGroups = selectedGroupIds;
                tAgents = selectedAgentIds;
            }

            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) throw new Error('Invalid date selected');

            const sessionPayload = {
                coachingType,
                title,
                description,
                date: dateObj.toISOString(),
                durationStart,
                durationEnd,
                venue,
                link: link || undefined,
                createdBy: currentUser?.id,
                createdByName: currentUser?.name,
                createdByRole: currentUser?.role,
                targetGroupIds: tGroups,
                targetAgentIds: tAgents,
            };

            if (editSession) {
                await updateCoachingSession(editSession.id, sessionPayload);
            } else {
                await addCoachingSession({ ...sessionPayload, status: 'upcoming' });
            }
            onClose();
        } catch (err: any) {
            console.error('Failed to create session', err);
            setError(err.message || 'Failed to save session. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Current type info ─────────────────────────────────────────────────────
    const currentTypeInfo = typeOptions.find(t => t.value === coachingType);
    const isSeminar = coachingType === '2 Full Days Seminar' || coachingType === '2 Hours Online Seminar';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{editSession ? 'Edit Coaching / Training Session' : 'Create Coaching / Training Session'}</h2>
                        <p className="text-sm text-gray-500 mt-1">{editSession ? 'Modify the details of this scheduled session.' : 'Schedule a new session for your agents.'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── 1. Session Type ─────────────────────────────────── */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                            Session Type
                        </h3>

                        <div className="grid grid-cols-1 gap-2">
                            {typeOptions.map(opt => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${coachingType === opt.value
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="coachingType"
                                        value={opt.value}
                                        checked={coachingType === opt.value}
                                        onChange={() => handleTypeChange(opt.value)}
                                        className="mt-0.5 accent-indigo-600"
                                    />
                                    <div>
                                        <p className={`text-sm font-semibold ${coachingType === opt.value ? 'text-indigo-700' : 'text-gray-800'}`}>{opt.label}</p>
                                        <p className="text-xs text-gray-500">{opt.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* ── 2. Session Details ──────────────────────────────── */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Session Details
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder={`e.g. ${currentTypeInfo?.label} — March 2026`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                                placeholder="Describe the objectives or agenda of this coaching session..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Start Time *</label>
                                <input type="time" required value={durationStart} onChange={handleStartTimeChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> End Time *</label>
                                <input type="time" required value={durationEnd} onChange={e => setDurationEnd(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Training Mode</label>
                            <select value={venue} onChange={e => setVenue(e.target.value as 'Online' | 'Face to Face')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                                <option value="Online">Online</option>
                                <option value="Face to Face">Face-to-Face</option>
                            </select>
                        </div>

                        {venue === 'Online' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LinkIcon className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input type="url" value={link} onChange={e => setLink(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="https://zoom.us/j/..." />
                                </div>
                            </div>
                        )}

                        {venue === 'Face to Face' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue / Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input type="text" value={link} onChange={e => setLink(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        placeholder="HQ Office, Meeting Room 1 or Google Maps link" />
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-200" />

                    {/* ── 3. Participant Selection ─────────────────────────── */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            Participants
                        </h3>

                        {/* INDIVIDUAL COACHING — select specific agents */}
                        {coachingType === 'Individual Coaching' && (
                            <div>
                                <p className="text-xs text-gray-500 mb-3">Select the agents to invite to this individual coaching session.</p>
                                <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                            </div>
                        )}

                        {/* GROUP COACHING */}
                        {coachingType === 'Group Coaching' && (
                            <div className="space-y-3">
                                {(isAdmin || isMasterTrainer) ? (
                                    <>
                                        <div className="flex gap-2">
                                            <ModeBtn active={participantMode === 'all'} onClick={() => setParticipantMode('all')}>All Groups</ModeBtn>
                                            <ModeBtn active={participantMode === 'specific_groups'} onClick={() => setParticipantMode('specific_groups')}>Specific Groups</ModeBtn>
                                        </div>
                                        {participantMode === 'specific_groups' && (
                                            <GroupChecklist groups={availableGroups} selected={selectedGroupIds} onToggle={toggleGroup} />
                                        )}
                                        {participantMode === 'all' && (
                                            <InfoBanner>All {availableGroups.length} group(s) will be included in this session.</InfoBanner>
                                        )}
                                    </>
                                ) : (
                                    /* Group Trainer: auto-selects all managed groups */
                                    <InfoBanner>This session will be assigned to all agents in your managed group(s): {availableGroups.map(g => g.name).join(', ')}.</InfoBanner>
                                )}
                            </div>
                        )}

                        {/* PEER CIRCLES — Group Leader only */}
                        {coachingType === 'Peer Circles' && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <ModeBtn active={participantMode === 'all'} onClick={() => setParticipantMode('all')}>All My Agents</ModeBtn>
                                    <ModeBtn active={participantMode === 'specific_agents'} onClick={() => setParticipantMode('specific_agents')}>Specific Agents</ModeBtn>
                                </div>
                                {participantMode === 'specific_agents' && (
                                    <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                                )}
                                {participantMode === 'all' && (
                                    <InfoBanner>All {availableAgents.length} agent(s) in your group will be invited.</InfoBanner>
                                )}
                            </div>
                        )}

                        {/* SEMINAR TYPES — pick groups AND/OR individual agents */}
                        {isSeminar && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-500">Select which groups and/or individual agents will attend this seminar.</p>

                                {/* Groups section */}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Groups</p>
                                    <GroupChecklist groups={availableGroups} selected={selectedGroupIds} onToggle={toggleGroup} />
                                </div>

                                {/* Individual agents section */}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Individual Agents (optional)</p>
                                    <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                                </div>

                                {selectedGroupIds.length === 0 && selectedAgentIds.length === 0 && (
                                    <InfoBanner variant="warn">Please select at least one group or agent.</InfoBanner>
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={
                            isSubmitting || !title || !date || !durationStart || !durationEnd ||
                            (isSeminar && selectedGroupIds.length === 0 && selectedAgentIds.length === 0) ||
                            (coachingType === 'Individual Coaching' && selectedAgentIds.length === 0)
                        }
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Check className="w-5 h-5" />}
                        Create Session
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ModeBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
            ? 'bg-purple-100 text-purple-700 border border-purple-200'
            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>
        {children}
    </button>
);

const InfoBanner: React.FC<{ children: React.ReactNode; variant?: 'info' | 'warn' }> = ({ children, variant = 'info' }) => (
    <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${variant === 'warn' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{children}</span>
    </div>
);

const GroupChecklist: React.FC<{ groups: any[]; selected: string[]; onToggle: (id: string) => void }> = ({ groups, selected, onToggle }) => (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
        {groups.length === 0 && <p className="text-sm text-gray-400 col-span-2">No groups available.</p>}
        {groups.map(g => (
            <label key={g.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={selected.includes(g.id)} onChange={() => onToggle(g.id)} />
                <span className="text-sm text-gray-800 font-medium">{g.name}</span>
            </label>
        ))}
    </div>
);

const AgentChecklist: React.FC<{ agents: any[]; selected: string[]; onToggle: (id: string) => void }> = ({ agents, selected, onToggle }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredAgents = agents.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-2">
            <input
                type="text"
                placeholder="Search by agent name or ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white"
            />
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {filteredAgents.length === 0 && <p className="text-sm text-gray-400 col-span-2">No agents found.</p>}
                {filteredAgents.map(a => (
                    <label key={a.id} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                        <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={selected.includes(a.id)} onChange={() => onToggle(a.id)} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm text-gray-900 font-medium truncate">{a.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase">{a.role} • ID: {a.id}</span>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default CreateCoachingModal;
