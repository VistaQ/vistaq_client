
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, ProspectStage, UserRole, ProspectProduct } from '../types';
import { CheckCircle, Clock, XCircle, ChevronRight, Lock, MessageCircle, DollarSign, Save, Trash2, ShieldCheck, Undo2, Eye, MapPin, AlertTriangle, Calendar, Check, PauseCircle, Plus, MinusCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  prospect: Prospect | Partial<Prospect>;
  onClose: () => void;
}

const toLocalDateString = (date: Date): string => {
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalISOString = (date: Date): string => {
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const ProspectCard: React.FC<Props> = ({ prospect, onClose }) => {
  const { updateProspect, addProspect, deleteProspect } = useData();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<Prospect>>(prospect);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const todayStr = toLocalDateString(new Date());
  const [dateInput, setDateInput] = useState(todayStr);
  const [startTimeInput, setStartTimeInput] = useState('08:00');
  const [endTimeInput, setEndTimeInput] = useState('09:00');
  const [phoneSuffix, setPhoneSuffix] = useState('');

  const [customFailReason, setCustomFailReason] = useState('');
  const [failReasonSelectValue, setFailReasonSelectValue] = useState('');

  const [productRows, setProductRows] = useState<ProspectProduct[]>([]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [errors, setErrors] = useState<{prospectName?: string, prospectPhone?: string, prospectEmail?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STANDARD_REASONS = ['Unable to afford', 'Unable to decide', 'Due to Health / Occupation', 'Needs more time'];

  const PRODUCT_OPTIONS = [
    { label: 'Guaranteed Acceptance Plan', options: ['Takaful Al-Shams', 'Takaful Mumtaz', 'Takaful SureCover'] },
    { label: 'Investment-Linked Plan', options: ['Takaful Single Invest', 'Takaful ProInvest'] },
    { label: 'Ordinary Family Takaful Plan', options: ['Takaful Term80', 'Takaful ProEssential', 'Takaful Family Hero', 'Takaful ProSecure', 'Executive20', 'Takaful ProAspire'] },
    { label: 'Personal Accident & Critical Illness Plan', options: ['PATINA2016', 'CancerCare'] },
    { label: 'Other Plans', options: ['Medical Card', 'Term Plan'] }
  ];

  useEffect(() => {
    if (prospect.appointmentDate) {
      const d = new Date(prospect.appointmentDate);
      if (!isNaN(d.getTime())) {
        setDateInput(toLocalDateString(d));
      }
    } else {
      setDateInput(toLocalDateString(new Date()));
    }

    if (prospect.appointmentStartTime) {
      setStartTimeInput(prospect.appointmentStartTime);
    }

    if (prospect.appointmentEndTime) {
      setEndTimeInput(prospect.appointmentEndTime);
    }

    if (prospect.prospectPhone) {
      const clean = prospect.prospectPhone.replace(/^\+60|^60/, '');
      setPhoneSuffix(clean);
    }

    if (!prospect.appointmentStatus) {
      setFormData(prev => ({ ...prev, appointmentStatus: 'not_done' }));
    }

    if (prospect.unsuccessfulReason) {
      if (STANDARD_REASONS.includes(prospect.unsuccessfulReason)) {
        setFailReasonSelectValue(prospect.unsuccessfulReason);
      } else {
        setFailReasonSelectValue('Others');
        setCustomFailReason(prospect.unsuccessfulReason);
      }
    } else {
      setFailReasonSelectValue('');
    }

    if (prospect.productsSold && prospect.productsSold.length > 0) {
      setProductRows(prospect.productsSold);
    } else {
      setProductRows([{ id: Date.now().toString(), productName: '', aceAmount: 0 }]);
    }
  }, [prospect]);

  // Sync date inputs into formData (no API call — saved on Save & Close)
  useEffect(() => {
    if (!dateInput) return;
    const d = new Date(`${dateInput}T${startTimeInput || '00:00'}`);
    if (isNaN(d.getTime())) return;
    const combinedDate = toLocalISOString(d);
    setFormData(prev => ({ ...prev, appointmentDate: combinedDate, appointmentStartTime: startTimeInput, appointmentEndTime: endTimeInput }));
  }, [dateInput, startTimeInput, endTimeInput]);

  // Permission logic
  const isNew = !formData.id;
  const isOwner = isNew || formData.uid === currentUser?.id;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const canEdit = isAdmin || isOwner;
  const isReadOnly = !canEdit;

  // Time helpers
  const isDateToday = dateInput === todayStr;
  const now = new Date();
  const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Update local state only — API is called on Save & Close
  const handleSave = (updates: Partial<Prospect>) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCreate = async () => {
    if (isReadOnly || isSubmitting) return;
    if (validateStep1()) {
      setIsSubmitting(true);
      try {
        const fullPhone = `+60${phoneSuffix}`;
        const newProspect = await addProspect({
          ...formData,
          prospectPhone: fullPhone,
          currentStage: ProspectStage.PROSPECT,
          productsSold: productRows,
        });
        setFormData(newProspect);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (isReadOnly) return;
    if (isNew || !formData.id) return;
    await deleteProspect(formData.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    if (isReadOnly) {
      onClose();
      return;
    }

    if (!isNew && formData.id) {
      // Derive currentStage from state
      let currentStage = 'appointment';
      if (formData.salesOutcome) {
        currentStage = 'sales_outcome';
      }

      const payload: Record<string, any> = {
        prospectName: formData.prospectName,
        prospectEmail: formData.prospectEmail || '',
        prospectPhone: `+60${phoneSuffix}`,
        appointmentStatus: formData.appointmentStatus || 'not_done',
        appointmentLocation: formData.appointmentLocation || '',
        appointmentStartTime: startTimeInput,
        appointmentEndTime: endTimeInput,
        currentStage,
        salesOutcome: formData.salesOutcome || null,
        unsuccessfulReason: formData.unsuccessfulReason || '',
        salesPartsCompleted: formData.salesPartsCompleted || [],
        productsSold: productRows.map(({ id: _id, ...rest }) => rest),
      };

      if (dateInput && startTimeInput) {
        const d = new Date(`${dateInput}T${startTimeInput}`);
        if (!isNaN(d.getTime())) {
          payload.appointmentDate = toLocalISOString(d);
        }
      }

      await updateProspect(formData.id, payload);
    }

    onClose();
  };

  // Validation
  const validateStep1 = (): boolean => {
    const newErrors: any = {};
    if (!formData.prospectName) newErrors.prospectName = "Name is required";
    else if (/\d/.test(formData.prospectName)) newErrors.prospectName = "Name cannot contain numbers";

    if (!phoneSuffix) newErrors.prospectPhone = "Phone is required";
    else if (/\D/.test(phoneSuffix)) newErrors.prospectPhone = "Only numbers allowed";

    if (formData.prospectEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.prospectEmail)) {
      newErrors.prospectEmail = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Workflow state
  const isStep1Complete = !!formData.id && !!formData.prospectName && !!formData.prospectPhone && Object.keys(errors).length === 0;
  const isStep2Unlocked = isStep1Complete;
  const isStep3Unlocked = isStep1Complete && formData.appointmentStatus === 'completed';
  const MEETING_PARTS = ['social', 'fact_find', 'presentation'] as const;
  const meetingParts: string[] = Array.isArray(formData.salesPartsCompleted) ? formData.salesPartsCompleted : [];
  const allMeetingDone = MEETING_PARTS.every(p => meetingParts.includes(p));
  const isStep4Unlocked = isStep3Unlocked && allMeetingDone;
  const isOutcomeDecided = !!formData.salesOutcome;

  const sendWhatsAppInvite = () => {
    if (!phoneSuffix) return;
    const dateStr = dateInput ? `${dateInput} at ${startTimeInput}` : 'our upcoming meeting';
    const text = `Hi ${formData.prospectName}, confirming our appointment for ${dateStr}. Location: ${formData.appointmentLocation || 'TBD'}. Looking forward to discussing your financial goals!`;
    const url = `https://wa.me/60${phoneSuffix}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOutcomeChange = (outcome: 'successful' | 'unsuccessful' | 'kiv') => {
    if (!isStep4Unlocked) return;

    const totalAmount = productRows.reduce((sum, p) => sum + (p.aceAmount || 0), 0);

    if (outcome === 'successful') {
      if (totalAmount <= 0) {
        alert("Total ACE Amount must be greater than 0 to mark as Successful.");
        return;
      }
      if (productRows.some(p => !p.productName)) {
        alert("Please select a product for all entries.");
        return;
      }
    }

    const updates: Partial<Prospect> = {
      salesOutcome: outcome,
      currentStage: ProspectStage.SALES_OUTCOME,
      productsSold: productRows,
    };

    handleSave(updates);
  };

  const handleUndo = () => {
    handleSave({
      salesOutcome: undefined,
      unsuccessfulReason: '',
      currentStage: ProspectStage.APPOINTMENT,
    });
    setFailReasonSelectValue('');
    setCustomFailReason('');
  };

  const handleAddProduct = () => {
    setProductRows(prev => [...prev, { id: Date.now().toString(), productName: '', aceAmount: 0 }]);
  };

  const handleRemoveProduct = (id: string) => {
    if (productRows.length === 1) {
      setProductRows([{ id: Date.now().toString(), productName: '', aceAmount: 0 }]);
    } else {
      setProductRows(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleProductChange = (id: string, field: 'productName' | 'aceAmount', value: any) => {
    setProductRows(prev => prev.map(p => {
      if (p.id === id) return { ...p, [field]: value };
      return p;
    }));
  };

  const CardHeader = ({ number, title, isActive, isDone }: { number: number, title: string, isActive: boolean, isDone: boolean }) => (
    <div className={`flex items-center p-4 border-b transition-colors ${isActive ? 'bg-blue-50 border-blue-200' : isDone ? 'bg-green-50 border-green-200' : 'bg-gray-50 opacity-70'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors ${isActive ? 'bg-blue-600 text-white' : isDone ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
        {isDone ? <CheckCircle className="w-5 h-5" /> : number}
      </div>
      <h3 className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-800'}`}>{title}</h3>
      {!isActive && !isDone && <Lock className="w-4 h-4 ml-auto text-gray-400" />}
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
              <p className="text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">{formData.prospectName}</span>? This action cannot be undone.</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">{isNew ? 'New Prospect' : `Client Status : ${formData.prospectName}`}</h2>
              {isReadOnly && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 flex items-center"><Eye className="w-3 h-3 mr-1" /> View Only</span>}
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
                    value={formData.prospectName || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (!/\d/.test(val)) handleSave({ prospectName: val });
                    }}
                    onBlur={validateStep1}
                    className={`block w-full bg-gray-50 border text-gray-900 rounded-lg p-2.5 text-sm ${errors.prospectName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Enter full name"
                    disabled={isReadOnly}
                  />
                  {errors.prospectName && <p className="text-xs text-red-500 mt-1">{errors.prospectName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md font-bold">+60</span>
                    <input
                      type="tel"
                      value={phoneSuffix}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setPhoneSuffix(val);
                      }}
                      onBlur={validateStep1}
                      className={`rounded-none rounded-r-lg bg-gray-50 border text-gray-900 block flex-1 min-w-0 w-full text-sm p-2.5 ${errors.prospectPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                      placeholder="123456789"
                      disabled={isReadOnly}
                    />
                  </div>
                  {errors.prospectPhone && <p className="text-xs text-red-500 mt-1">{errors.prospectPhone}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.prospectEmail || ''}
                    onChange={e => handleSave({ prospectEmail: e.target.value })}
                    onBlur={validateStep1}
                    className={`block w-full bg-gray-50 border text-gray-900 rounded-lg p-2.5 text-sm ${errors.prospectEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="client@email.com"
                    disabled={isReadOnly}
                  />
                  {errors.prospectEmail && <p className="text-xs text-red-500 mt-1">{errors.prospectEmail}</p>}
                </div>
              </div>

              {isNew && !isReadOnly && (
                <div className="flex justify-end pt-2 mt-4 border-t">
                  <button onClick={handleCreate} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Creating...' : 'Confirm & Start Workflow'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2 + 3: Appointment Details & Sales Meeting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!isStep2Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
            <CardHeader
              number={2}
              title="Appointment Details"
              isActive={isStep2Unlocked && formData.appointmentStatus !== 'completed'}
              isDone={formData.appointmentStatus === 'completed'}
            />
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    min={todayStr}
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    onClick={() => (dateInputRef.current as any)?.showPicker?.()}
                    className="block w-full pl-10 bg-gray-50 hover:bg-blue-50 border border-gray-300 hover:border-blue-400 text-black rounded-lg p-2.5 text-sm focus:ring-blue-600 focus:border-blue-600 cursor-pointer transition-colors accent-blue-600"
                    disabled={isReadOnly}
                  />
                  <Calendar onClick={() => (dateInputRef.current as any)?.showPicker?.()} className="absolute left-3 top-2.5 text-blue-600 w-4 h-4 cursor-pointer hover:text-blue-800" />
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
                      if (isDateToday && val < currentHm) {
                        alert("Cannot select a time in the past.");
                        setStartTimeInput(currentHm);
                        return;
                      }
                      setStartTimeInput(val);
                      if (val > endTimeInput) setEndTimeInput(val);
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
                      if (val < startTimeInput) return;
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
                  <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.appointmentLocation || ''}
                    onChange={e => handleSave({ appointmentLocation: e.target.value })}
                    placeholder="e.g. Starbucks KLCC"
                    className="block w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select
                  value={formData.appointmentStatus || 'not_done'}
                  onChange={e => handleSave({ appointmentStatus: e.target.value as any })}
                  className="block w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={isReadOnly}
                >
                  <option value="not_done">Not done (Default)</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="completed">Completed</option>
                  <option value="kiv">KIV</option>
                  <option value="declined">Declined</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Set to <strong>Completed</strong> to unlock Sales Outcome.</p>
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
              isActive={isStep3Unlocked && !allMeetingDone}
              isDone={allMeetingDone}
            />
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Tick each part as it is completed. Sales Outcome unlocks once all three are done.</p>
              {[
                { key: 'social', label: 'Social' },
                { key: 'fact_find', label: 'Fact Find' },
                { key: 'presentation', label: 'Presentation' },
              ].map(({ key, label }) => {
                const checked = meetingParts.includes(key);
                return (
                  <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'} ${isReadOnly ? 'pointer-events-none' : ''}`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-600"
                      checked={checked}
                      disabled={isReadOnly}
                      onChange={() => {
                        const next = checked
                          ? meetingParts.filter(p => p !== key)
                          : [...meetingParts, key];
                        handleSave({ salesPartsCompleted: next });
                      }}
                    />
                    <span className={`font-medium text-sm ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>{label}</span>
                    {checked && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                  </label>
                );
              })}
            </div>
          </div>
          </div>{/* end grid */}

          {/* STEP 4: Sales Outcome */}
          <div className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!isStep4Unlocked ? 'opacity-60 pointer-events-none grayscale' : ''}`}>
            <CardHeader
              number={4}
              title="Sales Outcome"
              isActive={isStep4Unlocked && !isOutcomeDecided}
              isDone={isOutcomeDecided}
            />
            <div className="p-6 space-y-5">

              <div className="flex justify-between items-end">
                <label className="block text-xs font-bold text-gray-500 uppercase">Products Proposed</label>
                {!isReadOnly && !isOutcomeDecided && (
                  <button onClick={handleAddProduct} className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                    <Plus className="w-3 h-3 mr-1" /> ADD PRODUCT
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {productRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product {index + 1}</label>
                      <select
                        value={row.productName || ''}
                        onChange={e => handleProductChange(row.id, 'productName', e.target.value)}
                        className="block w-full bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                        disabled={isReadOnly || isOutcomeDecided}
                      >
                        <option value="">Select Product...</option>
                        {row.productName && !PRODUCT_OPTIONS.flatMap(g => g.options).includes(row.productName) && (
                          <option value={row.productName}>{row.productName}</option>
                        )}
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
                          value={row.aceAmount || ''}
                          onChange={e => handleProductChange(row.id, 'aceAmount', Number(e.target.value))}
                          className="block w-full pl-8 bg-white border border-gray-300 text-gray-900 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          disabled={isReadOnly || isOutcomeDecided}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center pb-2">
                      {!isReadOnly && !isOutcomeDecided && productRows.length > 1 && (
                        <button onClick={() => handleRemoveProduct(row.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <MinusCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end items-center pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500 mr-4 font-medium">Total ACE Amount:</span>
                <span className="text-xl font-bold text-gray-900">RM {productRows.reduce((sum, p) => sum + (p.aceAmount || 0), 0).toLocaleString()}</span>
              </div>

              {!isOutcomeDecided && (
                <div className="space-y-3 pt-4 border-t">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Outcome Selection</label>
                  <div className="flex gap-3">
                    <button onClick={() => handleOutcomeChange('kiv')} disabled={isReadOnly} className="flex-1 py-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 font-bold text-sm shadow-sm transition-transform active:scale-95">
                      KIV
                    </button>
                    <button onClick={() => handleOutcomeChange('successful')} disabled={isReadOnly} className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 mr-2" /> Successful
                    </button>
                    <button onClick={() => handleOutcomeChange('unsuccessful')} disabled={isReadOnly} className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-bold text-sm shadow-sm transition-transform active:scale-95">
                      Non-Successful
                    </button>
                  </div>
                </div>
              )}

              {formData.salesOutcome === 'unsuccessful' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
                    <label className="block text-xs font-bold text-red-700 uppercase">Reason for Non-Successful</label>
                    <select
                      value={failReasonSelectValue}
                      onChange={e => {
                        const val = e.target.value;
                        setFailReasonSelectValue(val);
                        if (val === 'Others') {
                          setCustomFailReason('');
                          handleSave({ unsuccessfulReason: '' });
                        } else {
                          handleSave({ unsuccessfulReason: val });
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

                    {failReasonSelectValue === 'Others' && (
                      <input
                        type="text"
                        value={customFailReason}
                        onChange={e => {
                          setCustomFailReason(e.target.value);
                          handleSave({ unsuccessfulReason: e.target.value });
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

              {formData.salesOutcome === 'kiv' && !isReadOnly && (
                <div className="flex justify-end">
                  <button onClick={handleUndo} className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
                    <Undo2 className="w-4 h-4 mr-1" /> Change Status
                  </button>
                </div>
              )}

              {formData.salesOutcome === 'successful' && !isReadOnly && (
                <div className="flex justify-end">
                  <button onClick={handleUndo} className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium">
                    <Undo2 className="w-4 h-4 mr-1" /> Undo (Edit Sales Data)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Result Screen */}
          {isOutcomeDecided && (
            <div className="animate-in fade-in zoom-in duration-300 pb-6">
              {formData.salesOutcome === 'successful' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-8 text-center shadow-lg">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
                    <DollarSign className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-green-800 mb-2">Congratulations!</h2>
                  <p className="text-green-700 mb-4 font-medium">You have successfully secured a sale of <br /><span className="text-2xl font-bold">RM {productRows.reduce((sum, p) => sum + (p.aceAmount || 0), 0).toLocaleString()}</span></p>
                  <p className="text-sm text-green-600">Click <strong>Save & Close</strong> below to save your changes.</p>
                </div>
              )}

              {formData.salesOutcome === 'unsuccessful' && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-8 text-center shadow-lg">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-800 mb-2">Non-Successful</h2>
                  <p className="text-red-600 italic mb-4">"Every 'No' brings you one step closer to a 'Yes'. Keep pushing forward!"</p>
                  <p className="text-sm text-red-500">Click <strong>Save & Close</strong> below to save your changes.</p>
                </div>
              )}

              {formData.salesOutcome === 'kiv' && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 rounded-xl p-8 text-center shadow-lg">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <PauseCircle className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-amber-800 mb-2">Kept In View</h2>
                  <p className="text-amber-700 italic mb-4">"Patience is key. Schedule a follow-up or check in later to close this sale."</p>
                  <p className="text-sm text-amber-600">Click <strong>Save & Close</strong> below to save your changes.</p>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-4 border-t bg-white flex justify-between items-center rounded-b-xl z-10">
          {!isNew && !isReadOnly ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center font-medium transition-colors">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Prospect
            </button>
          ) : (
            <div></div>
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
