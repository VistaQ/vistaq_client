
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const GlobalNotification: React.FC = () => {
  const { notification, closeNotification } = useAuth();
  
  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
          <div className={`h-2 w-full ${
              notification.type === 'success' ? 'bg-green-500' : 
              notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`} />
          
          <div className="p-8 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                  notification.type === 'success' ? 'bg-green-100 text-green-600' : 
                  notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                  {notification.type === 'success' && <CheckCircle className="w-8 h-8" />}
                  {notification.type === 'error' && <AlertCircle className="w-8 h-8" />}
                  {notification.type === 'info' && <Info className="w-8 h-8" />}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{notification.title}</h3>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">{notification.message}</p>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button 
                onClick={closeNotification}
                className="bg-gray-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
              >
                 Done
              </button>
          </div>
       </div>
    </div>
  );
};

export default GlobalNotification;
