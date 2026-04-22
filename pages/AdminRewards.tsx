import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PointConfig, UserRole } from '../types';
import type { components } from '../types.generated';

type PointConfigObject = components['schemas']['PointConfigObject'];
import { Gift, Save, Target, Users, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { DEFAULT_POINT_CONFIG } from '../services/points';
import { apiCall } from '../services/apiClient';

type ProspectActivityKey = 'prospect_created' | 'appointment_set' | 'sales_meeting' | 'sale_closed';
type CoachingActivityKey = 'coaching_individual_attended' | 'coaching_group_attended' | 'coaching_peer_circles_attended' | 'coaching_seminar_attended';
type ActivityKey = ProspectActivityKey | CoachingActivityKey;

const ACTIVITY_TO_FIELD: Record<ActivityKey, keyof PointConfig> = {
  prospect_created: 'prospectBasicInfo',
  appointment_set: 'appointmentCompleted',
  sales_meeting: 'salesMeetingCompleted',
  sale_closed: 'salesSuccessful',
  coaching_individual_attended: 'coachingIndividual',
  coaching_group_attended: 'coachingGroup',
  coaching_peer_circles_attended: 'coachingPeerCircles',
  coaching_seminar_attended: 'coachingSeminar',
};

const FIELD_TO_ACTIVITY: Partial<Record<keyof PointConfig, ActivityKey>> = {
  prospectBasicInfo: 'prospect_created',
  appointmentCompleted: 'appointment_set',
  salesMeetingCompleted: 'sales_meeting',
  salesSuccessful: 'sale_closed',
  coachingIndividual: 'coaching_individual_attended',
  coachingGroup: 'coaching_group_attended',
  coachingPeerCircles: 'coaching_peer_circles_attended',
  coachingSeminar: 'coaching_seminar_attended',
};

// Inner component — all hooks live here so the Rules of Hooks are never violated
// by the outer role-guard returning null before hooks are called.
const AdminRewardsContent: React.FC = () => {
  // Prospect Management — from API
  const [prospectPoints, setProspectPoints] = useState<Pick<PointConfig, 'prospectBasicInfo' | 'appointmentCompleted' | 'salesMeetingCompleted' | 'salesSuccessful'>>({
    prospectBasicInfo: DEFAULT_POINT_CONFIG.prospectBasicInfo,
    appointmentCompleted: DEFAULT_POINT_CONFIG.appointmentCompleted,
    salesMeetingCompleted: DEFAULT_POINT_CONFIG.salesMeetingCompleted,
    salesSuccessful: DEFAULT_POINT_CONFIG.salesSuccessful,
  });
  const [savedProspectPoints, setSavedProspectPoints] = useState({ ...prospectPoints });

  // Personal Development (Coaching) — from API
  const [coachingPoints, setCoachingPoints] = useState<Pick<PointConfig, 'coachingIndividual' | 'coachingGroup' | 'coachingPeerCircles' | 'coachingSeminar'>>({
    coachingIndividual: DEFAULT_POINT_CONFIG.coachingIndividual,
    coachingGroup: DEFAULT_POINT_CONFIG.coachingGroup,
    coachingPeerCircles: DEFAULT_POINT_CONFIG.coachingPeerCircles,
    coachingSeminar: DEFAULT_POINT_CONFIG.coachingSeminar,
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
    coachingPoints.coachingSeminar !== savedCoachingPoints.coachingSeminar;

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
    { key: 'coachingSeminar', label: 'Seminar' },
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
          Defaults — Prospect: info +{DEFAULT_POINT_CONFIG.prospectBasicInfo} · appt +{DEFAULT_POINT_CONFIG.appointmentCompleted} · meeting +{DEFAULT_POINT_CONFIG.salesMeetingCompleted} · sale +{DEFAULT_POINT_CONFIG.salesSuccessful} · Sales: cert +{DEFAULT_POINT_CONFIG.salesIssuanceCertificate} · FYCt +{DEFAULT_POINT_CONFIG.salesFYCt} · ACE +{DEFAULT_POINT_CONFIG.salesACE} · Coaching: +{DEFAULT_POINT_CONFIG.coachingIndividual}/{DEFAULT_POINT_CONFIG.coachingSeminar} pts
        </div>
      </div>

    </div>
  );
};

// Thin role-guard wrapper. Returning null here (before any hooks) is safe because
// AdminRewardsContent owns all of its own hooks unconditionally.
const AdminRewards: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.role !== UserRole.ADMIN) return null;
  return <AdminRewardsContent />;
};

export default AdminRewards;
