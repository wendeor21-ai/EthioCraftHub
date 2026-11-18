/**
 * Messages Page for EthioCraft Global
 * 
 * Mobile-first Chat & Messaging experience (እንደ መደበኛ የሜሴጅ መተግበሪያ)
 * Fully responsive: full-screen conversation view on mobile with back button,
 * side-by-side view on desktop, and completely translated to Amharic.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { supportAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Send, 
  CheckCheck, 
  Clock, 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  User, 
  ShieldCheck, 
  X, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

// Helper to safely get first character for avatar initials
const firstChar = (value) => {
  if (!value && value !== 0) return 'U';
  try {
    return String(value).charAt(0).toUpperCase();
  } catch {
    return 'U';
  }
};

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [messages, setMessages] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'unread'
  
  // Compose New Message Modal State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [sendingNewMessage, setSendingNewMessage] = useState(false);

  const mountedRef = useRef(false);
  const pollingRef = useRef({ intervalId: null, coolingDown: false });

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    fetchMessages();

    // Polling every 20s
    pollingRef.current.intervalId = setInterval(() => {
      if (!pollingRef.current.coolingDown) {
        fetchMessages(true);
      }
    }, 20000);

    return () => {
      if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
    };
  }, []);

  const fetchMessages = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError('');

      const res = await supportAPI.getMessages();
      const msgs = res.data?.messages || [];
      const normalized = msgs.map((m) => ({
        _id: m._id || m.id,
        sender: m.sender || null,
        recipient: m.recipient || null,
        senderRole: m.senderRole || 'customer',
        subject: m.subject || 'መልዕክት',
        message: m.message || '',
        status: m.status || 'New',
        adminResponse: m.adminResponse || null,
        read: !!m.read,
        createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      }));

      setMessages(normalized);

      // If URL has ?id=..., auto-select that message and open it
      try {
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('id') || params.get('messageId');
        if (targetId) {
          const found = normalized.find(m => m._id === targetId);
          if (found) {
            setSelectedMessage(found);
            if (!found.read) {
              markAsRead(found._id);
            }
          }
        }
      } catch (e) {
        // ignore url parse error
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      const status = err.response?.status;
      if (status === 429) {
        pollingRef.current.coolingDown = true;
        setTimeout(() => { pollingRef.current.coolingDown = false; }, 60000);
        setError('ጥያቄዎች በዝተዋል፤ ጥቂት ቆይተው እንደገና ይሞክሩ።');
      } else if (status === 403) {
        setError('መልዕክቶችን ለማየት ፈቃድ የለዎትም። እባክዎ እንደገና ይግቡ።');
      } else {
        setError('መልዕክቶችን መጫን አልተቻለም። እባክዎ ኢንተርኔትዎን ይፈትሹ።');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Keep selectedMessage up-to-date when list updates
  useEffect(() => {
    if (selectedMessage && messages.length > 0) {
      const updated = messages.find((m) => m._id === selectedMessage._id);
      if (updated) setSelectedMessage(updated);
    }
  }, [messages]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const timeStr = date.toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' });

      if (diffDays === 0) {
        return `ዛሬ ${timeStr}`;
      } else if (diffDays === 1) {
        return `ትናንት ${timeStr}`;
      } else if (diffDays < 7) {
        return `ከ${diffDays} ቀን በፊት`;
      } else {
        return date.toLocaleDateString('am-ET', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      markAsRead(msg._id);
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
    } catch (err) {
      console.error('Error marking message read:', err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    if (user?.role !== 'admin') {
      toast.error('ምላሽ መስጠት የሚችሉት አስተዳዳሪዎች ብቻ ናቸው።');
      return;
    }

    try {
      setSendingReply(true);
      const res = await supportAPI.replyMessage(selectedMessage._id, replyText.trim());
      const updatedData = res.data?.data;
      if (updatedData) {
        setMessages(prev => prev.map(m => m._id === selectedMessage._id ? updatedData : m));
        setSelectedMessage(updatedData);
      }
      setReplyText('');
      toast.success('ምላሽዎ በተሳካ ሁኔታ ተልኳል!');
    } catch (err) {
      console.error('Error sending reply:', err);
      toast.error('ምላሹን መላክ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateNewMessage = async (e) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeMessage.trim()) {
      toast.error('እባክዎ ርዕስ እና መልዕክት ያስገቡ');
      return;
    }

    try {
      setSendingNewMessage(true);
      const res = await supportAPI.sendMessage({
        subject: composeSubject.trim(),
        message: composeMessage.trim()
      });

      toast.success('መልዕክትዎ በተሳካ ሁኔታ ተልኳል!');
      setShowComposeModal(false);
      setComposeSubject('');
      setComposeMessage('');

      // Refresh and select the new message
      await fetchMessages(false);
      if (res.data?.data) {
        setSelectedMessage(res.data.data);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('መልዕክቱን መላክ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setSendingNewMessage(false);
    }
  };

  const handleBackNavigation = () => {
    if (selectedMessage) {
      // If a chat conversation is open on mobile, back returns to thread list!
      setSelectedMessage(null);
    } else {
      // If already on thread list, go back to previous page or appropriate home
      if (user?.role === 'artisan') {
        navigate('/artisan/dashboard');
      } else if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(-1);
      }
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const filteredMessages = filterTab === 'unread' 
    ? messages.filter(m => !m.read) 
    : messages;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center">
        <LoadingSpinner size="medium" />
        <p className="text-xs text-gray-500 mt-2 font-medium">መልዕክቶች በመጫን ላይ ናቸው...</p>
      </div>
    );
  }

  const getSenderDisplayName = (msg) => {
    if (!msg) return 'ተጠቃሚ';
    if (msg.sender?.profile) {
      const fn = msg.sender.profile.firstName || '';
      const ln = msg.sender.profile.lastName || '';
      const fullName = `${fn} ${ln}`.trim();
      if (fullName) return fullName;
    }
    return msg.sender?.email || msg.senderRole || 'ተጠቃሚ';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      {/* Top Ethiopian Tricolor Brand Stripe */}
      <div className="h-1 bg-gradient-to-r from-green-600 via-amber-400 to-red-600 w-full shrink-0" />

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-2 sm:p-4 flex flex-col">
        {/* Top Header Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-3.5 py-2.5 mb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBackNavigation}
              className="p-1.5 -ml-1 text-gray-600 hover:text-amber-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
              title="ተመለስ"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center space-x-1.5">
                <span>የውይይት መልዕክቶች</span>
                <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">(Messages)</span>
              </h1>
              <p className="text-[10px] text-gray-500">ከድጋፍ ሰጪ እና ባለሙያዎች ጋር ይገናኙ</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* New Message Compose Button */}
            <button
              onClick={() => setShowComposeModal(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>አዲስ መልዕክት</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchMessages(false)}
              className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="አድስ (Refresh)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-3 shrink-0" />}

        {/* Messaging Layout: Split on desktop, toggle full-screen on mobile */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 min-h-[520px]">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT PANE: THREAD LIST (የመልዕክት ዝርዝር)
              Shown when no message is selected on mobile, or always on desktop
             ══════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-5 border-r border-gray-200 flex flex-col h-full ${
            selectedMessage ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* List Header Tabs */}
            <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex space-x-1">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterTab === 'all'
                      ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  ሁሉም ({messages.length})
                </button>
                <button
                  onClick={() => setFilterTab('unread')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    filterTab === 'unread'
                      ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>ያልተነበቡ</span>
                  {unreadCount > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <span className="text-[10px] text-gray-400 font-medium">
                {filteredMessages.length} ውይይቶች
              </span>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
              {filteredMessages.length === 0 ? (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 opacity-60" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">ምንም መልዕክት የለም</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                    ጥያቄ ወይም አስተያየት ካለዎት "አዲስ መልዕክት" የሚለውን በመጫን ይላኩ።
                  </p>
                  <button
                    onClick={() => setShowComposeModal(true)}
                    className="mt-3.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
                  >
                    + መልዕክት ይጻፉ
                  </button>
                </div>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = selectedMessage?._id === m._id;
                  const senderName = getSenderDisplayName(m);
                  const isReplied = m.status === 'Replied' || !!m.adminResponse;

                  return (
                    <div
                      key={m._id}
                      onClick={() => handleSelectMessage(m)}
                      className={`p-3 sm:p-3.5 cursor-pointer transition-colors relative flex items-start space-x-3 ${
                        isSelected 
                          ? 'bg-amber-50/70 border-l-4 border-amber-600' 
                          : !m.read 
                            ? 'bg-amber-50/20 hover:bg-gray-50' 
                            : 'hover:bg-gray-50/80'
                      }`}
                    >
                      {/* Avatar Circle */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {firstChar(senderName)}
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <h4 className={`text-xs truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {senderName}
                          </h4>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                            {formatDate(m.createdAt)}
                          </span>
                        </div>

                        {/* Subject */}
                        <p className={`text-xs truncate mb-1 ${!m.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {m.subject}
                        </p>

                        {/* Snippet */}
                        <p className="text-[11px] text-gray-500 truncate">
                          {m.adminResponse ? `ምላሽ: ${m.adminResponse}` : m.message}
                        </p>

                        {/* Badges */}
                        <div className="mt-1.5 flex items-center space-x-2">
                          {isReplied ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.2 rounded border border-green-200">
                              ✓ ምላሽ ተሰጥቷል
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              ⏳ በመጠባበቅ ላይ
                            </span>
                          )}

                          {!m.read && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                              አዲስ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Chevron for touch feedback */}
                      <ChevronRight className="w-4 h-4 text-gray-300 self-center shrink-0 hidden sm:block" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT PANE: ACTIVE CONVERSATION (የውይይት ማሳያ)
              Full-screen on mobile when selected, or right pane on desktop
             ══════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-7 flex flex-col h-full bg-[#FAFAFC] ${
            selectedMessage ? 'flex' : 'hidden lg:flex'
          }`}>
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                
                {/* Conversation Header (Mobile App Style) */}
                <div className="bg-white border-b border-gray-200 px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {/* Back to Thread List Button (Crucial on mobile) */}
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="p-1 -ml-1 text-gray-600 hover:text-amber-800 rounded-lg hover:bg-gray-100 lg:hidden"
                      title="ወደ ዝርዝር ተመለስ"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {firstChar(getSenderDisplayName(selectedMessage))}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {getSenderDisplayName(selectedMessage)}
                      </h3>
                      <p className="text-[10px] text-gray-500 truncate">
                        {selectedMessage.subject}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0 pl-2">
                    {selectedMessage.status === 'Replied' || selectedMessage.adminResponse ? (
                      <span className="text-[10px] font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                        ተጠናቋል
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        ምላሽ በመጠባበቅ ላይ
                      </span>
                    )}
                  </div>
                </div>

                {/* Conversation Chat Bubbles Area */}
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
                  {/* Date Separator */}
                  <div className="flex justify-center my-1">
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                      {formatDate(selectedMessage.createdAt)}
                    </span>
                  </div>

                  {/* Bubble 1: Sender's Inquiry */}
                  <div className="flex flex-col items-start max-w-[92%] sm:max-w-[85%]">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3.5 shadow-xs">
                      <div className="flex items-center space-x-1.5 mb-1.5 pb-1 border-b border-gray-100">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                          📌 ርዕስ: {selectedMessage.subject}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.message}
                      </p>
                      <div className="flex items-center justify-end space-x-1 mt-1.5 pt-1 text-[10px] text-gray-400">
                        <span>{formatDate(selectedMessage.createdAt)}</span>
                        <CheckCheck className="w-3 h-3 text-amber-600" />
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 ml-1">
                      የተላከው በ: {getSenderDisplayName(selectedMessage)}
                    </span>
                  </div>

                  {/* Bubble 2: Support / Admin Response */}
                  {selectedMessage.adminResponse ? (
                    <div className="flex flex-col items-end max-w-[92%] sm:max-w-[85%] ml-auto">
                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl rounded-tr-sm p-3.5 shadow-xs">
                        <div className="flex items-center space-x-1.5 mb-1.5 pb-1 border-b border-amber-200/60">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                          <span className="text-[10px] font-bold text-amber-900">
                            የድጋፍ ሰጪ ቡድን ምላሽ (Support Response)
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {selectedMessage.adminResponse}
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-1.5 pt-1 text-[10px] text-amber-700">
                          <span>ምላሽ ተሰጥቷል</span>
                          <CheckCheck className="w-3 h-3 text-green-600" />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 mr-1">
                        EthioCraft የድጋፍ አገልግሎት
                      </span>
                    </div>
                  ) : (
                    /* Waiting for response banner */
                    <div className="bg-white border border-dashed border-amber-300 rounded-xl p-3 text-center my-2">
                      <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1 animate-pulse" />
                      <p className="text-xs font-bold text-gray-800">
                        መልዕክትዎ ለድጋፍ ሰጪ ቡድናችን ደርሷል
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        ባለሙያው ወይም አስተዳዳሪው ምላሽ ሲሰጥ እዚህ በቅጽበት ይደርስዎታል
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Reply Bar */}
                <div className="bg-white border-t border-gray-200 p-2.5 sm:p-3 shrink-0">
                  {user?.role === 'admin' ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="ምላሽዎን እዚህ ይጻፉ (Type reply)..."
                          rows={2}
                          className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                        />
                        <button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || sendingReply}
                          className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 shrink-0 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{sendingReply ? 'በመላክ...' : 'ላክ'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-500">
                        ተጨማሪ ጥያቄ አለዎት? አዲስ መልዕክት መላክ ይችላሉ።
                      </p>
                      <button
                        onClick={() => {
                          setComposeSubject(`Re: ${selectedMessage.subject}`);
                          setShowComposeModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>መልዕክት ላክ</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* Empty state on desktop when no message is selected */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 opacity-50" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-700">
                  ለማንበብ መልዕክት ይምረጡ
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                  በግራ በኩል ካለው ዝርዝር ውስጥ ማንበብ ወይም መመለስ የሚፈልጉትን ውይይት ይጫኑ
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          COMPOSE NEW MESSAGE MODAL (አዲስ መልዕክት መጻፊያ)
         ════════════════════════════════════════════════════════════════ */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                  አዲስ መልዕክት ይጻፉ
                </h3>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewMessage} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  የመልዕክት ርዕስ (Subject) *
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="ምሳሌ: ስለ ትዕዛዝ ማድረሻ፣ ስለ ክፍያ ጥያቄ..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  መልዕክት (Message Details) *
                </label>
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="ጥያቄዎን ወይም አስተያየትዎን እዚህ በዝርዝር ይጻፉ..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none"
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  disabled={sendingNewMessage}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingNewMessage ? 'በመላክ ላይ...' : 'መልዕክት ላክ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
