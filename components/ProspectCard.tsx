
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, ProspectStage, UserRole } from '../types';
import { CheckCircle, Clock, XCircle, ChevronRight, Lock, MessageCircle, DollarSign, Save, Trash2, ShieldCheck, Undo2, Eye, MapPin, AlertTriangle, Calendar, Check, PauseCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  prospect: Prospect | Partial<Prospect>;
  onClose: () => void;
}

const ProspectCard: React.FC<Props> = ({ prospect, onClose }) => {
  const { updateProspect, addProspect, deleteProspect } = useData();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Prospect>>(prospect);
  
  // Local state for split inputs
  const [dateInput, setDateInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('08:00'); 
  const [endTimeInput, setEndTimeInput] = useState('17:00');
  const [phoneSuffix, setPhoneSuffix] = useState('');

  // Local state for "Others" text input in outcome
  const [customFailReason, setCustomFailReason] = useState('');
  const [failReasonSelectValue, setFailReasonSelectValue] = useState('');

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<{name?: string, phone?: string, email?: string}>({});

  const STANDARD_REASONS = ['Unable to afford', 'Unable to decide', 'Due to Health / Occupation', 'Needs more time'];

  // Initialize local inputs from prospect data if available
  useEffect(() => {
    if (prospect.appointmentDate) {
      const d = new Date(prospect.appointmentDate);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      setDateInput(dateStr);
      setStartTimeInput(d.toTimeString().slice(0, 5));
    }
    if (prospect.appointmentEndTime) {
      setEndTimeInput(prospect.appointmentEndTime);
    }
    if (prospect.phone) {
      const clean = prospect.phone.replace(/^\+60|^60/, '');
      setPhoneSuffix(clean);
    }
    if (!prospect.appointmentStatus) {
        setFormData(prev => ({ ...prev, appointmentStatus: 'Not done' }));
    }
    
    // Initialize Non-Successful Reason Logic
    if (prospect.saleReason) {
        if (STANDARD_REASONS.includes(prospect.saleReason)) {
            setFailReasonSelectValue(prospect.saleReason);
        } else {
            setFailReasonSelectValue('Others');
            setCustomFailReason(prospect.saleReason);
        }
    } else {
        setFailReasonSelectValue('');
    }
  }, [prospect]);

  // --- AUTO SAVE EFFECT FOR DATES ---
  useEffect(() => {
      if (!dateInput || !formData.id) return;
      
      const combinedDate = new Date(`${dateInput}T${startTimeInput || '00:00'}`).toISOString();
      
      if (combinedDate !== formData.appointmentDate || endTimeInput !== formData.appointmentEndTime) {
          updateProspect(formData.id, {
              appointmentDate: combinedDate,
              appointmentEndTime: endTimeInput
          });
          setFormData(prev => ({...prev, appointmentDate: combinedDate, appointmentEndTime: endTimeInput}));
      }
  }, [dateInput, startTimeInput, endTimeInput]);


  // --- PERMISSION LOGIC ---
  const isNew = !formData.id;
  const isOwner = formData.agentId === currentUser?.id;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const canEdit = isAdmin || isOwner;
  const isReadOnly = !canEdit;

  // --- SAVE LOGIC ---
  const handleSave = (updates: Partial<Prospect>) => {
    if (isReadOnly) return;
    setFormData(prev => {
        const newData = { ...prev, ...updates };
        if (!isNew && prev.id) {
             updateProspect(prev.id, updates);
        }
        return newData;
    });
  };

  const handleCreate = async () => {
    if (isReadOnly) return;
    if (validateStep1()) {
      const fullPhone = `+60${phoneSuffix}`;
      const newProspect = await addProspect({
        ...formData,
        phone: fullPhone,
        currentStage: ProspectStage.APPOINTMENT
      });
      setFormData(newProspect);
    }
  };

  const handleDelete = async () => {
    if (isReadOnly) return;
    if (isNew || !formData.id) return;
    await deleteProspect(formData.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSaveAndClose = () => {
      if (isReadOnly) {
          onClose();
          return;
      }
      if (dateInput && startTimeInput) {
          const combined = new Date(`${dateInput}T${startTimeInput}`).toISOString();
          handleSave({ 
              appointmentDate: combined,
              appointmentEndTime: endTimeInput,
              phone: `+60${phoneSuffix}`
          });
      } else {
           handleSave({ phone: `+60${phoneSuffix}` });
      }
      onClose();
  };

  // --- VALIDATION HELPERS ---
  const validateStep1 = (): boolean => {
      const newErrors: any = {};
      if (!formData.name) newErrors.name = "Name is required";
      else if (/\d/.test(formData.name)) newErrors.name = "Name cannot contain numbers";

      if (!phoneSuffix) newErrors.phone = "Phone is required";
      else if (/\D/.test(phoneSuffix)) newErrors.phone = "Only numbers allowed";

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Invalid email format";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  // --- WORKFLOW STATE HELPERS ---
  const isStep1Complete = !!formData.id && !!formData.name && !!formData.phone && Object.keys(errors).length === 0;
  const areSteps2And3Unlocked = isStep1Complete;
  const hasStartedMeeting = formData.meetingChecklist?.rapport || formData.meetingChecklist?.factFinding || formData.meetingChecklist?.presentation;
  const isStep4Unlocked = isStep1Complete && hasStartedMeeting;
  const isOutcomeDecided = formData.saleStatus === 'SUCCESSFUL' || formData.saleStatus === 'UNSUCCESSFUL' || formData.saleStatus === 'KIV';

  // --- ACTIONS ---

  const sendWhatsAppInvite = () => {
    if (!phoneSuffix) return;
    const dateStr = dateInput ? `${dateInput} at ${startTimeInput}` : 'our upcoming meeting';
    const text = `Hi ${formData.name}, confirming our appointment for ${dateStr}. Location: ${formData.location || 'TBD'}. Looking forward to discussing your financial goals!`;
    const url = `https://wa.me/60${phoneSuffix}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const toggleChecklist = (field: keyof NonNullable<Prospect['meetingChecklist']>) => {
      if (isReadOnly || !areSteps2And3Unlocked) return;
      const currentList = formData.meetingChecklist || { rapport: false, factFinding: false, presentation: false };
      const updatedList = { ...currentList, [field]: !currentList[field] };
      handleSave({ meetingChecklist: updatedList });
      
      if (!isNew) updateProspect(formData.id!, { currentStage: ProspectStage.SALES });
  };

  const handleOutcomeChange = (outcome: 'SUCCESSFUL' | 'UNSUCCESSFUL' | 'KIV') => {
      let updates: Partial<Prospect> = { saleStatus: outcome };
      
      if (outcome === 'SUCCESSFUL') {
          updates.currentStage = ProspectStage.POINTS;
          updates.pointsAwarded = (formData.policyAmountMYR || 0) * 0.1;
          updates.paymentReceived = true;
      } else if (outcome === 'UNSUCCESSFUL') {
          updates.currentStage = ProspectStage.CLOSED;
          updates.paymentReceived = false;
      } else if (outcome === 'KIV') {
          updates.currentStage = ProspectStage.SALES;
      }
      
      handleSave(updates);
  };

  const handlePaymentCheck = (checked: boolean) => {
      if (checked) {
          if (formData.policyAmountMYR && formData.policyAmountMYR > 0 && formData.productType) {
              handleOutcomeChange('SUCCESSFUL');
          } else {
              alert("Please select a Product and enter Amount before confirming payment.");
          }
      } else {
          handleSave({ paymentReceived: false });
          if (formData.saleStatus === 'SUCCESSFUL') {
               handleSave({ saleStatus: undefined, currentStage: ProspectStage.SALES });
          }
      }
  };

  const handleUndo = () => {
      handleSave({ 
          saleStatus: undefined, 
          saleReason: '', 
          currentStage: ProspectStage.SALES,
          paymentReceived: false 
      });
      setFailReasonSelectValue('');
      setCustomFailReason('');
  };

  // --- RENDERERS ---

  const CardHeader = ({ number, title, isActive, isDone }: {number: number, title: string, isActive: boolean, isDone: boolean}) => (
      <div className={`flex items-center p-4 border-b transition-colors ${isActive ? 'bg-blue-50 border-blue-200' : isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 opacity-70'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
              {isDone ? <CheckCircle className="w-5 h-5"/> : number}
          </div>
          <h3 className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>{title}</h3>
          {!isActive && !isDone && <Lock className="w-4 h-4 ml-auto text-gray-400" />}
      </div>
  );

  const CustomCheckbox = ({ checked, onChange, label, disabled }: any) => (
      <div 
        onClick={() => !disabled && onChange()} 
        className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${checked ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}
      >
          <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${checked ? 'bg-gray-100 border-green-500' : 'bg-gray-100 border-gray-300'}`}>
              {checked && <Check className="w-3.5 h-3.5 text-green-600 stroke-[3]" />}
          </div>
          <span className={`font-medium text-sm ${checked ? 'text-blue-900' : 'text-gray-700'}`}>
              {label}
          </span>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col h-[90vh] animate-in fade-in zoom-in duration-200 relative">
        
        {showDeleteConfirm && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
                <div className="bg-white p-8 rounded-xl max-w-sm w-full text-center shadow-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Prospect?</h3>
                    <p className="text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">{formData.name}</span>? This action cannot be undone.</p>
                    <div className="flex space-x-3">
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                        >
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
               <h2 className="text-xl font-bold text-gray-800">{isNew ? 'New Prospect' : `Client Status : ${formData.name}`}</h2>
               {isReadOnly && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 flex items-center"><Eye className="w-3 h-3 mr-1"/> View Only</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
          
          {/* STEP 1: Basic Information */}
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <CardHeader number={1} title="Basic Information" isActive={!isStep1Complete} isDone={isStep1Complete} />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => {
                        const val = e.target.value;
                        if (!/\d/.test(val)) handleSave({ name: val });
                    }}
                    onBlur={validateStep1}
                    className={`block w-full bg-gray-50 border text-gray-900 rounded-lg p-2.5 text-sm ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Enter full name"
                    disabled={isReadOnly}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md font-bold">
                          +60
                      </span>
                      <input 
                        type="tel" 
                        value={phoneSuffix} 
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setPhoneSuffix(val);
                        }}
                        onBlur={validateStep1}
                        className={`rounded-none rounded-r-lg bg-gray-50 border text-gray-900 block flex-1 min-w-0 w-full text-sm p-2.5 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder="123456789"
                        disabled={isReadOnly}
                      />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={e => handleSave({ email: e.target.value })}
                        onBlur={validateStep1}
                        className={`block w-full bg-gray-50 border text-gray-900 rounded-lg p-2.5 text-sm ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder="client@email.com"
                        disabled={isReadOnly}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>

              {isNew && !isReadOnly && (
                <div className="flex justify-end pt-2 mt-4 border-t">
                    <button 
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                    >
                    Confirm & Start Workflow
                    </button>
                </div>
              )}
            </div>
          </div>

          {/* PARALLEL SECTION: Step 2 & 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* STEP 2: Appointment */}
              <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!areSteps2And3Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                  <CardHeader 
                    number={2} 
                    title="Appointment Details" 
                    isActive={areSteps2And3Unlocked && formData.appointmentStatus !== 'Completed'} 
                    isDone={formData.appointmentStatus === 'Completed'} 
                  />
                  <div className="p-5 space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                          <div className="relative">
                            <input 
                                type="date"
                                value={dateInput}
                                onChange={e => setDateInput(e.target.value)}
                                className="block w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                disabled={isReadOnly}
                            />
                            <Calendar className="absolute left-3 top-2.5 text-gray-400 w-4 h-4 pointer-events-none"/>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                              <input 
                                  type="time"
                                  value={startTimeInput}
                                  onChange={e => setStartTimeInput(e.target.value)}
                                  className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                  disabled={isReadOnly}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                              <input 
                                  type="time"
                                  value={endTimeInput}
                                  onChange={e => setEndTimeInput(e.target.value)}
                                  className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                  disabled={isReadOnly}
                              />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                          <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
                              <input 
                                  type="text"
                                  value={formData.location || ''}
                                  onChange={e => handleSave({ location: e.target.value })}
                                  placeholder="e.g. Starbucks KLCC"
                                  className="block w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                  disabled={isReadOnly}
                              />
                          </div>
                       </div>

                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                          <select 
                              value={formData.appointmentStatus || 'Not done'}
                              onChange={e => handleSave({ appointmentStatus: e.target.value as any })}
                              className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                              disabled={isReadOnly}
                          >
                              <option value="Not done">Not done (Default)</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="Rescheduled">Rescheduled</option>
                              <option value="Completed">Completed</option>
                              <option value="KIV">KIV</option>
                              <option value="Declined">Declined</option>
                          </select>
                       </div>

                       <button
                          onClick={sendWhatsAppInvite}
                          className="w-full mt-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors text-sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Send WhatsApp Invite
                        </button>
                  </div>
              </div>

              {/* STEP 3: Sales Meeting */}
              <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!areSteps2And3Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                  <CardHeader 
                    number={3} 
                    title="Sales Meeting" 
                    isActive={areSteps2And3Unlocked && !isStep4Unlocked} 
                    isDone={isStep4Unlocked} 
                  />
                  <div className="p-5 space-y-3">
                      <p className="text-xs text-gray-500 mb-2">Select steps completed to proceed to outcome.</p>
                      
                      {[
                          { key: 'rapport', label: 'Social / Rapport' },
                          { key: 'factFinding', label: 'Fact Find / Needs' },
                          { key: 'presentation', label: 'Presentation' }
                      ].map((item) => (
                          <CustomCheckbox 
                             key={item.key}
                             checked={!!formData.meetingChecklist?.[item.key as keyof typeof formData.meetingChecklist]}
                             onChange={() => toggleChecklist(item.key as any)}
                             label={item.label}
                             disabled={isReadOnly}
                          />
                      ))}
                  </div>
              </div>
          </div>

          {/* STEP 4: Sales Outcome */}
          <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!isStep4Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
              <CardHeader 
                number={4} 
                title="Sales Outcome" 
                isActive={isStep4Unlocked && !isOutcomeDecided} 
                isDone={isOutcomeDecided} 
              />
              <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product</label>
                          <select 
                            value={formData.productType || ''}
                            onChange={e => handleSave({ productType: e.target.value })}
                            className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            disabled={isReadOnly || isOutcomeDecided}
                          >
                            <option value="">Select Product...</option>
                            <optgroup label="Guaranteed Acceptance Plan">
                                <option value="Takaful Al-Shams">Takaful Al-Shams</option>
                                <option value="Takaful Mumtaz">Takaful Mumtaz</option>
                                <option value="Takaful SureCover">Takaful SureCover</option>
                            </optgroup>
                            <optgroup label="Investment-Linked Plan">
                                <option value="Takaful Single Invest">Takaful Single Invest</option>
                                <option value="Takaful ProInvest">Takaful ProInvest</option>
                            </optgroup>
                            <optgroup label="Ordinary Family Takaful Plan">
                                <option value="Takaful Term80">Takaful Term80</option>
                                <option value="Takaful ProEssential">Takaful ProEssential</option>
                                <option value="Takaful Family Hero">Takaful Family Hero</option>
                                <option value="Takaful ProSecure">Takaful ProSecure</option>
                                <option value="Executive20">Executive20</option>
                                <option value="Takaful ProAspire">Takaful ProAspire</option>
                            </optgroup>
                            <optgroup label="Personal Accident & Critical Illness Plan">
                                <option value="PATINA2016">PATINA2016</option>
                                <option value="CancerCare">CancerCare</option>
                            </optgroup>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (MYR)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">RM</span>
                            <input 
                              type="number"
                              value={formData.policyAmountMYR || ''}
                              onChange={e => handleSave({ policyAmountMYR: Number(e.target.value) })}
                              className="block w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                              placeholder="5000"
                              disabled={isReadOnly || isOutcomeDecided}
                            />
                          </div>
                      </div>
                  </div>

                  {/* Payment Checkbox - Hides when outcome is KIV or UNSUCCESSFUL */}
                  {formData.saleStatus !== 'KIV' && formData.saleStatus !== 'UNSUCCESSFUL' && (
                      <div className="p-1">
                          <CustomCheckbox 
                              checked={formData.paymentReceived || false}
                              onChange={() => handlePaymentCheck(!formData.paymentReceived)}
                              label="First Payment Completed (Marks as Successful)"
                              disabled={isReadOnly || isOutcomeDecided}
                          />
                      </div>
                  )}

                  {/* Outcome Logic */}
                  {!isOutcomeDecided && (
                    <div className="space-y-3 pt-4 border-t">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Manual Outcome Selection</label>
                        <div className="flex gap-3">
                             <button onClick={() => handleOutcomeChange('KIV')} disabled={isReadOnly} className="flex-1 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded hover:bg-yellow-100 font-medium text-sm">KIV</button>
                             <button onClick={() => handleOutcomeChange('UNSUCCESSFUL')} disabled={isReadOnly} className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 font-medium text-sm">Non-Successful</button>
                        </div>
                    </div>
                  )}

                  {/* Fail Reason Logic */}
                  {formData.saleStatus === 'UNSUCCESSFUL' && (
                     <div className="animate-in fade-in slide-in-from-top-2 space-y-3 bg-red-50 p-4 rounded-lg border border-red-100">
                        <label className="block text-xs font-bold text-red-700 uppercase">Reason for Non-Successful</label>
                        <select 
                           value={failReasonSelectValue}
                           onChange={e => {
                               const val = e.target.value;
                               setFailReasonSelectValue(val);
                               if (val === 'Others') {
                                   setCustomFailReason('');
                                   handleSave({ saleReason: '' }); 
                               } else {
                                   handleSave({ saleReason: val });
                               }
                           }}
                           disabled={isReadOnly}
                           className="block w-full border-gray-300 text-gray-900 bg-white rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
                        >
                            <option value="">Select Reason...</option>
                            {STANDARD_REASONS.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                            <option value="Others">Others (Please state)</option>
                        </select>
                        
                        {/* Custom Reason Input */}
                        {failReasonSelectValue === 'Others' && (
                             <input 
                                type="text"
                                value={customFailReason}
                                onChange={e => {
                                    setCustomFailReason(e.target.value);
                                    handleSave({ saleReason: e.target.value });
                                }}
                                placeholder="Please state reason..."
                                className="block w-full border-gray-300 text-gray-900 bg-white rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
                                disabled={isReadOnly}
                             />
                        )}
                        
                        {!isReadOnly && (
                            <button onClick={handleUndo} className="flex items-center text-sm text-red-600 hover:text-red-800 font-medium mt-2">
                                <Undo2 className="w-4 h-4 mr-1" /> Undo / Change Status
                            </button>
                        )}
                     </div>
                  )}

                  {/* KIV Undo Button */}
                  {formData.saleStatus === 'KIV' && !isReadOnly && (
                       <div className="flex justify-end">
                           <button onClick={handleUndo} className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
                                <Undo2 className="w-4 h-4 mr-1" /> Change Status
                            </button>
                       </div>
                  )}

                  {/* Successful Undo */}
                  {formData.saleStatus === 'SUCCESSFUL' && !isReadOnly && (
                       <div className="flex justify-end">
                           <button onClick={handleUndo} className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
                                <Undo2 className="w-4 h-4 mr-1" /> Undo (Edit Sales Data)
                            </button>
                       </div>
                  )}

              </div>
          </div>

          {/* STEP 5: Result Screen */}
          {isOutcomeDecided && (
              <div className="animate-in fade-in zoom-in duration-300 pb-6">
                  {formData.saleStatus === 'SUCCESSFUL' && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-8 text-center shadow-lg">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
                              <DollarSign className="w-10 h-10 text-green-600" />
                          </div>
                          <h2 className="text-3xl font-extrabold text-green-800 mb-2">Congratulations!</h2>
                          <p className="text-green-700 mb-6 font-medium">You have successfully secured a sale of <br/><span className="text-2xl font-bold">RM {formData.policyAmountMYR?.toLocaleString()}</span></p>
                          <button onClick={onClose} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-green-700 transition-transform active:scale-95">
                              Complete
                          </button>
                      </div>
                  )}
                  
                  {formData.saleStatus === 'UNSUCCESSFUL' && (
                      <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-8 text-center shadow-lg">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                              <XCircle className="w-10 h-10 text-red-500" />
                          </div>
                          <h2 className="text-2xl font-bold text-red-800 mb-2">Non-Successful</h2>
                          <p className="text-red-600 italic mb-6">"Every 'No' brings you one step closer to a 'Yes'. Keep pushing forward!"</p>
                          <button onClick={onClose} className="bg-white text-red-600 border border-red-200 px-8 py-3 rounded-full font-bold shadow-sm hover:bg-red-50 transition-colors">
                              Close & Move On
                          </button>
                      </div>
                  )}

                  {formData.saleStatus === 'KIV' && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 rounded-xl p-8 text-center shadow-lg">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                              <PauseCircle className="w-10 h-10 text-amber-500" />
                          </div>
                          <h2 className="text-2xl font-bold text-amber-800 mb-2">Kept In View</h2>
                          <p className="text-amber-700 italic mb-6">"Patience is key. Schedule a follow-up or check in later to close this sale."</p>
                          <button onClick={onClose} className="bg-amber-500 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-amber-600 transition-transform active:scale-95">
                              Save & Reminder Set
                          </button>
                      </div>
                  )}
              </div>
          )}

        </div>

        {/* Persistent Footer */}
        <div className="p-4 border-t bg-white flex justify-between items-center rounded-b-xl z-10">
           {!isNew && !isReadOnly ? (
               <button onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center font-medium transition-colors">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Prospect
               </button>
           ) : (
               <div></div> // Spacer
           )}
           
           <button onClick={handleSaveAndClose} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium flex items-center transition-colors shadow-md border border-transparent">
               <Save className="w-4 h-4 mr-2" /> {isReadOnly ? 'Close' : 'Save & Close'}
           </button>
       </div>

      </div>
    </div>
  );
};

export default ProspectCard;
