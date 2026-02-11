
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, ProspectStage, UserRole, ProspectProduct } from '../types';
import { CheckCircle, Clock, XCircle, ChevronRight, Lock, MessageCircle, DollarSign, Save, Trash2, ShieldCheck, Undo2, Eye, MapPin, AlertTriangle, Calendar, Check, PauseCircle, Plus, MinusCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  prospect: Prospect | Partial<Prospect>;
  onClose: () => void;
}

// Helper to safely format local date for input value (YYYY-MM-DD)
const toLocalDateString = (date: Date): string => {
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ProspectCard: React.FC<Props> = ({ prospect, onClose }) => {
  const { updateProspect, addProspect, deleteProspect } = useData();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Prospect>>(prospect);
  
  // Refs for inputs
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Local state for split inputs
  const todayStr = toLocalDateString(new Date()); 
  const [dateInput, setDateInput] = useState(todayStr);
  const [startTimeInput, setStartTimeInput] = useState('08:00'); 
  const [endTimeInput, setEndTimeInput] = useState('09:00');
  const [phoneSuffix, setPhoneSuffix] = useState('');

  // Local state for "Others" text input in outcome
  const [customFailReason, setCustomFailReason] = useState('');
  const [failReasonSelectValue, setFailReasonSelectValue] = useState('');

  // Multiple Products State
  const [productRows, setProductRows] = useState<ProspectProduct[]>([]);

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<{name?: string, phone?: string, email?: string}>({});

  const STANDARD_REASONS = ['Unable to afford', 'Unable to decide', 'Due to Health / Occupation', 'Needs more time'];

  const PRODUCT_OPTIONS = [
    { label: 'Guaranteed Acceptance Plan', options: ['Takaful Al-Shams', 'Takaful Mumtaz', 'Takaful SureCover'] },
    { label: 'Investment-Linked Plan', options: ['Takaful Single Invest', 'Takaful ProInvest'] },
    { label: 'Ordinary Family Takaful Plan', options: ['Takaful Term80', 'Takaful ProEssential', 'Takaful Family Hero', 'Takaful ProSecure', 'Executive20', 'Takaful ProAspire'] },
    { label: 'Personal Accident & Critical Illness Plan', options: ['PATINA2016', 'CancerCare'] }
  ];

  // Initialize local inputs from prospect data if available
  useEffect(() => {
    if (prospect.appointmentDate) {
      const d = new Date(prospect.appointmentDate);
      if (!isNaN(d.getTime())) {
          setDateInput(toLocalDateString(d));
          setStartTimeInput(d.toTimeString().slice(0, 5));
      }
    } else {
      // Default to today if no date set
      setDateInput(toLocalDateString(new Date()));
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

    // Initialize Products
    if (prospect.products && prospect.products.length > 0) {
        setProductRows(prospect.products);
    } else if (prospect.productType) {
        // Migration/Fallback for single product data
        setProductRows([{
            id: 'legacy_1',
            name: prospect.productType,
            amount: prospect.policyAmountMYR || 0
        }]);
    } else {
        // Default empty row
        setProductRows([{ id: Date.now().toString(), name: '', amount: 0 }]);
    }
  }, [prospect]);

  // --- AUTO SAVE EFFECT FOR DATES ---
  useEffect(() => {
      if (!dateInput || !formData.id) return;
      
      const d = new Date(`${dateInput}T${startTimeInput || '00:00'}`);
      if (isNaN(d.getTime())) return;

      const combinedDate = d.toISOString();
      
      if (combinedDate !== formData.appointmentDate || endTimeInput !== formData.appointmentEndTime) {
          updateProspect(formData.id, {
              appointmentDate: combinedDate,
              appointmentEndTime: endTimeInput
          });
          setFormData(prev => ({...prev, appointmentDate: combinedDate, appointmentEndTime: endTimeInput}));
      }
  }, [dateInput, startTimeInput, endTimeInput]);

  // --- AUTO SAVE EFFECT FOR PRODUCTS ---
  useEffect(() => {
      if (!formData.id) return; // Only sync if prospect created
      
      const totalAmount = productRows.reduce((sum, p) => sum + (p.amount || 0), 0);
      const productSummary = productRows.map(p => p.name).filter(Boolean).join(', ');

      // Check if changes exist to avoid infinite loops or unnecessary writes
      if (totalAmount !== formData.policyAmountMYR || productSummary !== formData.productType) {
          handleSave({
              products: productRows,
              policyAmountMYR: totalAmount,
              productType: productSummary
          });
      }
  }, [productRows]);


  // --- PERMISSION LOGIC ---
  const isNew = !formData.id;
  const isOwner = formData.agentId === currentUser?.id;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const canEdit = isAdmin || isOwner;
  const isReadOnly = !canEdit;

  // --- TIME CONSTRAINTS HELPERS ---
  const isDateToday = dateInput === todayStr;
  const now = new Date();
  // Current HH:MM in 24h format
  const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
        currentStage: ProspectStage.APPOINTMENT,
        // Ensure default product structure
        products: productRows,
        policyAmountMYR: 0,
        productType: ''
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
      // Trigger final product sync to be sure
      const totalAmount = productRows.reduce((sum, p) => sum + (p.amount || 0), 0);
      const productSummary = productRows.map(p => p.name).filter(Boolean).join(', ');

      const updates: Partial<Prospect> = {
          products: productRows,
          policyAmountMYR: totalAmount,
          productType: productSummary,
          phone: `+60${phoneSuffix}`
      };

      if (dateInput && startTimeInput) {
          const d = new Date(`${dateInput}T${startTimeInput}`);
          if (!isNaN(d.getTime())) {
              updates.appointmentDate = d.toISOString();
              updates.appointmentEndTime = endTimeInput;
          }
      }
      
      handleSave(updates);
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
  
  // Step 2 is unlocked if Step 1 is valid
  const isStep2Unlocked = isStep1Complete;

  // Step 3 (Meeting) is unlocked ONLY if Step 2 status is "Completed"
  const isStep3Unlocked = isStep1Complete && formData.appointmentStatus === 'Completed';

  // Step 4 (Outcome) is unlocked ONLY if Step 3 is fully checked (All true)
  const hasCompletedMeeting = formData.meetingChecklist?.rapport && 
                              formData.meetingChecklist?.factFinding && 
                              formData.meetingChecklist?.presentation;
  const isStep4Unlocked = isStep3Unlocked && hasCompletedMeeting;

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
      // Logic: Cannot toggle if Step 3 is locked (Appointment not completed)
      if (isReadOnly || !isStep3Unlocked) return;
      
      const currentList = formData.meetingChecklist || { rapport: false, factFinding: false, presentation: false };
      const updatedList = { ...currentList, [field]: !currentList[field] };
      handleSave({ meetingChecklist: updatedList });
      
      // Update stage if needed
      if (!isNew) {
          // If all are checked, we move to SALES stage logically
          const allChecked = updatedList.rapport && updatedList.factFinding && updatedList.presentation;
          if (allChecked) {
              updateProspect(formData.id!, { currentStage: ProspectStage.SALES });
          }
      }
  };

  const handleOutcomeChange = (outcome: 'SUCCESSFUL' | 'UNSUCCESSFUL' | 'KIV') => {
      if (!isStep4Unlocked) return; 

      const totalAmount = productRows.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Validation for Successful
      if (outcome === 'SUCCESSFUL') {
          if (totalAmount <= 0) {
              alert("Total ACE Amount must be greater than 0 to mark as Successful.");
              return;
          }
          if (productRows.some(p => !p.name)) {
              alert("Please select a product for all entries.");
              return;
          }
      }

      let updates: Partial<Prospect> = { saleStatus: outcome };
      
      if (outcome === 'SUCCESSFUL') {
          updates.currentStage = ProspectStage.POINTS;
          updates.pointsAwarded = totalAmount * 0.1;
          updates.paymentReceived = true; // Button click implies success/payment
      } else if (outcome === 'UNSUCCESSFUL') {
          updates.currentStage = ProspectStage.CLOSED;
          updates.paymentReceived = false;
      } else if (outcome === 'KIV') {
          updates.currentStage = ProspectStage.SALES;
      }
      
      handleSave(updates);
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

  // --- PRODUCT HANDLERS ---
  const handleAddProduct = () => {
      setProductRows(prev => [...prev, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const handleRemoveProduct = (id: string) => {
      if (productRows.length === 1) {
          // Reset if last one
          setProductRows([{ id: Date.now().toString(), name: '', amount: 0 }]);
      } else {
          setProductRows(prev => prev.filter(p => p.id !== id));
      }
  };

  const handleProductChange = (id: string, field: 'name' | 'amount', value: any) => {
      setProductRows(prev => prev.map(p => {
          if (p.id === id) return { ...p, [field]: value };
          return p;
      }));
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
        className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${checked ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!isStep2Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                  <CardHeader 
                    number={2} 
                    title="Appointment Details" 
                    isActive={isStep2Unlocked && formData.appointmentStatus !== 'Completed'} 
                    isDone={formData.appointmentStatus === 'Completed'} 
                  />
                  <div className="p-5 space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                          <div className="relative">
                            <input 
                                ref={dateInputRef}
                                type="date"
                                min={todayStr} // Restrict past dates
                                value={dateInput}
                                onChange={e => setDateInput(e.target.value)}
                                onClick={() => (dateInputRef.current as any)?.showPicker?.()} // Support browser native picker on click
                                className="block w-full pl-10 bg-gray-50 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 text-black rounded-lg p-2.5 text-sm focus:ring-blue-600 focus:border-blue-600 cursor-pointer transition-colors accent-blue-600"
                                disabled={isReadOnly}
                            />
                            {/* Calendar Icon triggers picker */}
                            <Calendar 
                                onClick={() => (dateInputRef.current as any)?.showPicker?.()} 
                                className="absolute left-3 top-2.5 text-blue-600 w-4 h-4 cursor-pointer hover:text-blue-800"
                            />
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                              <input 
                                  type="time"
                                  min={isDateToday ? currentHm : undefined}
                                  value={startTimeInput}
                                  onChange={e => {
                                      const val = e.target.value;
                                      // Strict Time check for "Today"
                                      if (isDateToday && val < currentHm) {
                                          alert("Cannot select a time in the past.");
                                          // Reset to current time
                                          setStartTimeInput(currentHm);
                                          return;
                                      }
                                      setStartTimeInput(val);
                                      // Logic: Start time cannot start after end time. 
                                      if (val > endTimeInput) {
                                          setEndTimeInput(val);
                                      }
                                  }}
                                  className="block w-full bg-gray-50 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 text-black rounded-lg p-2.5 text-sm focus:ring-blue-600 focus:border-blue-600 cursor-pointer transition-colors accent-blue-600"
                                  disabled={isReadOnly}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                              <input 
                                  type="time"
                                  min={startTimeInput}
                                  value={endTimeInput}
                                  onChange={e => {
                                      const val = e.target.value;
                                      if (val < startTimeInput) {
                                          return;
                                      }
                                      setEndTimeInput(val);
                                  }}
                                  className="block w-full bg-gray-50 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 text-black rounded-lg p-2.5 text-sm focus:ring-blue-600 focus:border-blue-600 cursor-pointer transition-colors accent-blue-600"
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
                          <p className="text-xs text-gray-400 mt-1">Set to <strong>Completed</strong> to unlock Sales Meeting.</p>
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
              <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!isStep3Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
                  <CardHeader 
                    number={3} 
                    title="Sales Meeting" 
                    isActive={isStep3Unlocked && !isStep4Unlocked} 
                    isDone={isStep4Unlocked} 
                  />
                  <div className="p-5 space-y-3">
                      <p className="text-xs text-gray-500 mb-2">Check all steps to proceed to Sales Outcome.</p>
                      
                      {[
                          { key: 'rapport', label: 'Social' },
                          { key: 'factFinding', label: 'Fact Find' },
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
                  
                  {/* Product List Header */}
                  <div className="flex justify-between items-end">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Products Proposed</label>
                      {!isReadOnly && !isOutcomeDecided && (
                          <button 
                            onClick={handleAddProduct}
                            className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                          >
                              <Plus className="w-3 h-3 mr-1" /> ADD PRODUCT
                          </button>
                      )}
                  </div>

                  {/* Multiple Products Rows */}
                  <div className="space-y-3">
                      {productRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="col-span-7">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product {index + 1}</label>
                                  <select 
                                    value={row.name || ''}
                                    onChange={e => handleProductChange(row.id, 'name', e.target.value)}
                                    className="block w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isReadOnly || isOutcomeDecided}
                                  >
                                    <option value="">Select Product...</option>
                                    {PRODUCT_OPTIONS.map(grp => (
                                        <optgroup key={grp.label} label={grp.label}>
                                            {grp.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </optgroup>
                                    ))}
                                  </select>
                              </div>
                              <div className="col-span-4">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ACE Amount (MYR)</label>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">RM</span>
                                    <input 
                                      type="number"
                                      value={row.amount || ''}
                                      onChange={e => handleProductChange(row.id, 'amount', Number(e.target.value))}
                                      className="block w-full pl-8 bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="0"
                                      disabled={isReadOnly || isOutcomeDecided}
                                    />
                                  </div>
                              </div>
                              <div className="col-span-1 flex justify-center pb-2">
                                  {!isReadOnly && !isOutcomeDecided && productRows.length > 1 && (
                                      <button 
                                        onClick={() => handleRemoveProduct(row.id)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                      >
                                          <MinusCircle className="w-5 h-5" />
                                      </button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Total Summary */}
                  <div className="flex justify-end items-center pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500 mr-4 font-medium">Total ACE Amount:</span>
                      <span className="text-xl font-bold text-gray-900">RM {productRows.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</span>
                  </div>

                  {/* Outcome Logic */}
                  {!isOutcomeDecided && (
                    <div className="space-y-3 pt-4 border-t">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Outcome Selection</label>
                        <div className="flex gap-3">
                             <button onClick={() => handleOutcomeChange('KIV')} disabled={isReadOnly} className="flex-1 py-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 font-bold text-sm shadow-sm transition-transform active:scale-95">
                                 KIV
                             </button>
                             <button 
                                onClick={() => handleOutcomeChange('SUCCESSFUL')} 
                                disabled={isReadOnly} 
                                className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center"
                            >
                                 <CheckCircle className="w-4 h-4 mr-2" /> Successful
                             </button>
                             <button onClick={() => handleOutcomeChange('UNSUCCESSFUL')} disabled={isReadOnly} className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-sm shadow-sm transition-transform active:scale-95">
                                 Non-Successful
                             </button>
                        </div>
                    </div>
                  )}

                  {/* Fail Reason Logic - REFACTORED */}
                  {formData.saleStatus === 'UNSUCCESSFUL' && (
                     <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                        {/* Styled to match the look of the 'First Payment' box somewhat, but as a form block */}
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
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
                                className="block w-full border-red-300 text-gray-900 bg-white rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
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
                                    className="block w-full border-red-300 text-gray-900 bg-white rounded-lg p-2.5 text-sm focus:ring-red-500 focus:border-red-500 shadow-sm"
                                    disabled={isReadOnly}
                                />
                            )}
                        </div>
                        
                        {!isReadOnly && (
                            <div className="flex justify-end">
                                <button onClick={handleUndo} className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
                                    <Undo2 className="w-4 h-4 mr-1" /> Undo / Change Status
                                </button>
                            </div>
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
                              Complete & Close
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
