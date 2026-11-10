import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  LightBulbIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { API_BASE_URL } from '../utils/api';

const ZemaAI = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sidebarRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSuggestions();
    loadChatSessions();

    // Start a new session if none exists
    if (chatSessions.length === 0) {
      createNewChat();
    }
  }, []);

  // Load chat sessions from localStorage
  const loadChatSessions = () => {
    try {
      const savedSessions = localStorage.getItem(`zemaai_sessions_${user?._id}`);
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions);
        setChatSessions(sessions);

        // Load the most recent session
        if (sessions.length > 0) {
          const lastSession = sessions[0];
          setCurrentSessionId(lastSession.id);
          setMessages(lastSession.messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  // Save chat sessions to localStorage
  const saveChatSessions = (sessions) => {
    try {
      localStorage.setItem(`zemaai_sessions_${user?._id}`, JSON.stringify(sessions));
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to save chat sessions:', error);
    }
  };

  // Create a new chat session
  const createNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        role: 'assistant',
        content: `Hello ${user?.profile?.firstName || 'there'}! 👋 I'm ZemaAI, your intelligent assistant for EthioCraft Global. I can help you with inventory insights, product recommendations, and business decisions. What would you like to know?`,
        timestamp: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedSessions = [newSession, ...chatSessions];
    saveChatSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
  };

  // Switch to a different chat session
  const switchToSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages || []);
    }
  };

  // Delete a chat session
  const deleteSession = (sessionId, e) => {
    e.stopPropagation();

    if (!window.confirm('Delete this chat? This action cannot be undone.')) return;

    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    saveChatSessions(updatedSessions);

    // If we deleted the current session, create a new one
    if (sessionId === currentSessionId) {
      if (updatedSessions.length > 0) {
        switchToSession(updatedSessions[0].id);
      } else {
        createNewChat();
      }
    }
  };

  // Update session title
  const updateSessionTitle = (sessionId, newTitle) => {
    const updatedSessions = chatSessions.map(s =>
      s.id === sessionId ? { ...s, title: newTitle, updatedAt: new Date() } : s
    );
    saveChatSessions(updatedSessions);
    setEditingSessionId(null);
  };

  // Update current session with new messages
  const updateCurrentSession = (newMessages) => {
    const updatedSessions = chatSessions.map(session => {
      if (session.id === currentSessionId) {
        // Auto-generate title from first user message
        let title = session.title;
        if (title === 'New Chat' && newMessages.length > 1) {
          const firstUserMessage = newMessages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
          }
        }

        return {
          ...session,
          messages: newMessages,
          title,
          updatedAt: new Date()
        };
      }
      return session;
    });

    // Sort by most recent
    updatedSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    saveChatSessions(updatedSessions);
  };

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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
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

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } catch (error) {
      console.error('Chat error:', error);
      let errorContent = 'I apologize, but I encountered an error. Please try again.';
      if (error.message.includes('model')) errorContent = 'AI service is being configured. Please try again in a moment.';
      else if (error.message.includes('rate limit')) errorContent = 'Too many requests. Please wait a moment before trying again.';

      const errorMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentSession(finalMessages);
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

  const formatSessionDate = (date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now - sessionDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return sessionDate.toLocaleDateString();
  };

  const showSuggestions = messages.length <= 1 && suggestions.length > 0;

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 768 && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        if (sidebarOpen && !event.target.closest('.mobile-menu-button')) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed md:relative z-30 w-64 bg-gray-900 text-white h-full transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/zema-logo.png"
                alt="ZemaAI"
                className="w-8 h-8 rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-8 h-8 bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-lg hidden items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">ZemaAI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-gray-800 rounded"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                switchToSession(session.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id
                ? 'bg-gray-800 text-white'
                : 'hover:bg-gray-800 text-gray-300'
                }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4 flex-shrink-0" />

              {editingSessionId === session.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => updateSessionTitle(session.id, editingTitle)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateSessionTitle(session.id, editingTitle);
                    if (e.key === 'Escape') setEditingSessionId(null);
                  }}
                  className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded outline-none"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{session.title}</p>
                  <p className="text-xs text-gray-400">{formatSessionDate(session.updatedAt)}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSessionId(session.id);
                    setEditingTitle(session.title);
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Rename"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  className="p-1 hover:bg-red-600 rounded"
                  title="Delete"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {chatSessions.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No chat history yet</p>
              <p className="text-xs mt-1">Start a new conversation</p>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCircleIcon className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.profile?.firstName || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mobile-menu-button p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">ZemaAI Assistant</h1>
              <p className="text-xs text-gray-500">AI-powered insights for EthioCraft</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline">Live</span>
            </span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span className="text-gray-400 hidden sm:inline">v2.0</span>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 mr-3">
                  <img 
                    src="/zema-logo.png" 
                    alt="ZemaAI" 
                    className="w-8 h-8 rounded-lg object-cover shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-8 h-8 bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-lg hidden items-center justify-center shadow-sm">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${message.role === 'user'
                  ? 'bg-ethiopian-gold text-white rounded-br-sm shadow-md'
                  : message.isError
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-sm'
                  }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div className={`text-[10px] mt-2 text-right ${message.role === 'user' ? 'text-amber-100' : 'text-gray-400'
                  }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="flex-shrink-0 mr-3">
                <img 
                  src="/zema-logo.png" 
                  alt="ZemaAI" 
                  className="w-8 h-8 rounded-lg object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-8 h-8 bg-gradient-to-br from-ethiopian-gold to-amber-600 rounded-lg hidden items-center justify-center shadow-sm">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="small" />
                  <span className="text-sm text-gray-500">ZemaAI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="px-4 pb-3">
            <div className="max-w-3xl mx-auto p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="w-4 h-4 text-ethiopian-gold" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Suggested questions
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-2 text-xs text-left bg-gray-50 hover:bg-ethiopian-gold/10 text-gray-700 hover:text-ethiopian-gold rounded-lg transition-all duration-200 border border-gray-200 hover:border-ethiopian-gold/30"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 pb-4">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-2">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything about your business..."
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
                className="p-3 bg-ethiopian-gold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
                title="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5 text-white" style={{ transform: 'rotate(-45deg)' }} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        @media (max-width: 768px) {
          .max-w-3xl {
            max-width: 100%;
          }
        }
      `}} />
    </div>
  );
};

export default ZemaAI;
