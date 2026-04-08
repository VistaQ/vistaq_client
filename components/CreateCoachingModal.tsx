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

// ─── Frontend session type (3 for management, peer circle for group leaders) ──
type FrontendType = 'individual_coaching' | 'group_coaching' | 'seminar';

const FRONTEND_TO_BACKEND: Record<FrontendType, CoachingType> = {
    individual_coaching: 'individual_coaching',
    group_coaching: 'group_coaching',
    seminar: '2_full_days_seminar',
};

const backendToFrontend = (type: CoachingType): FrontendType => {
    if (type === '2_full_days_seminar' || type === '2_hours_online_seminar') return 'seminar';
    if (type === 'peer_circles') return 'individual_coaching';
    return type as FrontendType;
};

const SESSION_TYPE_OPTIONS: { value: FrontendType; label: string; description: string }[] = [
    { value: 'individual_coaching', label: 'Individual Coaching', description: 'One-on-one or small group coaching with selected agents.' },
    { value: 'group_coaching', label: 'Group Coaching', description: 'Coaching targeting one or more full groups.' },
    { value: 'seminar', label: 'Seminar', description: 'Face to face or online seminar for groups or agents.' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const CreateCoachingModal: React.FC<CreateCoachingModalProps> = ({ onClose, editSession, groups, users }) => {
    const { currentUser } = useAuth();
    const { addCoachingSession, updateCoachingSession } = useData();
    const { occupiedSlots } = useCalendarConflicts();

    const isGroupLeader = currentUser?.role === UserRole.GROUP_LEADER;
    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isMasterTrainer = currentUser?.role === UserRole.MASTER_TRAINER;
    const isTrainer = currentUser?.role === UserRole.TRAINER;

    // ── Helpers to parse edit session ─────────────────────────────────────────
    const toLocalDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const toHHMM = (iso: string) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // ── Session type state ────────────────────────────────────────────────────
    const [sessionType, setSessionType] = useState<FrontendType>(
        editSession ? backendToFrontend(editSession.coaching_type) : 'individual_coaching'
    );
    const isSeminar = sessionType === 'seminar';

    // ── Basic fields ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState(editSession?.title || '');
    const [description, setDescription] = useState(editSession?.description || '');
    const [trainingMode, setTrainingMode] = useState<TrainingMode>(editSession?.training_mode || 'online');
    const [link, setLink] = useState(editSession?.link || '');
    const [linkError, setLinkError] = useState('');

    // ── Date / time fields ────────────────────────────────────────────────────
    const [startDate, setStartDate] = useState(editSession?.start_date ? toLocalDate(editSession.start_date) : '');
    const [startTime, setStartTime] = useState(editSession?.start_date ? toHHMM(editSession.start_date) : '09:00');
    const [endTime, setEndTime] = useState(editSession?.end_date ? toHHMM(editSession.end_date) : '10:00');

    // ── Participants ──────────────────────────────────────────────────────────
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(editSession?.targetGroupIds || []);
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(editSession?.targetAgentIds || []);
    // For group coaching: whether to target all available groups or specific ones
    const [groupMode, setGroupMode] = useState<'all' | 'specific'>(
        editSession?.targetGroupIds?.length ? 'specific' : 'all'
    );
    // For group leaders: whether to invite all agents or pick specific ones
    const [peerMode, setPeerMode] = useState<'all' | 'specific'>(
        editSession?.targetAgentIds?.length ? 'specific' : 'all'
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // ── Derived data ──────────────────────────────────────────────────────────
    const availableGroups = React.useMemo(() => {
        if (!currentUser) return [];
        if (isAdmin || isMasterTrainer || isTrainer) return groups;
        if (isGroupLeader) return groups.filter(g => g.id === currentUser.group_id);
        return [];
    }, [currentUser, groups, isAdmin, isMasterTrainer, isTrainer, isGroupLeader]);

    const availableAgents = React.useMemo(() => {
        if (!currentUser) return [];
        const isParticipant = (u: User) => u.role === UserRole.AGENT || u.role === UserRole.GROUP_LEADER;
        if (isAdmin || isMasterTrainer) return users.filter(isParticipant);
        if (isTrainer) {
            const trainerGroupIds = availableGroups.map(g => g.id);
            return users.filter(u => isParticipant(u) && u.group_id && trainerGroupIds.includes(u.group_id));
        }
        if (isGroupLeader) return users.filter(u => isParticipant(u) && u.group_id === currentUser.group_id);
        return [];
    }, [currentUser, users, availableGroups, isAdmin, isMasterTrainer, isTrainer, isGroupLeader]);

    const toggleGroup = (id: string) =>
        setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

    const toggleAgent = (id: string) =>
        setSelectedAgentIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

    // ── URL validation ────────────────────────────────────────────────────────
    const isValidUrl = (value: string): boolean => {
        if (!value) return true;
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

    // ── Session type change ───────────────────────────────────────────────────
    const handleTypeChange = useCallback((type: FrontendType) => {
        setSessionType(type);
        setSelectedGroupIds([]);
        setSelectedAgentIds([]);
        setGroupMode('all');
    }, []);

    // ── Auto end-time on start-time change ───────────────────────────────────
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStartTime(val);
        if (val) {
            const [h, m] = val.split(':').map(Number);
            const endH = (h + 1) % 24;
            setEndTime(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startDate || !startTime || !endTime) return;

        // URL validation
        if (link && !isValidUrl(link)) {
            setLinkError('Please enter a valid URL starting with https:// or http://');
            return;
        }

        try {
            setError('');
            setIsSubmitting(true);

            // Build start/end ISO timestamps
            const startISO = toLocalISO(startDate, startTime);
            const endISO = toLocalISO(startDate, endTime);

            // Conflict check
            const { hasConflict, conflictWith } = checkConflict(
                occupiedSlots, startDate, startTime, endTime,
                editSession ? title : undefined
            );
            if (hasConflict) {
                setError(`Time slot conflicts with "${conflictWith}" in your calendar. Please choose a different date or time.`);
                setIsSubmitting(false);
                return;
            }

            // Build participant arrays
            let tGroups: string[] = [];
            let tAgents: string[] = [];
            const backendType: CoachingType = isGroupLeader
                ? 'peer_circles'
                : FRONTEND_TO_BACKEND[sessionType];

            if (isGroupLeader) {
                // Peer Circle — agent list (all or specific)
                tAgents = peerMode === 'specific' && selectedAgentIds.length
                    ? selectedAgentIds
                    : availableAgents.map(a => a.id);
            } else if (sessionType === 'individual_coaching') {
                tAgents = selectedAgentIds;
            } else if (sessionType === 'group_coaching') {
                if (groupMode === 'all') {
                    tGroups = availableGroups.map(g => g.id);
                } else {
                    tGroups = selectedGroupIds;
                }
            } else {
                // Seminar — groups and/or agents
                tGroups = selectedGroupIds;
                tAgents = selectedAgentIds;
            }

            const payload: CoachingSessionCreateBody = {
                coachingType: backendType,
                title,
                description: description || undefined,
                startDate: startISO,
                endDate: endISO,
                trainingMode,
                link: link || undefined,
                groupIds: tGroups,
                agentIds: tAgents,
            };

            if (editSession) {
                const updatePayload: CoachingSessionUpdateBody = { ...payload };
                await updateCoachingSession(editSession.id, updatePayload);
            } else {
                await addCoachingSession(payload);
            }
            onClose();
        } catch (err: any) {
            console.error('Failed to save session', err);
            setError(err.message || 'Failed to save session. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Validation for submit button ──────────────────────────────────────────
    const participantsValid = isGroupLeader
        ? true // group leaders can submit with no selection (defaults to all)
        : sessionType === 'individual_coaching'
        ? selectedAgentIds.length > 0
        : sessionType === 'group_coaching'
        ? (groupMode === 'all' || selectedGroupIds.length > 0)
        : (selectedGroupIds.length > 0 || selectedAgentIds.length > 0); // seminar

    const isDisabled = isSubmitting || !title || !startDate || !startTime || !endTime
        || !!linkError || !participantsValid;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={editSession ? 'Edit Session' : 'Create Session'}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-600 to-emerald-600">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isGroupLeader
                                ? (editSession ? 'Edit Peer Circle Meeting' : 'Create Peer Circle Meeting')
                                : (editSession ? 'Edit Coaching / Training Session' : 'Create Coaching / Training Session')}
                        </h2>
                        <p className="text-sm text-white/70 mt-1">
                            {editSession ? 'Modify the details of this scheduled session.' : 'Schedule a new session for your agents.'}
                        </p>
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

                    {/* ── 1. Session Type (management only) ──────────────────── */}
                    {!isGroupLeader && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-blue-500" />
                                Session Type
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {SESSION_TYPE_OPTIONS.map(opt => (
                                    <label
                                        key={opt.value}
                                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sessionType === opt.value
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="sessionType"
                                            value={opt.value}
                                            checked={sessionType === opt.value}
                                            onChange={() => handleTypeChange(opt.value)}
                                            className="mt-0.5 accent-indigo-600"
                                        />
                                        <div>
                                            <p className={`text-sm font-semibold ${sessionType === opt.value ? 'text-indigo-700' : 'text-gray-800'}`}>{opt.label}</p>
                                            <p className="text-xs text-gray-500">{opt.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <hr className="border-gray-200" />

                    {/* ── 2. Session Details ──────────────────────────────────── */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Session Details
                        </h3>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Session Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm"
                                placeholder={isGroupLeader ? 'e.g. Monthly Peer Circle — April 2026' : `e.g. ${SESSION_TYPE_OPTIONS.find(o => o.value === sessionType)?.label} — April 2026`}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm resize-none"
                                placeholder="Describe the objectives or agenda of this session..."
                            />
                        </div>

                        {/* Training Mode */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Training Mode <span className="text-red-500">*</span></label>
                            <div className="flex gap-3">
                                <button type="button"
                                    onClick={() => { setTrainingMode('online'); setLink(''); setLinkError(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${trainingMode === 'online' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    <LinkIcon className="w-4 h-4" /> Online
                                </button>
                                <button type="button"
                                    onClick={() => { setTrainingMode('face_to_face'); setLink(''); setLinkError(''); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${trainingMode === 'face_to_face' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                    <MapPin className="w-4 h-4" /> Face to Face
                                </button>
                            </div>
                        </div>

                        {/* Date / Time row — same for all session types */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                Date & Time <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                                        className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                                    <p className="text-[10px] text-gray-400 mt-1 text-center">Date</p>
                                </div>
                                <div>
                                    <input type="time" required value={startTime} onChange={handleStartTimeChange}
                                        className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                                    <p className="text-[10px] text-gray-400 mt-1 text-center">Start Time</p>
                                </div>
                                <div>
                                    <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)}
                                        className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg shadow-sm focus-visible:border-blue-500 focus-visible:ring-blue-500 p-2.5 text-sm" />
                                    <p className="text-[10px] text-gray-400 mt-1 text-center">End Time</p>
                                </div>
                            </div>
                        </div>

                        {/* URL input */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                {trainingMode === 'online' ? 'Meeting URL' : 'Google Maps or Waze Link'}
                            </label>
                            <div className="relative">
                                {trainingMode === 'online'
                                    ? <LinkIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${linkError ? 'text-red-400' : 'text-gray-400'}`} />
                                    : <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${linkError ? 'text-red-400' : 'text-gray-400'}`} />
                                }
                                <input
                                    type="url"
                                    value={link}
                                    onChange={e => { setLink(e.target.value); setLinkError(''); }}
                                    onBlur={e => validateLink(e.target.value)}
                                    placeholder={trainingMode === 'online'
                                        ? 'https://zoom.us/j/... or https://meet.google.com/...'
                                        : 'https://maps.google.com/... or https://waze.com/...'}
                                    className={`block w-full bg-gray-50 border text-gray-900 rounded-lg shadow-sm focus-visible:ring-2 pl-9 p-2.5 text-sm ${linkError ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200' : 'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-200'}`}
                                />
                            </div>
                            {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* ── 3. Participants ─────────────────────────────────────── */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            Participants
                        </h3>
                        <p className="text-xs text-gray-500">Select the groups or agents to invite to this session.</p>

                        {/* GROUP LEADER — Peer Circle (agents only) */}
                        {isGroupLeader && (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <ModeBtn active={peerMode === 'all'} onClick={() => { setPeerMode('all'); setSelectedAgentIds([]); }}>All My Agents</ModeBtn>
                                    <ModeBtn active={peerMode === 'specific'} onClick={() => setPeerMode('specific')}>Specific Agents</ModeBtn>
                                </div>
                                {peerMode === 'all'
                                    ? <InfoBanner>All {availableAgents.length} agent(s) in your group will be invited.</InfoBanner>
                                    : <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                                }
                            </div>
                        )}

                        {/* INDIVIDUAL COACHING */}
                        {!isGroupLeader && sessionType === 'individual_coaching' && (
                            <div>
                                <p className="text-xs text-gray-500 mb-3">Select the agents to invite to this individual coaching session.</p>
                                <AgentChecklist agents={availableAgents} selected={selectedAgentIds} onToggle={toggleAgent} />
                                {selectedAgentIds.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">Please select at least one agent.</p>
                                )}
                            </div>
                        )}

                        {/* GROUP COACHING */}
                        {!isGroupLeader && sessionType === 'group_coaching' && (
                            <div className="space-y-3">
                                {(isAdmin || isMasterTrainer) ? (
                                    <>
                                        <div className="flex gap-2">
                                            <ModeBtn active={groupMode === 'all'} onClick={() => setGroupMode('all')}>All Groups</ModeBtn>
                                            <ModeBtn active={groupMode === 'specific'} onClick={() => setGroupMode('specific')}>Specific Groups</ModeBtn>
                                        </div>
                                        {groupMode === 'specific'
                                            ? <GroupChecklist groups={availableGroups} selected={selectedGroupIds} onToggle={toggleGroup} />
                                            : <InfoBanner>All {availableGroups.length} group(s) will be included in this session.</InfoBanner>
                                        }
                                    </>
                                ) : availableGroups.length === 1 ? (
                                    /* Trainer with one group — auto-selected */
                                    <InfoBanner>This session will be assigned to all agents in <strong>{availableGroups[0].name}</strong>.</InfoBanner>
                                ) : (
                                    /* Trainer with multiple groups — let them pick */
                                    <>
                                        <p className="text-xs text-gray-500">Select which group(s) to target:</p>
                                        <GroupChecklist groups={availableGroups} selected={selectedGroupIds} onToggle={toggleGroup} />
                                        {selectedGroupIds.length === 0 && (
                                            <p className="text-xs text-red-500">Please select at least one group.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* SEMINAR */}
                        {!isGroupLeader && sessionType === 'seminar' && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Groups</p>
                                    <GroupChecklist groups={availableGroups} selected={selectedGroupIds} onToggle={toggleGroup} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Individual Agents <span className="text-gray-400 font-normal normal-case">(optional)</span></p>
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
                        disabled={isDisabled}
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
