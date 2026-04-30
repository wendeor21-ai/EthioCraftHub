/**
 * Messages Page for EthioCraft Global
 * 
 * Allows artisans to view and respond to customer inquiries
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { supportAPI } from '../utils/api';
import toast from 'react-hot-toast';

  // helper to safely get first character
  const firstChar = (value) => {
    if (!value && value !== 0) return 'U';
    try {
      return String(value).charAt(0);
    } catch {
      return 'U';
    }
  };

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [messages, setMessages] = useState([]);

  const mountedRef = useRef(false);
  const pollingRef = useRef({ intervalId: null, coolingDown: false });

  useEffect(() => {
    if (mountedRef.current) return; // avoid double-effect in Strict Mode
    mountedRef.current = true;

    let cancelled = false;

    const startPolling = () => {
      // initial fetch
      fetchMessages();

      // lower-frequency polling to avoid rate limits
      pollingRef.current.intervalId = setInterval(() => {
        if (!pollingRef.current.coolingDown) fetchMessages();
      }, 15000);
    };

    startPolling();

    return () => {
      cancelled = true;
      if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await supportAPI.getMessages();
      const msgs = res.data.messages || [];
      // normalize messages and ensure known fields exist
      const normalized = msgs.map((m) => ({
        _id: m._id || m.id,
        sender: m.sender || null,
        senderRole: m.senderRole || m.senderRole || 'customer',
        subject: m.subject || '',
        message: m.message || '',
        status: m.status || 'New',
        adminResponse: m.adminResponse || null,
        read: !!m.read,
        createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      }));

      setMessages(normalized);

      /* Uncomment when backend endpoint is ready
      const token = localStorage.getItem('authToken');
      
      const userId = user?.id || user?._id;
      
      if (!token || !userId) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(API_ENDPOINTS.MESSAGES.BY_ARTISAN(userId), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setError('');
      } else {
        setError('Failed to load messages');
        setMessages([]);
      }
      */
    } catch (error) {
      console.error('Error fetching messages:', error);
      const status = error.response?.status;
      if (status === 429) {
        // server rate limit hit: enable cooldown for 60s to avoid hammering
        pollingRef.current.coolingDown = true;
        setTimeout(() => { pollingRef.current.coolingDown = false; }, 60000);
        setError('Server is rate-limiting requests. Retrying shortly.');
      } else if (status === 403) {
        setError('Access denied. Please login with correct privileges.');
      } else {
        setError('Unable to connect to server. Please ensure the backend is running.');
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // when messages update, refresh the selectedMessage object so adminResponse shows up
  useEffect(() => {
    if (selectedMessage && messages.length > 0) {
      const updated = messages.find((m) => m._id === selectedMessage._id);
      if (updated) setSelectedMessage(updated);
    }
  }, [messages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    if (user?.role !== 'admin') {
      toast.error('Only admins can send replies.');
      return;
    }

    try {
      const res = await supportAPI.replyMessage(selectedMessage._id, replyText);
      // update local list
      setMessages(prev => prev.map(m => m._id === selectedMessage._id ? res.data.data : m));
      setReplyText('');
      toast.success('Reply sent');
    } catch (err) {
      console.error('Error sending reply:', err);
      if (err.response?.status === 403) {
        toast.error('Access denied when sending reply');
      } else {
        toast.error('Failed to send reply');
      }
    }
  };

  const markAsRead = async (messageId) => {
    try {
      const res = await supportAPI.markRead(messageId);
      const unread = res?.data?.unreadCount;
      if (typeof window !== 'undefined' && typeof unread === 'number') {
        window.dispatchEvent(new CustomEvent('unreadCountUpdated', { detail: unread }));
      }
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const unreadCount = messages.filter(m => m.status === 'Replied' && !m.read).length;
  const inboxMessages = messages.filter(m => activeTab === 'inbox');
  const unrepliedMessages = messages.filter(m => m.status !== 'Replied');

  const selectedName = selectedMessage ? (
    selectedMessage.sender?.profile
      ? `${selectedMessage.sender.profile.firstName} ${selectedMessage.sender.profile.lastName}`
      : (selectedMessage.sender?.email || selectedMessage.from || 'User')
  ) : '';

  const selectedEmail = selectedMessage ? (selectedMessage.sender?.email || selectedMessage.email || '') : '';

  const selectedDate = selectedMessage ? (selectedMessage.createdAt || selectedMessage.date || '') : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Messages" subtitle="Communicate with your customers" hideSidebar={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/artisan/dashboard')}
          className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
        >
          ← Back to Dashboard
        </button>
        {error && <ErrorMessage message={error} className="mb-6" />}
        
        <div className="flex justify-end mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-white rounded-lg shadow px-4 py-2">
              <span className="text-sm text-gray-600">Unread: </span>
              <span className="font-bold text-ethiopian-gold">{unreadCount}</span>
            </div>
            <div className="bg-white rounded-lg shadow px-4 py-2">
              <span className="text-sm text-gray-600">Pending Reply: </span>
              <span className="font-bold text-ethiopian-red">{unrepliedMessages.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-300px)] min-h-[500px]">
          {/* Message List */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`flex-1 py-4 px-6 text-center font-medium ${
                    activeTab === 'inbox'
                      ? 'border-b-2 border-ethiopian-gold text-ethiopian-gold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-ethiopian-red text-white text-xs px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Message List */}
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto custom-scrollbar">
              {inboxMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                  <div className="text-5xl mb-4 opacity-50 grayscale">📭</div>
                  <p className="font-medium text-sm">No messages yet</p>
                </div>
              ) : (
                inboxMessages.map(m => {
                  const fromName = m.sender?.profile ? `${m.sender.profile.firstName} ${m.sender.profile.lastName}` : (m.sender?.email || 'Unknown');
                  return (
                  <div
                    key={m._id}
                    onClick={() => { setSelectedMessage(m); markAsRead(m._id); }}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?._id === m._id ? 'bg-blue-50' : ''} ${!m.read ? 'bg-amber-50' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-ethiopian-gold rounded-full flex items-center justify-center text-white font-bold">
                          {firstChar(fromName)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{fromName}</h4>
                          <p className="text-xs text-gray-500">{formatDate(m.createdAt)}</p>
                        </div>
                      </div>
                      {!m.read && (
                        <span className="w-2 h-2 bg-ethiopian-red rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{m.subject}</p>
                    <p className="text-sm text-gray-600 truncate">{m.message}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{m.senderRole}</span>
                      {m.status === 'Replied' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Replied</span>
                      )}
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                {/* Message Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-ethiopian-gold rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {firstChar(selectedName || selectedEmail || 'U')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedName || 'User'}</h3>
                        <p className="text-sm text-gray-600">{selectedEmail}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(selectedDate)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMessage.subject}</h2>
                  <div className="mt-2">
                    <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded">
                      Re: {selectedMessage.product}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>

                  {selectedMessage.adminResponse && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                      <p className="text-sm text-green-800 font-medium mb-2">Reply from Support</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMessage.adminResponse}</p>
                    </div>
                  )}
                </div>

                {/* Reply Section - only visible to admins */}
                {user?.role === 'admin' ? (
                  <div className="p-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Reply</h4>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent mb-3"
                    />
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button className="text-sm text-gray-600 hover:text-gray-800">
                          📎 Attach File
                        </button>
                        <button className="text-sm text-gray-600 hover:text-gray-800">
                          📋 Use Template
                        </button>
                      </div>
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className="bg-ethiopian-gold text-white px-6 py-2 rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Only admins can reply to messages. You will see replies from support below.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 bg-gray-50/30">
                <div className="text-6xl mb-5 opacity-40 grayscale">💬</div>
                <p className="text-lg font-medium text-gray-500">Select a message to view</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reply Templates */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reply Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setReplyText('Thank you for your interest! Yes, I can customize this product. Please let me know your specific requirements.')}
              className="p-4 border border-gray-200 rounded-lg hover:border-ethiopian-gold hover:bg-amber-50 transition-colors text-left"
            >
              <h4 className="font-medium text-gray-900 mb-1">Customization Available</h4>
              <p className="text-sm text-gray-600">For custom order inquiries</p>
            </button>
            <button
              onClick={() => setReplyText('Yes, I ship internationally! Shipping typically takes 7-14 business days. I will provide tracking information once your order ships.')}
              className="p-4 border border-gray-200 rounded-lg hover:border-ethiopian-gold hover:bg-amber-50 transition-colors text-left"
            >
              <h4 className="font-medium text-gray-900 mb-1">Shipping Information</h4>
              <p className="text-sm text-gray-600">For shipping questions</p>
            </button>
            <button
              onClick={() => setReplyText('Thank you for your bulk order inquiry! I would be happy to discuss wholesale pricing. Please let me know the quantity you need.')}
              className="p-4 border border-gray-200 rounded-lg hover:border-ethiopian-gold hover:bg-amber-50 transition-colors text-left"
            >
              <h4 className="font-medium text-gray-900 mb-1">Bulk Order</h4>
              <p className="text-sm text-gray-600">For wholesale inquiries</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
