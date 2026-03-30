import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { BadgeTier, PointConfig } from '../types';
import { Gift, Plus, Trash2, Save, Award, Target, Users, DollarSign } from 'lucide-react';
import { DEFAULT_POINT_CONFIG } from '../services/points';

const AdminRewards: React.FC = () => {
  const { badgeTiers, updateBadgeTiers, pointConfig, updatePointConfig } = useData();
  const [tiers, setTiers] = useState<BadgeTier[]>(badgeTiers);
  const [points, setPoints] = useState<PointConfig>(pointConfig);
  const [hasTierChanges, setHasTierChanges] = useState(false);
  const [hasPointChanges, setHasPointChanges] = useState(false);

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
    const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
    updateBadgeTiers(sorted);
    setTiers(sorted);
    setHasTierChanges(false);
  };

  const handleUpdatePoint = (key: keyof PointConfig, value: number) => {
    setPoints(prev => ({ ...prev, [key]: value }));
    setHasPointChanges(true);
  };

  const handleSavePoints = () => {
    updatePointConfig(points);
    setHasPointChanges(false);
  };

  const POINT_FIELDS: { key: keyof PointConfig; label: string; category: 'prospect' | 'sales' | 'coaching' }[] = [
    { key: 'prospectBasicInfo', label: 'Add Prospect Basic Info', category: 'prospect' },
    { key: 'appointmentCompleted', label: 'Appointment Completed', category: 'prospect' },
    { key: 'salesMeetingCompleted', label: 'Sales Meeting Completed', category: 'prospect' },
    { key: 'salesSuccessful', label: 'Sale: Successful', category: 'prospect' },
    { key: 'salesIssuanceCertificate', label: 'Issuance Certificate (per cert)', category: 'sales' },
    { key: 'salesFYCt', label: 'FYCt (per RM1,000)', category: 'sales' },
    { key: 'salesACE', label: 'ACE (per RM1,000)', category: 'sales' },
    { key: 'coachingIndividual', label: 'Individual Coaching', category: 'coaching' },
    { key: 'coachingGroup', label: 'Group Coaching', category: 'coaching' },
    { key: 'coachingPeerCircles', label: 'Peer Circles', category: 'coaching' },
    { key: 'coachingFullDays', label: '2 Full Days Seminar', category: 'coaching' },
    { key: 'coachingOnlineSeminar', label: '2 Hours Online Seminar', category: 'coaching' },
  ];

  const prospectFields = POINT_FIELDS.filter(f => f.category === 'prospect');
  const salesFields = POINT_FIELDS.filter(f => f.category === 'sales');
  const coachingFields = POINT_FIELDS.filter(f => f.category === 'coaching');

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
            disabled={!hasPointChanges}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center text-sm shadow-sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Points
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Prospect Activity */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-blue-50 rounded mr-2">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Prospect Management</h4>
            </div>
            <div className="space-y-3">
              {prospectFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-700 flex-1">{label}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={points[key]}
                      onChange={e => handleUpdatePoint(key, Number(e.target.value))}
                      className="w-20 text-center bg-white border border-gray-300 rounded p-1.5 text-sm font-bold"
                    />
                    <span className="text-xs text-gray-500">pts</span>
                  </div>
                </div>
              ))}
            </div>
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
              {salesFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-700 flex-1">{label}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={points[key]}
                      onChange={e => handleUpdatePoint(key, Number(e.target.value))}
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

          {/* Coaching */}
          <div>
            <div className="flex items-center mb-3">
              <div className="p-1.5 bg-purple-50 rounded mr-2">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Personal Development</h4>
            </div>
            <div className="space-y-3">
              {coachingFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <label className="text-sm text-gray-700 flex-1">{label}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={points[key]}
                      onChange={e => handleUpdatePoint(key, Number(e.target.value))}
                      className="w-20 text-center bg-white border border-gray-300 rounded p-1.5 text-sm font-bold"
                    />
                    <span className="text-xs text-gray-500">pts</span>
                  </div>
                </div>
              ))}
            </div>
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
