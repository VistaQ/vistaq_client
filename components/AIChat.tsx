
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';
import { AIChatMessage } from '../types';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I am your AI Sales Coach. Need help with a prospect or strategy?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [m.text]
      }));

      const responseText = await getChatResponse(history, userMsg.text);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-yellow-300" />
          <h3 className="font-bold">VistaQ AI Assistant</h3>
        </div>
        <button onClick={onClose} className="hover:text-gray-200 hover:bg-white/10 p-1 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-violet-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm text-sm text-gray-500 flex items-center">
               <Sparkles className="w-3 h-3 mr-2 animate-spin text-violet-500" />
               Thinking...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t rounded-b-2xl">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for coaching or insights..."
            className="flex-1 bg-gray-50 text-gray-900 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            autoFocus
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-violet-600 text-white rounded-full hover:bg-violet-700 disabled:bg-gray-300 shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
