
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Filter, PieChart, CheckCircle, XCircle, PauseCircle } from 'lucide-react';
import { UserRole } from '../types';

const Reports: React.FC = () => {
  const { currentUser, groups } = useAuth();
  const { getProspectsByScope, getGroupProspects } = useData();

  // Filters State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  
  // 1. Get Base Data (based on user role, handles scoped access)
  let allProspects = currentUser ? getProspectsByScope(currentUser) : [];
  
  // 2. Apply Group Filter (Trainer Only)
  if (selectedGroupId !== 'all' && (currentUser?.role === UserRole.TRAINER || currentUser?.role === UserRole.ADMIN)) {
      // If a specific group is selected, fetch that group's prospects specifically
      // or filter the 'allProspects' if it already contains everything.
      allProspects = allProspects.filter(p => p.groupId === selectedGroupId);
  }

  // 3. Filter for Closed Sales (Success or Unsuccessful or KIV) for report basis
  let closedSales = allProspects.filter(p => p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful' || p.salesOutcome === 'kiv');

  // 4. Apply Outcome Filter
  if (selectedOutcome !== 'all') {
      closedSales = closedSales.filter(p => p.salesOutcome === selectedOutcome);
  }

  // Calculate Metrics based on FILTERED data
  const successfulSales = closedSales.filter(p => p.salesOutcome === 'successful');
  const totalClosed = closedSales.length;
  const totalSuccessful = successfulSales.length;

  // Re-calculate context metrics (Ignoring outcome filter for the top cards to show context)
  const contextClosedSales = selectedGroupId !== 'all'
      ? allProspects.filter(p => p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful')
      : (selectedOutcome === 'all' ? closedSales : allProspects.filter(p => p.salesOutcome === 'successful' || p.salesOutcome === 'unsuccessful'));

  const contextSuccessful = contextClosedSales.filter(p => p.salesOutcome === 'successful');
  const contextTotalClosed = contextClosedSales.length;
  const conversionRate = contextTotalClosed > 0 ? (contextSuccessful.length / contextTotalClosed) * 100 : 0;

  // Revenue is based on the actually displayed successful rows
  const totalRevenue = successfulSales.reduce((sum, p) => (p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), sum), 0);

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Group/Agent', 'Outcome', 'Reason (If Lost)', 'Product', 'Amount (MYR)', 'Date'];
    const rows = closedSales.map(p => {
      let outcomeLabel = '';
      if (p.salesOutcome === 'successful') outcomeLabel = 'Won';
      else if (p.salesOutcome === 'unsuccessful') outcomeLabel = 'Lose';
      else if (p.salesOutcome === 'kiv') outcomeLabel = 'KIV';

      const totalAce = (p.productsSold || []).reduce((s, prod) => s + (prod.aceAmount || 0), 0);
      const productNames = (p.productsSold || []).map(prod => prod.productName).filter(Boolean).join('; ');

      return [
        p.id,
        p.prospectName,
        p.prospectPhone || '',
        p.uid,
        outcomeLabel,
        p.unsuccessfulReason || 'N/A',
        productNames || 'N/A',
        totalAce,
        p.updatedAt
      ]
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VistaQ_Report_${selectedGroupId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isTrainer = currentUser?.role === UserRole.TRAINER || currentUser?.role === UserRole.ADMIN;
  
  // Determine visible groups for dropdown
  const visibleGroups = (currentUser?.role === UserRole.TRAINER && currentUser.managedGroupIds)
    ? groups.filter(g => currentUser.managedGroupIds!.includes(g.id))
    : groups;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
           <p className="text-sm text-gray-500">Analyze conversion rates and outcome data.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
         <div className="flex items-center text-sm font-bold text-gray-700 mr-2">
            <Filter className="w-4 h-4 mr-2" /> Filters:
         </div>
         
         {isTrainer && (
             <select 
               value={selectedGroupId}
               onChange={(e) => setSelectedGroupId(e.target.value)}
               className="bg-gray-50 border border-gray-300 text-gray-900 rounded-md shadow-sm text-sm p-2 focus:ring-blue-500 focus:border-blue-500"
             >
               <option value="all">All Managed Groups</option>
               {visibleGroups.map(g => (
                   <option key={g.id} value={g.id}>{g.name}</option>
               ))}
             </select>
         )}

         <select 
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 rounded-md shadow-sm text-sm p-2 focus:ring-blue-500 focus:border-blue-500"
         >
            <option value="all">All Outcomes</option>
            <option value="SUCCESSFUL">Won (Successful)</option>
            <option value="UNSUCCESSFUL">Lost (Unsuccessful)</option>
            <option value="KIV">KIV</option>
         </select>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-sm font-medium text-gray-500">Avg. Conversion Rate</p>
                   <h3 className="text-3xl font-bold text-gray-900 mt-1">{Math.round(conversionRate)}%</h3>
                </div>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                   <PieChart className="w-6 h-6" />
                </div>
             </div>
             <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full" style={{ width: `${conversionRate}%` }}></div>
             </div>
             <p className="text-xs text-gray-400 mt-2">Based on current filters</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-sm font-medium text-gray-500">Filtered Sales Count</p>
                   <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalClosed}</h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                   <FileText className="w-6 h-6" />
                </div>
             </div>
             <p className="text-xs text-gray-400 mt-2">Matching records found</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-sm font-medium text-gray-500">Total Revenue (Filtered)</p>
                   <h3 className="text-3xl font-bold text-gray-900 mt-1">RM {totalRevenue.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                   <CheckCircle className="w-6 h-6" />
                </div>
             </div>
             <p className="text-xs text-gray-400 mt-2">FYC from displayed records</p>
          </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
           <div className="flex items-center text-gray-800 font-bold">
             Detailed Data Log
           </div>
           <div className="text-sm text-gray-500">
              Showing {closedSales.length} results
           </div>
        </div>

        <div className="overflow-x-auto">
             <table className="min-w-full text-left">
               <thead className="bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Outcome</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Notes / Reason</th>
                   <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">FYC (MYR)</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-100">
                 {closedSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDate(sale.updatedAt)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                            {sale.prospectName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            {(sale.productsSold || []).map(p => p.productName).filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                            {sale.salesOutcome === 'successful' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Won
                                </span>
                            )}
                            {sale.salesOutcome === 'unsuccessful' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                    <XCircle className="w-3 h-3 mr-1" /> Lose
                                </span>
                            )}
                            {sale.salesOutcome === 'kiv' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                    <PauseCircle className="w-3 h-3 mr-1" /> KIV
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 italic">
                            {sale.salesOutcome === 'unsuccessful' ? (
                                sale.unsuccessfulReason
                            ) : (
                                sale.salesOutcome === 'successful' ? 'Completed' : 'Pending'
                            )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-gray-900">
                            {sale.salesOutcome === 'successful'
                                ? (sale.productsSold || []).reduce((s, p) => s + (p.aceAmount || 0), 0).toLocaleString()
                                : <span className="text-gray-300">-</span>}
                        </td>
                    </tr>
                 ))}
                 {closedSales.length === 0 && (
                     <tr>
                         <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                             No records found matching your filters.
                         </td>
                     </tr>
                 )}
               </tbody>
             </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
