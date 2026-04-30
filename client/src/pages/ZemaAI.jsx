import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  SparklesIcon, 
  PaperAirplaneIcon,
  LightBulbIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { API_BASE_URL } from '../utils/api';

const ZemaAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSuggestions();
    setMessages([{
      role: 'assistant',
      content: `Hello ${user?.profile?.firstName || 'there'}! 👋 I'm ZemaAI, your intelligent assistant for EthioCraft Global. I can help you with inventory insights, product recommendations, and business decisions. What would you like to know?`,
      timestamp: new Date()
    }]);
  }, [user]);

  const loadSuggestions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const origin = API_BASE_URL.replace(/\/api\/?$/, "");
      const response = await fetch(`${origin}/api/zema-ai/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/zema-ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageText })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to get response');

      const assistantMessage = {
        role: 'assistant',
        content: data.response || data.reply || 'No response from AI',
        timestamp: new Date(),
        metadata: data.metadata
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      let errorContent = 'I apologize, but I encountered an error. Please try again.';
      if (error.message.includes('model')) errorContent = 'AI service is being configured. Please try again in a moment.';
      else if (error.message.includes('rate limit')) errorContent = 'Too many requests. Please wait a moment before trying again.';
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Determine if we should show suggestions (only when there are few messages)
  const showSuggestions = messages.length <= 1 && suggestions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-screen">
        
        {/* Header - Clean and minimal */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Back"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">ZemaAI Assistant</h1>
                <p className="text-xs text-gray-500">AI-powered insights for your EthioCraft business</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
            <span>•</span>
            <span>v2.0</span>
          </div>
        </div>

        {/* Chat Container - Like ChatGPT */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-5 pr-2 custom-scrollbar">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mr-3 mt-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-full flex items-center justify-center shadow-sm">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-ethiopian-gold text-white rounded-br-none shadow-sm'
                    : message.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <div className={`text-[10px] mt-2 text-right ${
                  message.role === 'user' ? 'text-amber-100' : 'text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                  {message.metadata && (
                    <span className="ml-2 border-l border-current pl-2">{message.metadata.responseTime}</span>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 ml-3 mt-1">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex-shrink-0 mr-3">
                <div className="w-8 h-8 bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="small" />
                  <span className="text-sm text-gray-500">ZemaAI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions - Modern chip design */}
        {showSuggestions && (
          <div className="mb-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <LightBulbIcon className="w-4 h-4 text-ethiopian-gold" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested questions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-ethiopian-gold/10 text-gray-700 hover:text-ethiopian-gold rounded-full transition-all duration-200 border border-gray-200 hover:border-ethiopian-gold/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area - Clean and functional */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about inventory, trends, or sales..."
              rows="1"
              className="flex-1 resize-none px-4 py-3 text-sm text-gray-700 placeholder-gray-400 bg-transparent border-0 focus:ring-0 focus:outline-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 bg-ethiopian-gold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white -rotate-45" />
            </button>
          </form>
          
          {/* Footer metadata - subtle */}
          
        </div>
      </div>

      {/* Custom scrollbar style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
    </div>
  );
};

export default ZemaAI;