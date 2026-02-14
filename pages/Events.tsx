
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Event } from '../types';
import { CalendarDays, Plus, MapPin, User, X, Clock, Link as LinkIcon, Edit2, ExternalLink } from 'lucide-react';

const Events: React.FC = () => {
  const { currentUser, groups } = useAuth();
  const { addEvent, deleteEvent, updateEvent, getEventsForUser } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
      eventTitle: '',
      description: '',
      date: '',
      time: '',
      venue: '',
      meetingLink: '',
      groupIds: [] as string[],
      status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled'
  });

  if (!currentUser) return null;

  // Permissions: Admin, Trainer, Group Leader can CREATE/EDIT.
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const canManage = isAdmin ||
                    currentUser.role === UserRole.MASTER_TRAINER ||
                    currentUser.role === UserRole.TRAINER ||
                    currentUser.role === UserRole.GROUP_LEADER;

  const myEvents = getEventsForUser(currentUser);
  
  // Sort by date (Upcoming first)
  const sortedEvents = [...myEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Determine Targetable Groups based on Role
  let targetableGroups = groups; 
  
  if (currentUser.role === UserRole.TRAINER) {
      targetableGroups = groups.filter(g => currentUser.managedGroupIds?.includes(g.id));
  } else if (currentUser.role === UserRole.GROUP_LEADER) {
      targetableGroups = groups.filter(g => g.id === currentUser.groupId);
  } else if (currentUser.role !== UserRole.ADMIN) {
      // Agents cannot target groups (and shouldn't see create button anyway due to canManage)
      targetableGroups = [];
  }
  
  const availableGroups = targetableGroups;

  const handleOpenModal = (event?: Event) => {
      if (event) {
          // Edit Mode
          const d = new Date(event.date);
          let dateStr = '';
          let timeStr = '';
          
          if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
              timeStr = d.toTimeString().slice(0,5);
          } else {
              // Fallback for corrupt data
              const now = new Date();
              dateStr = now.toISOString().split('T')[0];
              timeStr = '09:00';
          }

          setEditingEventId(event.id);
          setFormData({
              eventTitle: event.eventTitle,
              description: event.description,
              date: dateStr,
              time: timeStr,
              venue: event.venue,
              meetingLink: event.meetingLink || '',
              groupIds: event.groupIds,
              status: event.status || 'upcoming'
          });
      } else {
          // Create Mode
          setEditingEventId(null);
          // If Group Leader, auto-select their group for convenience
          const initialGroups = (currentUser.role === UserRole.GROUP_LEADER && currentUser.groupId) 
              ? [currentUser.groupId] 
              : [];
              
          setFormData({
              eventTitle: '',
              description: '',
              date: '',
              time: '',
              venue: '',
              meetingLink: '',
              groupIds: initialGroups,
              status: 'upcoming'
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
     if (!formData.eventTitle || !formData.date || !formData.time || !formData.venue || !formData.description || formData.groupIds.length === 0) {
         alert("Please fill in all required fields (Title, Date, Time, Venue, Description, Groups).");
         return;
     }

     // Safe date construction
     const dateTime = new Date(`${formData.date}T${formData.time}`);
     if (isNaN(dateTime.getTime())) {
         alert("Invalid date or time selected.");
         return;
     }

     const eventData: Partial<Event> = {
         eventTitle: formData.eventTitle,
         description: formData.description,
         venue: formData.venue,
         meetingLink: formData.meetingLink || undefined,
         date: dateTime.toISOString(),
         groupIds: formData.groupIds,
         status: formData.status
     };

     if (editingEventId) {
         await updateEvent(editingEventId, eventData);
     } else {
         await addEvent({
             ...eventData,
             createdBy: currentUser.id,
             createdByName: currentUser.name,
         });
     }

     setIsModalOpen(false);
     setEditingEventId(null);
     setFormData({ eventTitle: '', description: '', date: '', time: '', venue: '', meetingLink: '', groupIds: [], status: 'upcoming' });
  };

  const toggleGroup = (id: string) => {
      setFormData(prev => {
          if (prev.groupIds.includes(id)) {
              return { ...prev, groupIds: prev.groupIds.filter(g => g !== id) };
          }
          return { ...prev, groupIds: [...prev.groupIds, id] };
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
        {canManage && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedEvents.length > 0 ? sortedEvents.map(evt => {
              // Permission Logic:
              // Admin/Trainer/Leader can edit/delete ONLY events they created.
              const isCreator = evt.createdBy === currentUser.id;
              const canEditEvent = isAdmin || isCreator;
              const evtDate = new Date(evt.date);
              
              return (
                  <div key={evt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center mr-4 border border-blue-100">
                                  <span className="text-xs font-bold uppercase">
                                      {!isNaN(evtDate.getTime()) ? evtDate.toLocaleString('default', { month: 'short' }) : 'NA'}
                                  </span>
                                  <span className="text-xl font-bold leading-none">
                                      {!isNaN(evtDate.getTime()) ? evtDate.getDate() : '?'}
                                  </span>
                              </div>
                              <div>
                                  <h3 className="text-lg font-bold text-gray-900">{evt.eventTitle}</h3>
                                  <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {!isNaN(evtDate.getTime()) 
                                        ? evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                        : 'Time not set'}
                                  </div>
                              </div>
                          </div>
                          {canEditEvent && (
                              <div className="flex space-x-1">
                                  <button onClick={() => handleOpenModal(evt)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(evt.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg">
                                      <X className="w-4 h-4" />
                                  </button>
                              </div>
                          )}
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{evt.description}</p>

                      <div className="mt-auto space-y-3 border-t pt-4">
                          <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium">{evt.venue || 'TBD'}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="truncate">Organizer: {evt.createdByName}</span>
                          </div>
                          
                          {/* JOIN BUTTON */}
                          {evt.meetingLink && (
                              <div className="pt-2">
                                  <a
                                    href={evt.meetingLink}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md transition-colors"
                                  >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Join Here
                                  </a>
                              </div>
                          )}

                          <div className="text-xs text-gray-400 font-medium mt-1">
                              Shared with: {(evt.groupNames && evt.groupNames.length > 0)
                                  ? evt.groupNames.join(', ')
                                  : evt.groupIds.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')
                              }
                          </div>
                          {evt.status && evt.status !== 'upcoming' && (
                              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                                  evt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                  {evt.status.charAt(0).toUpperCase() + evt.status.slice(1)}
                              </span>
                          )}
                      </div>
                  </div>
              )
          }) : (
              <div className="col-span-2 p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No upcoming events available.</p>
              </div>
          )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-900">{editingEventId ? 'Edit Event' : 'Create New Event'}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className={labelClass}>Event Title <span className="text-red-500">*</span></label>
                          <input 
                             type="text" 
                             className={inputClass}
                             value={formData.eventTitle}
                             onChange={e => setFormData({...formData, eventTitle: e.target.value})}
                             placeholder="e.g. Weekly Huddle"
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                              <input 
                                 type="date" 
                                 className={inputClass}
                                 value={formData.date}
                                 onChange={e => setFormData({...formData, date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className={labelClass}>Time <span className="text-red-500">*</span></label>
                              <input 
                                 type="time" 
                                 className={inputClass}
                                 value={formData.time}
                                 onChange={e => setFormData({...formData, time: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className={labelClass}>Venue / Location</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                className={`${inputClass} pl-9`}
                                value={formData.venue}
                                onChange={e => setFormData({...formData, venue: e.target.value})}
                                placeholder="Meeting Room A"
                            />
                          </div>
                      </div>

                      <div>
                          <label className={labelClass}>Meeting Link (URL)</label>
                          <div className="relative">
                             <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                             <input 
                                type="url" 
                                className={`${inputClass} pl-9`}
                                value={formData.meetingLink}
                                onChange={e => setFormData({...formData, meetingLink: e.target.value})}
                                placeholder="https://zoom.us/j/..."
                             />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">If provided, a 'Join Here' button will appear for users.</p>
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

                      {editingEventId && (
                          <div>
                              <label className={labelClass}>Status</label>
                              <select
                                  className={inputClass}
                                  value={formData.status}
                                  onChange={e => setFormData({...formData, status: e.target.value as 'upcoming' | 'completed' | 'cancelled'})}
                              >
                                  <option value="upcoming">Upcoming</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                              </select>
                          </div>
                      )}

                      <div>
                          <label className={labelClass}>Share with Group(s) <span className="text-red-500">*</span></label>
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto shadow-inner">
                              {availableGroups.length > 0 ? availableGroups.map(g => (
                                  <label key={g.id} className="flex items-center space-x-2 mb-2 last:mb-0 cursor-pointer">
                                      <input 
                                          type="checkbox"
                                          checked={formData.groupIds.includes(g.id)}
                                          onChange={() => toggleGroup(g.id)}
                                          className="text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-800">{g.name}</span>
                                  </label>
                              )) : (
                                  <p className="text-xs text-gray-400">No groups available to select.</p>
                              )}
                          </div>
                          {currentUser.role === UserRole.GROUP_LEADER && (
                              <p className="text-xs text-gray-400 mt-1">You can only create events for your own group.</p>
                          )}
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                             onClick={handleSave}
                             className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm"
                          >
                             {editingEventId ? 'Update Event' : 'Publish Event'}
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
