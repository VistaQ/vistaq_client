import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, CoachingType, TrainingMode, CoachingSession, CoachingSessionCreateBody, CoachingSessionUpdateBody, Group, User, COACHING_TYPE_LABELS, TRAINING_MODE_LABELS } from '../types';
import { X, Calendar as CalendarIcon, MapPin, Link as LinkIcon, Users, Check, Clock, AlertTriangle, Info } from 'lucide-react';
import { useCalendarConflicts, checkConflict } from '../hooks/useCalendarConflicts';
import { toLocalISO } from '../utils/dateUtils';

interface CreateCoachingModalProps {
    onClose: () => void;
    editSession?: CoachingSession;
    groups: Group[];
    users: User[];
}

// ─── Coaching type options by role ───────────────────────────────────────────
type TypeOption = { value: CoachingType; label: string; description: string };

const MANAGEMENT_TYPES: TypeOption[] = [
    { value: 'individual_coaching', label: COACHING_TYPE_LABELS.individual_coaching, description: 'One-on-one or small group coaching with selected agents.' },
    { value: 'group_coaching', label: COACHING_TYPE_LABELS.group_coaching, description: 'Coaching targeting one or more full groups.' },
    { value: '2_full_days_seminar', label: COACHING_TYPE_LABELS['2_full_days_seminar'], description: 'Two-day training seminar for selected groups or agents.' },
    { value: '2_hours_online_seminar', label: COACHING_TYPE_LABELS['2_hours_online_seminar'], description: 'Short online seminar for selected groups or agents.' },
];

