import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BadgeTier, PointConfig, UserRole } from '../types';
import type { components } from '../types.generated';

type PointConfigObject = components['schemas']['PointConfigObject'];
import { Gift, Plus, Trash2, Save, Award, Target, Users, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { DEFAULT_POINT_CONFIG } from '../services/points';
import { apiCall } from '../services/apiClient';

type ProspectActivityKey = 'prospect_created' | 'appointment_set' | 'sales_meeting' | 'sale_closed';
type CoachingActivityKey = 'coaching_individual_attended' | 'coaching_group_attended' | 'coaching_peer_circles_attended' | 'coaching_2_full_days_attended' | 'coaching_2_hours_online_attended';
type ActivityKey = ProspectActivityKey | CoachingActivityKey;

const ACTIVITY_TO_FIELD: Record<ActivityKey, keyof PointConfig> = {
  prospect_created: 'prospectBasicInfo',
  appointment_set: 'appointmentCompleted',
  sales_meeting: 'salesMeetingCompleted',
  sale_closed: 'salesSuccessful',
  coaching_individual_attended: 'coachingIndividual',
  coaching_group_attended: 'coachingGroup',
  coaching_peer_circles_attended: 'coachingPeerCircles',
  coaching_2_full_days_attended: 'coachingFullDays',
  coaching_2_hours_online_attended: 'coachingOnlineSeminar',
};

const FIELD_TO_ACTIVITY: Partial<Record<keyof PointConfig, ActivityKey>> = {
  prospectBasicInfo: 'prospect_created',
  appointmentCompleted: 'appointment_set',
  salesMeetingCompleted: 'sales_meeting',
  salesSuccessful: 'sale_closed',
  coachingIndividual: 'coaching_individual_attended',
  coachingGroup: 'coaching_group_attended',
  coachingPeerCircles: 'coaching_peer_circles_attended',
  coachingFullDays: 'coaching_2_full_days_attended',
  coachingOnlineSeminar: 'coaching_2_hours_online_attended',
};

const AdminRewards: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== UserRole.ADMIN) return null;

  const { badgeTiers, updateBadgeTiers } = useData();
  const [tiers, setTiers] = useState<BadgeTier[]>(badgeTiers);
  const [hasTierChanges, setHasTierChanges] = useState(false);

  // Prospect Management — from API
  const [prospectPoints, setProspectPoints] = useState<Pick<PointConfig, 'prospectBasicInfo' | 'appointmentCompleted' | 'salesMeetingCompleted' | 'salesSuccessful'>>({
    prospectBasicInfo: DEFAULT_POINT_CONFIG.prospectBasicInfo,
    appointmentCompleted: DEFAULT_POINT_CONFIG.appointmentCompleted,
    salesMeetingCompleted: DEFAULT_POINT_CONFIG.salesMeetingCompleted,
    salesSuccessful: DEFAULT_POINT_CONFIG.salesSuccessful,
  });
  const [savedProspectPoints, setSavedProspectPoints] = useState({ ...prospectPoints });

  // Personal Development (Coaching) — from API
  const [coachingPoints, setCoachingPoints] = useState<Pick<PointConfig, 'coachingIndividual' | 'coachingGroup' | 'coachingPeerCircles' | 'coachingFullDays' | 'coachingOnlineSeminar'>>({
    coachingIndividual: DEFAULT_POINT_CONFIG.coachingIndividual,
    coachingGroup: DEFAULT_POINT_CONFIG.coachingGroup,
    coachingPeerCircles: DEFAULT_POINT_CONFIG.coachingPeerCircles,
    coachingFullDays: DEFAULT_POINT_CONFIG.coachingFullDays,
    coachingOnlineSeminar: DEFAULT_POINT_CONFIG.coachingOnlineSeminar,
  });
  const [savedCoachingPoints, setSavedCoachingPoints] = useState({ ...coachingPoints });

  const [prospectLoading, setProspectLoading] = useState(true);
  const [prospectError, setProspectError] = useState<string | null>(null);
  const [isSavingPoints, setIsSavingPoints] = useState(false);

  // Sales — local defaults only (not yet in DB)
  const [otherPoints, setOtherPoints] = useState<Pick<PointConfig, 'salesIssuanceCertificate' | 'salesFYCt' | 'salesACE'>>({
    salesIssuanceCertificate: DEFAULT_POINT_CONFIG.salesIssuanceCertificate,
    salesFYCt: DEFAULT_POINT_CONFIG.salesFYCt,
    salesACE: DEFAULT_POINT_CONFIG.salesACE,
  });

  const fetchPointConfigs = () => {
    setProspectLoading(true);
    setProspectError(null);
    apiCall<{ success: boolean; data: PointConfigObject[] }>('/point-configs')
      .then(res => {
        if (!res.success) { setProspectError('Failed to load point configs.'); return; }
        const mappedProspect = { ...prospectPoints };
        const mappedCoaching = { ...coachingPoints };
        for (const item of res.data) {
          const field = ACTIVITY_TO_FIELD[item.activity as ActivityKey];
          if (!field) continue;
          if (field in mappedProspect) (mappedProspect as Record<string, number>)[field] = item.points;
          if (field in mappedCoaching) (mappedCoaching as Record<string, number>)[field] = item.points;
        }
        setProspectPoints(mappedProspect);
        setSavedProspectPoints(mappedProspect);
        setCoachingPoints(mappedCoaching);
        setSavedCoachingPoints(mappedCoaching);
      })
      .catch(err => setProspectError(err.message || 'Failed to load point configs.'))
      .finally(() => setProspectLoading(false));
  };

  useEffect(() => { fetchPointConfigs(); }, []);

  const hasProspectChanges =
    prospectPoints.prospectBasicInfo !== savedProspectPoints.prospectBasicInfo ||
    prospectPoints.appointmentCompleted !== savedProspectPoints.appointmentCompleted ||
    prospectPoints.salesMeetingCompleted !== savedProspectPoints.salesMeetingCompleted ||
    prospectPoints.salesSuccessful !== savedProspectPoints.salesSuccessful;

  const hasCoachingChanges =
    coachingPoints.coachingIndividual !== savedCoachingPoints.coachingIndividual ||
    coachingPoints.coachingGroup !== savedCoachingPoints.coachingGroup ||
    coachingPoints.coachingPeerCircles !== savedCoachingPoints.coachingPeerCircles ||
    coachingPoints.coachingFullDays !== savedCoachingPoints.coachingFullDays ||
    coachingPoints.coachingOnlineSeminar !== savedCoachingPoints.coachingOnlineSeminar;

  const handleUpdateProspectPoint = (key: keyof typeof prospectPoints, value: number) => {
    setProspectPoints(prev => ({ ...prev, [key]: value }));
  };

  const handleUpdateCoachingPoint = (key: keyof typeof coachingPoints, value: number) => {
    setCoachingPoints(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePoints = async () => {
    setIsSavingPoints(true);
    try {
      const prospectKeys = Object.keys(prospectPoints) as (keyof typeof prospectPoints)[];
      const coachingKeys = Object.keys(coachingPoints) as (keyof typeof coachingPoints)[];
      const allChanges = [
        ...prospectKeys
          .filter(key => prospectPoints[key] !== savedProspectPoints[key])
          .map(key => ({ field: key as keyof PointConfig, points: prospectPoints[key] })),
        ...coachingKeys
          .filter(key => coachingPoints[key] !== savedCoachingPoints[key])
          .map(key => ({ field: key as keyof PointConfig, points: coachingPoints[key] })),
      ];
      await Promise.all(
        allChanges.map(({ field, points }) => {
          const activity = FIELD_TO_ACTIVITY[field]!;
          return apiCall(`/point-configs/${activity}`, { method: 'PUT', data: { points } });
        })
      );
      setSavedProspectPoints({ ...prospectPoints });
      setSavedCoachingPoints({ ...coachingPoints });
    } catch {
      setProspectError('Failed to save some point values. Please try again.');
    } finally {
      setIsSavingPoints(false);
    }
  };

  const handleUpdateTier = (id: string, field: keyof BadgeTier, value: string | number) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setHasTierChanges(true);
  };

  const handleAddTier = () => {
    const newTier: BadgeTier = {
      id: `b_${Date.now()}`,
      name: 'New Tier',
      level: tiers.length + 1,
      threshold: 0,
      color: 'text-gray-600',
      bg: 'bg-gray-100'
    };
    setTiers([...tiers, newTier]);
    setHasTierChanges(true);
  };

  const handleDeleteTier = (id: string) => {
    if (window.confirm('Delete this tier?')) {
      setTiers(prev => prev.filter(t => t.id !== id));
      setHasTierChanges(true);
    }
  };

  const handleSaveTiers = () => {
    const thresholds = tiers.map(t => t.threshold);
    const hasDuplicates = thresholds.length !== new Set(thresholds).size;
    if (hasDuplicates) {
      alert('Each badge tier must have a unique points threshold. Please fix duplicate values before saving.');
      return;
    }
    const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
    updateBadgeTiers(sorted);
    setTiers(sorted);
    setHasTierChanges(false);
  };

  const PROSPECT_FIELDS: { key: keyof typeof prospectPoints; label: string }[] = [
    { key: 'prospectBasicInfo', label: 'Add Prospect Basic Info' },
    { key: 'appointmentCompleted', label: 'Appointment Completed' },
    { key: 'salesMeetingCompleted', label: 'Sales Meeting Completed' },
    { key: 'salesSuccessful', label: 'Sale: Successful' },
  ];

  const SALES_FIELDS: { key: keyof typeof otherPoints; label: string }[] = [
    { key: 'salesIssuanceCertificate', label: 'Issuance Certificate (per cert)' },
    { key: 'salesFYCt', label: 'FYCt (per RM1,000)' },
    { key: 'salesACE', label: 'ACE (per RM1,000)' },
  ];

  const COACHING_FIELDS: { key: keyof typeof coachingPoints; label: string }[] = [
    { key: 'coachingIndividual', label: 'Individual Coaching' },
    { key: 'coachingGroup', label: 'Group Coaching' },
    { key: 'coachingPeerCircles', label: 'Peer Circles' },
    { key: 'coachingFullDays', label: '2 Full Days Seminar' },
    { key: 'coachingOnlineSeminar', label: '2 Hours Online Seminar' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards System Configuration</h1>
          <p className="text-sm text-gray-500">Customize points, badges, and achievement thresholds.</p>
        </div>
      </div>

      {/* Point Values Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-blue-600" />
            Point Values per Action
          </h3>
          <button
            onClick={handleSavePoints}
            disabled={(!hasProspectChanges && !hasCoachingChanges) || isSavingPoints || prospectLoading}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-sm shadow-sm"
          >
            {isSavingPoints ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Points
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Prospect Management */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-blue-50 rounded mr-2">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Prospect Management</h4>
            </div>
            {prospectLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : prospectError ? (
              <div className="flex flex-col items-center py-6 text-sm text-red-600">
                <AlertCircle className="w-5 h-5 mb-2" />
                <p className="text-center">{prospectError}</p>
                <button onClick={fetchPointConfigs} className="mt-2 text-blue-600 font-medium hover:underline text-xs">Retry</button>
              </div>
            ) : (
              <div className="space-y-3">
                {PROSPECT_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-700 flex-1">{label}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={prospectPoints[key]}
                        onChange={e => handleUpdateProspectPoint(key, Number(e.target.value))}
                        className="w-20 text-center bg-white border border-gray-300 rounded p-1.5 text-sm font-bold"
                      />
                      <span className="text-xs text-gray-500">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales Completion */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-green-50 rounded mr-2">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Sales Completion</h4>
            </div>
            <div className="space-y-3">
              {SALES_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-700 flex-1">{label}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={otherPoints[key]}
                      onChange={e => setOtherPoints(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-20 text-center bg-white border border-gray-300 rounded p-1.5 text-sm font-bold"
                    />
                    <span className="text-xs text-gray-500">pts</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded p-2">
                ⚙️ Backend integration coming soon — values saved for future use.
              </p>
            </div>
          </div>

          {/* Personal Development */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-purple-50 rounded mr-2">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Personal Development</h4>
            </div>
            {prospectLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              </div>
            ) : prospectError ? (
              <div className="flex flex-col items-center py-6 text-sm text-red-600">
                <AlertCircle className="w-5 h-5 mb-2" />
                <p className="text-center">{prospectError}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {COACHING_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <label className="text-sm text-gray-700 flex-1">{label}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={coachingPoints[key]}
                        onChange={e => handleUpdateCoachingPoint(key, Number(e.target.value))}
                        className="w-20 text-center bg-white border border-gray-300 rounded p-1.5 text-sm font-bold"
                      />
                      <span className="text-xs text-gray-500">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-500">
          Defaults — Prospect: info +{DEFAULT_POINT_CONFIG.prospectBasicInfo} · appt +{DEFAULT_POINT_CONFIG.appointmentCompleted} · meeting +{DEFAULT_POINT_CONFIG.salesMeetingCompleted} · sale +{DEFAULT_POINT_CONFIG.salesSuccessful} · Sales: cert +{DEFAULT_POINT_CONFIG.salesIssuanceCertificate} · FYCt +{DEFAULT_POINT_CONFIG.salesFYCt} · ACE +{DEFAULT_POINT_CONFIG.salesACE} · Coaching: +{DEFAULT_POINT_CONFIG.coachingIndividual}/{DEFAULT_POINT_CONFIG.coachingFullDays} pts
        </div>
      </div>

      {/* Badge Tiers Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center">
            <Award className="w-5 h-5 mr-2 text-purple-600" />
            Badge Tiers (Milestones)
          </h3>
          <div className="flex items-center space-x-3">
            <button onClick={handleAddTier} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Add Tier
            </button>
            <button
              onClick={handleSaveTiers}
              disabled={!hasTierChanges}
              className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-sm shadow-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Save Tiers
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {tiers.sort((a, b) => a.threshold - b.threshold).map((tier, index) => (
            <div key={tier.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex-none w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 mt-1">
                {index + 1}
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Badge Name</label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={e => handleUpdateTier(tier.id, 'name', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Level</label>
                  <input
                    type="number"
                    min={1}
                    value={tier.level ?? index + 1}
                    onChange={e => handleUpdateTier(tier.id, 'level', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Points Threshold</label>
                  <input
                    type="number"
                    value={tier.threshold}
                    onChange={e => handleUpdateTier(tier.id, 'threshold', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Color Theme</label>
                  <select
                    value={tier.color}
                    onChange={e => {
                      const color = e.target.value;
                      let bg = 'bg-gray-100';
                      if (color.includes('blue')) bg = 'bg-blue-100';
                      if (color.includes('amber')) bg = 'bg-amber-100';
                      if (color.includes('yellow') && color !== 'text-yellow-600') bg = 'bg-yellow-100';
                      if (color.includes('indigo')) bg = 'bg-indigo-100';
                      if (color.includes('slate')) bg = 'bg-slate-100';
                      if (color.includes('purple')) bg = 'bg-purple-100';
                      if (color === 'text-yellow-600') bg = 'bg-gray-900';
                      handleUpdateTier(tier.id, 'color', color);
                      handleUpdateTier(tier.id, 'bg', bg);
                    }}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded p-2 text-sm"
                  >
                    <option value="text-gray-500">Gray (Foundation)</option>
                    <option value="text-blue-500">Blue (Momentum)</option>
                    <option value="text-amber-700">Bronze</option>
                    <option value="text-slate-400">Silver</option>
                    <option value="text-yellow-500">Gold</option>
                    <option value="text-indigo-400">Platinum</option>
                    <option value="text-purple-600">Purple (Pinnacle)</option>
                    <option value="text-yellow-600">Black & Gold (Achiever)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lottie Animation URL</label>
                  <input
                    type="url"
                    placeholder="https://assets.lottiefiles.com/..."
                    value={tier.lottieUrl || ''}
                    onChange={e => handleUpdateTier(tier.id, 'lottieUrl', e.target.value || undefined)}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded p-2 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={() => handleDeleteTier(tier.id)}
                className="text-gray-400 hover:text-red-600 p-2 mt-1"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-500">
          Lottie URLs: paste a JSON animation URL from <span className="font-medium text-blue-600">lottiefiles.com</span>. Leave blank to use the default icon. Thresholds must be in ascending order.
        </div>
      </div>
    </div>
  );
};

export default AdminRewards;
