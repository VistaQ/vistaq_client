import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Prospect, ProspectStage } from '../types';
import { Upload, FileText, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

const Import: React.FC = () => {
  const { importProspects } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  // Headers matching Reports.tsx export format
  const TEMPLATE_HEADERS = ['ID', 'Name', 'Phone', 'Group/Agent', 'Outcome', 'Reason', 'Product', 'Amount', 'Date'];
  
  const handleDownloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      'p_sample_1,Ali Baba,+60123456789,agent_1,SUCCESSFUL,,Investment Link,5000,2023-10-01',
      'p_sample_2,Jane Doe,+60198765432,agent_1,UNSUCCESSFUL,Budget issue,Medical Card,0,2023-10-02'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VistaQ_Import_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setStatus({ msg: 'Invalid file format. Please upload a CSV file.', type: 'error' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            if (lines.length < 2) {
                 setStatus({ msg: 'File is empty or missing headers.', type: 'error' });
                 return;
            }

            const parsedData: Prospect[] = [];
            let successCount = 0;

            // Start from index 1 to skip header
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Handle basic CSV parsing
                const cols = line.split(',');
                if (cols.length < 4) continue; 

                // Mapping based on TEMPLATE_HEADERS order
                // ['ID', 'Name', 'Phone', 'Group/Agent', 'Outcome', 'Reason', 'Product', 'Amount', 'Date']
                const id = cols[0]?.trim();
                const name = cols[1]?.trim();
                const phone = cols[2]?.trim();
                const agentId = cols[3]?.trim();
                const outcome = cols[4]?.trim(); // SUCCESSFUL / UNSUCCESSFUL
                const reason = cols[5]?.trim();
                const product = cols[6]?.trim();
                const amount = parseFloat(cols[7]?.trim()) || 0;
                
                // Infer Stage based on outcome for logic consistency
                let stage = ProspectStage.INFO;
                if (outcome === 'SUCCESSFUL') stage = ProspectStage.POINTS;
                else if (outcome === 'UNSUCCESSFUL') stage = ProspectStage.CLOSED;
                else if (outcome) stage = ProspectStage.SALES; 

                if (id && agentId && name) {
                    parsedData.push({
                        id,
                        agentId,
                        name,
                        phone,
                        currentStage: stage,
                        saleStatus: (outcome === 'SUCCESSFUL' || outcome === 'UNSUCCESSFUL') ? outcome as any : undefined,
                        saleReason: reason,
                        productType: product,
                        policyAmountMYR: amount,
                        pointsAwarded: outcome === 'SUCCESSFUL' ? amount * 0.1 : 0,
                        appointmentStatus: 'Completed', // Assume imported records have completed appointments
                        paymentReceived: outcome === 'SUCCESSFUL',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    } as Prospect);
                    successCount++;
                }
            }

            if (successCount > 0) {
                importProspects(parsedData);
                setStatus({ msg: `Successfully imported and synced ${successCount} records.`, type: 'success' });
            } else {
                setStatus({ msg: 'No valid records found to import.', type: 'error' });
            }

        } catch (err) {
            console.error(err);
            setStatus({ msg: 'Error parsing CSV file.', type: 'error' });
        }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
           <p className="text-sm text-gray-500">Bulk upload sales reports to update system data.</p>
        </div>
        <button 
           onClick={handleDownloadTemplate}
           className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-100"
        >
           <FileSpreadsheet className="w-4 h-4 mr-2" />
           Download CSV Template
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
         
         {/* Drag Drop Zone */}
         <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
         >
             <div className="flex flex-col items-center pointer-events-none">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                     <Upload className="w-8 h-8" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Report File</h3>
                 <p className="text-gray-500 mb-6 max-w-sm">
                    Drag and drop your CSV file here, or click the button below to browse.
                 </p>
             </div>
             
             <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleChange}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-transform active:scale-95"
             >
                Select CSV File
             </button>
             
             <p className="text-xs text-gray-400 mt-4">Supported Format: .csv</p>
         </div>

         {/* Status Message */}
         {status && (
             <div className={`mt-6 p-4 rounded-lg flex items-start animate-in fade-in slide-in-from-top-2 border ${
                 status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
             }`}>
                 {status.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
                 <div>
                     <p className="font-bold">{status.type === 'success' ? 'Import Successful' : 'Import Failed'}</p>
                     <p className="text-sm">{status.msg}</p>
                 </div>
             </div>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-500" />
            Format Instructions
         </h3>
         <div className="text-sm text-gray-600 space-y-2">
            <p>1. The file must be a <strong>CSV (Comma Separated Values)</strong> file.</p>
            <p>2. The first row must contain headers. We recommend using the downloadable template to ensure correct column ordering.</p>
            <p>3. <strong>ID</strong>: Must be unique. If an ID matches an existing record, that record will be updated (Synced). If ID is new, a new record is created.</p>
            <p>4. <strong>Group/Agent</strong>: Must match the System ID of the agent (e.g., 'agent_1').</p>
            <p>5. <strong>Outcome</strong>: Use 'SUCCESSFUL' or 'UNSUCCESSFUL' to properly update agent points and badges.</p>
         </div>
      </div>
    </div>
  );
};

export default Import;