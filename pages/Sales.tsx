
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DollarSign, CheckCircle, Calendar, Shield, ArrowUpRight } from 'lucide-react';

const Sales: React.FC = () => {
  const { currentUser } = useAuth();
  const { getProspectsByScope } = useData();

  if (!currentUser) return null;

  // Filter only Successful Sales for the current user
  const mySales = getProspectsByScope(currentUser)
    .filter(p => p.saleStatus === 'SUCCESSFUL')
    .sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

  const totalFYC = mySales.reduce((sum, p) => sum + (p.policyAmountMYR || 0), 0);

  const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sales Portfolio</h1>
          <p className="text-sm text-gray-500">Track your successful closings and commissionable premiums.</p>
        </div>
        <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center">
            <div className="p-2 bg-green-500 rounded-lg mr-4">
                <DollarSign className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-medium opacity-80 uppercase">Total Accumulated FYC</p>
                <p className="text-2xl font-bold">RM {totalFYC.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
           <h3 className="font-bold text-gray-800 flex items-center">
             <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
             Successful Policies
           </h3>
           <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
             {mySales.length} Policies
           </span>
        </div>
        
        {mySales.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Closed</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">FYC Amount (MYR)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mySales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-green-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {formatDate(sale.updatedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-bold text-gray-900">{sale.name}</span>
                       <div className="text-xs text-gray-500 mt-0.5">{sale.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       <div className="flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-blue-500" />
                          {sale.productType}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="font-mono font-bold text-gray-900">
                          {sale.policyAmountMYR?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                         <CheckCircle className="w-3 h-3 mr-1" />
                         Successful
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        ) : (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Sales Yet</h3>
                <p className="max-w-xs mx-auto mt-2">Successful sales transactions will appear here once you close deals in the prospects workflow.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
