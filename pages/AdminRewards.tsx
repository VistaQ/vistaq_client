import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { BadgeTier } from '../types';
import { Gift, Plus, Trash2, Save, Award } from 'lucide-react';

const AdminRewards: React.FC = () => {
  const { badgeTiers, updateBadgeTiers } = useData();
  const [tiers, setTiers] = useState<BadgeTier[]>(badgeTiers);
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpdateTier = (id: string, field: keyof BadgeTier, value: any) => {
    setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setHasChanges(true);
  };

  const handleAddTier = () => {
    const newTier: BadgeTier = {
      id: `b_${Date.now()}`,
      name: 'New Tier',
      threshold: 0,
      color: 'text-gray-600',
      bg: 'bg-gray-100'
    };
    setTiers([...tiers, newTier]);
    setHasChanges(true);
  };

  const handleDeleteTier = (id: string) => {
    if (window.confirm('Delete this tier?')) {
        setTiers(prev => prev.filter(t => t.id !== id));
        setHasChanges(true);
    }
  };

  const handleSave = () => {
    // Sort by threshold before saving
    const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
    updateBadgeTiers(sorted);
    setTiers(sorted);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Rewards System Configuration</h1>
           <p className="text-sm text-gray-500">Customize points, badges, and achievement thresholds.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center shadow-sm"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center">
               <Award className="w-5 h-5 mr-2 text-purple-600" />
               Badge Tiers (Milestones)
            </h3>
            <button onClick={handleAddTier} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center">
               <Plus className="w-4 h-4 mr-1" /> Add Tier
            </button>
         </div>

         <div className="p-6 space-y-4">
            {tiers.sort((a, b) => a.threshold - b.threshold).map((tier, index) => (
               <div key={tier.id} className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex-none w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                     {index + 1}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Badge Name</label>
                        <input 
                           type="text" 
                           value={tier.name}
                           onChange={e => handleUpdateTier(tier.id, 'name', e.target.value)}
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded border p-2 text-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Points Threshold</label>
                        <input 
                           type="number" 
                           value={tier.threshold}
                           onChange={e => handleUpdateTier(tier.id, 'threshold', Number(e.target.value))}
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded border p-2 text-sm"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Color Theme</label>
                        <select 
                           value={tier.color}
                           onChange={e => {
                              const color = e.target.value;
                              // Auto set bg based on color for simplicity in this demo
                              let bg = 'bg-gray-100';
                              if (color.includes('blue')) bg = 'bg-blue-100';
                              if (color.includes('amber')) bg = 'bg-amber-100';
                              if (color.includes('yellow')) bg = 'bg-yellow-100';
                              if (color.includes('indigo')) bg = 'bg-indigo-100';
                              
                              handleUpdateTier(tier.id, 'color', color);
                              handleUpdateTier(tier.id, 'bg', bg);
                           }}
                           className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded border p-2 text-sm"
                        >
                           <option value="text-gray-400">Gray (Rookie)</option>
                           <option value="text-blue-500">Blue (Rising)</option>
                           <option value="text-amber-700">Bronze</option>
                           <option value="text-slate-400">Silver</option>
                           <option value="text-yellow-500">Gold</option>
                           <option value="text-indigo-500">Platinum</option>
                        </select>
                     </div>
                  </div>

                  <button 
                     onClick={() => handleDeleteTier(tier.id)}
                     className="text-gray-400 hover:text-red-600 p-2"
                  >
                     <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            ))}
         </div>
         <div className="px-6 py-4 bg-gray-50 border-t text-sm text-gray-500">
            Note: Ensure thresholds are in ascending order for correct progression logic.
         </div>
      </div>
    </div>
  );
};

export default AdminRewards;