const LEADER_TYPES: TypeOption[] = [
    { value: 'peer_circles', label: COACHING_TYPE_LABELS.peer_circles, description: 'Group leader-led peer session for your agents.' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateCoachingModal: React.FC<CreateCoachingModalProps> = ({ onClose, editSession, groups, users }) => {
    const { currentUser } = useAuth();
    const { addCoachingSession, updateCoachingSession } = useData();
    const { occupiedSlots } = useCalendarConflicts();

    const isGroupLeader = currentUser?.role === UserRole.GROUP_LEADER;
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
    const isTrainer = currentUser?.role === UserRole.TRAINER; // Group Trainer

    // All management roles (Admin, Master Trainer, Trainer, Group Leader) can create any session type.
    // Only Agents cannot create sessions (handled by the parent page not showing the Create button).
    const typeOptions = MANAGEMENT_TYPES;

    // Default to editSession values if available
    const [coachingType, setCoachingType] = useState<CoachingType>(editSession?.coaching_type || typeOptions[0].value);
    const [title, setTitle] = useState(editSession?.title || '');
    const [description, setDescription] = useState(editSession?.description || '');
    const toLocalDate = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const toHHMM = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const [date, setDate] = useState(editSession?.start_date ? toLocalDate(editSession.start_date) : '');
    const [startTime, setStartTime] = useState(editSession?.start_date ? toHHMM(editSession.start_date) : '10:00');
    const [endTime, setEndTime] = useState(editSession?.end_date ? toHHMM(editSession.end_date) : '11:00');
    const [trainingMode, setTrainingMode] = useState<TrainingMode>(editSession?.training_mode || 'online');
    const [link, setLink] = useState(editSession?.link || '');

    // Participant selection defaults based on editSession array lengths
    const determineParticipantMode = (session?: CoachingSession) => {
        if (!session) return 'all';
        if (session.coaching_type === 'individual_coaching') return 'specific_agents';
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
    const [linkError, setLinkError] = useState('');

    const isValidUrl = (value: string): boolean => {
        if (!value) return true; // empty is allowed — link is optional
        try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const validateLink = (value: string) => {
        if (value && !isValidUrl(value)) {
            setLinkError('Please enter a valid URL starting with https:// or http://');
        } else {
            setLinkError('');
        }
    };

    // ── Derived data ─────────────────────────────────────────────────────────
    const availableGroups = React.useMemo(() => {
        if (!currentUser) return [];
        if (isAdmin || isMasterTrainer || isTrainer) return groups;
        if (isGroupLeader) return groups.filter(g => g.id === currentUser.group_id);
        return [];
    }, [currentUser, groups, isAdmin, isMasterTrainer, isTrainer, isGroupLeader]);

    const availableAgents = React.useMemo(() => {
        if (!currentUser) return [];
        const isParticipantRole = (u: User) => u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER;
        if (isAdmin || isMasterTrainer || isTrainer) return users.filter(isParticipantRole);
        if (isGroupLeader) return users.filter(u => isParticipantRole(u) && u.group_id === currentUser.group_id);
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
        if (type === 'individual_coaching') setParticipantMode('specific_agents');
        else if (type === 'peer_circles') setParticipantMode('all');
        else if (type === 'group_coaching') {
            // Admin/Master Trainer can pick groups; Trainer auto-selects all managed groups
            setParticipantMode((isAdmin || isMasterTrainer) ? 'specific_groups' : 'all');
        } else {
            // Seminar types default to group selection
            setParticipantMode('specific_groups');
        }
    }, [isAdmin, isMasterTrainer]);

    // Auto-calculate end time 1 hour after start time
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartTime(newStart);
        if (newStart) {
            const [h, m] = newStart.split(':').map(Number);
            const endH = (h + 1) % 24;
            setEndTime(`${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !startTime || !endTime) return;

        try {
            setError('');
            setIsSubmitting(true);

            // Validate URL before anything else
            if (link && !isValidUrl(link)) {
                setLinkError('Please enter a valid URL starting with https:// or http://');
                setIsSubmitting(false);
                return;
            }

            // Pass title as excludeLabel when editing
            const { hasConflict, conflictWith } = checkConflict(occupiedSlots, date, startTime, endTime, editSession ? title : undefined);
            if (hasConflict) {
                setError(`Time slot conflicts with "${conflictWith}" in your calendar. Please choose a different date or time.`);
                setIsSubmitting(false);
                return;
            }

            let tGroups: string[] = [];
            let tAgents: string[] = [];

            if (coachingType === 'individual_coaching') {
                tAgents = selectedAgentIds;
            } else if (coachingType === 'group_coaching') {
                if (participantMode === 'specific_groups') {
                    tGroups = selectedGroupIds;
                } else {
                    // Auto-select all available groups for trainer/admin
                    tGroups = availableGroups.map(g => g.id);
                }
            } else if (coachingType === 'peer_circles') {
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

            const sessionPayload: CoachingSessionCreateBody = {
                coachingType,
                title,
                description: description || undefined,
                startDate: toLocalISO(date, startTime),
                endDate: toLocalISO(date, endTime),
                trainingMode,
                link: link || undefined,
                groupIds: tGroups,
                agentIds: tAgents,
            };

            if (editSession) {
                const updatePayload: CoachingSessionUpdateBody = {
                    coachingType,
                    title,
                    description: description || undefined,
                    startDate: toLocalISO(date, startTime),
                    endDate: toLocalISO(date, endTime),
                    trainingMode,
                    link: link || undefined,
                    groupIds: tGroups,
                    agentIds: tAgents,
                };
                await updateCoachingSession(editSession.id, updatePayload);
            } else {
                await addCoachingSession(sessionPayload);
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
    const isSeminar = coachingType === '2_full_days_seminar' || coachingType === '2_hours_online_seminar';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={editSession ? 'Edit Coaching Session' : 'Create Coaching Session'}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-600 to-emerald-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">{editSession ? 'Edit Coaching / Training Session' : 'Create Coaching / Training Session'}</h2>
                        <p className="text-sm text-white/70 mt-1">{editSession ? 'Modify the details of this scheduled session.' : 'Schedule a new session for your agents.'}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/20 transition-colors">
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
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Session Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm"
                                placeholder={`e.g. ${currentTypeInfo?.label} — March 2026`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm resize-none"
                                placeholder="Describe the objectives or agenda of this coaching session..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date <span className="text-red-500">*</span></label>
                                <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                                    className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time <span className="text-red-500">*</span></label>
                                <input type="time" required value={startTime} onChange={handleStartTimeChange}
                                    className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time <span className="text-red-500">*</span></label>
                                <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)}
                                    className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Training Mode <span className="text-red-500">*</span></label>
                            <div className="flex gap-3">
                                <button type="button"
                                    onClick={() => { setTrainingMode('online'); setLink(''); setLinkError(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${trainingMode === 'online' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    <LinkIcon className="w-4 h-4" /> {TRAINING_MODE_LABELS.online}
                                </button>
                                <button type="button"
                                    onClick={() => { setTrainingMode('face_to_face'); setLink(''); setLinkError(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${trainingMode === 'face_to_face' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    <MapPin className="w-4 h-4" /> {TRAINING_MODE_LABELS.face_to_face}
                                </button>
                            </div>
                        </div>

                        {trainingMode === 'online' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Meeting URL</label>
                                <div className="relative">
                                    <LinkIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${linkError ? 'text-red-400' : 'text-gray-400'}`} />
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={e => { setLink(e.target.value); setLinkError(''); }}
                                        onBlur={e => validateLink(e.target.value)}
                                        className={`block w-full bg-gray-50 border text-gray-900 rounded-lg shadow-sm focus-visible:ring-2 pl-9 p-2.5 text-sm ${linkError ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200' : 'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-200'}`}
                                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                                    />
                                </div>
                                {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
                            </div>
                        )}

                        {trainingMode === 'face_to_face' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Google Maps or Waze Link</label>
                                <div className="relative">
                                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${linkError ? 'text-red-400' : 'text-gray-400'}`} />
                                    <input
                                        type="url"
                                        value={link}
                                        onChange={e => { setLink(e.target.value); setLinkError(''); }}
                                        onBlur={e => validateLink(e.target.value)}
                                        className={`block w-full bg-gray-50 border text-gray-900 rounded-lg shadow-sm focus-visible:ring-2 pl-9 p-2.5 text-sm ${linkError ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200' : 'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-200'}`}
                                        placeholder="https://maps.google.com/... or https://waze.com/..."
                                    />
                                </div>
                                {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
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
                        {coachingType === 'individual_coaching' && (
                            <div>
                                <p className="text-xs text-gray-500 mb-3">Select the agents to invite to this individual coaching session.</p>
                                <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                            </div>
                        )}

                        {/* GROUP COACHING */}
                        {coachingType === 'group_coaching' && (
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
                        {coachingType === 'peer_circles' && (
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
                            isSubmitting || !title || !date || !startTime || !endTime || !!linkError ||
                            (isSeminar && selectedGroupIds.length === 0 && selectedAgentIds.length === 0) ||
                            (coachingType === 'individual_coaching' && selectedAgentIds.length === 0)
                        }
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Check className="w-5 h-5" />}
                        {editSession ? 'Save Changes' : 'Create Session'}
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
    const term = searchTerm.toLowerCase();
    const filteredAgents = agents.filter(a =>
        a.name?.toLowerCase().includes(term) ||
        a.agent_code?.toLowerCase().includes(term) ||
        a.id?.toLowerCase().includes(term)
    );

    return (
        <div className="space-y-2">
            <input
                type="text"
                placeholder="Search by name or agent code..."
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
                            <span className="text-[10px] text-gray-400">{a.agent_code || a.role}</span>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default CreateCoachingModal;
