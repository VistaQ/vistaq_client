
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { CalendarDays, Plus, MapPin, User, X, Clock } from 'lucide-react';

const Events: React.FC = () => {
  const { currentUser, groups } = useAuth();
  const { addEvent, deleteEvent, getEventsForUser } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      date: '',
      time: '',
      venue: '',
      targetGroupIds: [] as string[]
  });

  if (!currentUser) return null;

  // Permissions: Only Trainers and Group Leaders can create events
  const canCreate = currentUser.role === UserRole.TRAINER || currentUser.role === UserRole.GROUP_LEADER || currentUser.role === UserRole.ADMIN;

  const myEvents = getEventsForUser(currentUser);
  
  // Sort by date (Upcoming first)
  const sortedEvents = [...myEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group Options for Creator
  const targetableGroups = currentUser.role === UserRole.TRAINER 
     ? groups.filter(g => currentUser.managedGroupIds?.includes(g.id))
     : (currentUser.role === UserRole.GROUP_LEADER ? groups.filter(g => g.id === currentUser.groupId) : []);
  
  // Also Admin sees all
  const availableGroups = currentUser.role === UserRole.ADMIN ? groups : targetableGroups;

  const handleCreate = async () => {
     if (!formData.title || !formData.date || !formData.time || formData.targetGroupIds.length === 0) {
         alert("Please fill in all required fields.");
         return;
     }

     const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString();

     await addEvent({
         title: formData.title,
         description: formData.description,
         venue: formData.venue,
         date: dateTime,
         createdBy: currentUser.id,
         createdByName: currentUser.name,
         targetGroupIds: formData.targetGroupIds
     });

     setIsModalOpen(false);
     setFormData({ title: '', description: '', date: '', time: '', venue: '', targetGroupIds: [] });
  };

  const toggleGroup = (id: string) => {
      setFormData(prev => {
          if (prev.targetGroupIds.includes(id)) {
              return { ...prev, targetGroupIds: prev.targetGroupIds.filter(g => g !== id) };
          }
          return { ...prev, targetGroupIds: [...prev.targetGroupIds, id] };
      });
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("Delete this event?")) {
          await deleteEvent(id);
      }
  };

  // Standard input class matching ProspectCard.tsx
  const inputClass = "block w-full bg-gray-50 border-gray-300 text-gray-900 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 text-sm";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Events & Announcements</h1>
           <p className="text-sm text-gray-500">Upcoming training sessions, huddles, and group meetings.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedEvents.length > 0 ? sortedEvents.map(evt => {
              const isCreator = evt.createdBy === currentUser.id;
              const evtDate = new Date(evt.date);
              
              return (
                  <div key={evt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center mr-4 border border-blue-100">
                                  <span className="text-xs font-bold uppercase">{evtDate.toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-xl font-bold leading-none">{evtDate.getDate()}</span>
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-gray-900">{evt.title}</h3>
                                  <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                              </div>
                          </div>
                          {isCreator && (
                              <button onClick={() => handleDelete(evt.id)} className="text-gray-400 hover:text-red-500">
                                  <X className="w-4 h-4" />
                              </button>
                          )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{evt.description}</p>

                      <div className="mt-auto space-y-2 border-t pt-4">
                          <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              {evt.venue || 'TBD'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="truncate">Organizer: {evt.createdByName}</span>
                          </div>
                          {canCreate && (
                              <div className="text-xs text-blue-600 font-medium mt-2">
                                  Shared with: {evt.targetGroupIds.map(id => groups.find(g => g.id === id)?.name).join(', ')}
                              </div>
                          )}
                      </div>
                  </div>
              )
          }) : (
              <div className="col-span-2 p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No upcoming events.</p>
              </div>
          )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">Create New Event</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className={labelClass}>Event Title</label>
                          <input 
                             type="text" 
                             className={inputClass}
                             value={formData.title}
                             onChange={e => setFormData({...formData, title: e.target.value})}
                             placeholder="e.g. Weekly Huddle"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>Date</label>
                              <input 
                                 type="date" 
                                 className={inputClass}
                                 value={formData.date}
                                 onChange={e => setFormData({...formData, date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className={labelClass}>Time</label>
                              <input 
                                 type="time" 
                                 className={inputClass}
                                 value={formData.time}
                                 onChange={e => setFormData({...formData, time: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className={labelClass}>Venue / Link</label>
                          <input 
                             type="text" 
                             className={inputClass}
                             value={formData.venue}
                             onChange={e => setFormData({...formData, venue: e.target.value})}
                             placeholder="Meeting Room A or Zoom Link"
                          />
                      </div>

                      <div>
                          <label className={labelClass}>Description</label>
                          <textarea 
                             className={inputClass}
                             rows={3}
                             value={formData.description}
                             onChange={e => setFormData({...formData, description: e.target.value})}
                             placeholder="Agenda or details..."
                          />
                      </div>

                      <div>
                          <label className={labelClass}>Share with Group(s)</label>
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto shadow-inner">
                              {availableGroups.length > 0 ? availableGroups.map(g => (
                                  <label key={g.id} className="flex items-center space-x-2 mb-2 last:mb-0 cursor-pointer">
                                      <input 
                                          type="checkbox"
                                          checked={formData.targetGroupIds.includes(g.id)}
                                          onChange={() => toggleGroup(g.id)}
                                          className="text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-800">{g.name}</span>
                                  </label>
                              )) : (
                                  <p className="text-xs text-gray-400">No groups available.</p>
                              )}
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                             onClick={handleCreate}
                             className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm"
                          >
                             Publish Event
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Events;
