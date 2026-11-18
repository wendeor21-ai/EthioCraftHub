import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { supportAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Bell,
  Mail,
  Send,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Inbox
} from 'lucide-react';

const AdminMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'unread'
  const [searchQuery, setSearchQuery] = useState('');

  const targetIdFromUrl = searchParams.get('id');

  const fetchMessages = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const res = await supportAPI.getMessages();
      const msgs = res.data?.messages || [];
      const normalized = msgs.map((m) => ({
        _id: m._id || m.id,
        sender: m.sender || null,
        recipient: m.recipient || null,
        senderRole: m.senderRole || 'customer',
        subject: m.subject || 'ማሳወቂያ / መልዕክት',
        message: m.message || '',
        status: m.status || 'New',
        adminResponse: m.adminResponse || null,
        read: !!m.read,
        createdAt: m.createdAt || m.created_at || new Date().toISOString(),
      }));

      setMessages(normalized);

      // Select target message from URL if present
      if (targetIdFromUrl) {
        const found = normalized.find((m) => m._id === targetIdFromUrl);
        if (found) {
          handleSelectMessage(found, false);
          return;
        }
      }

      // If already has selectedMessage, update it from fresh data
      setSelectedMessage((prev) => {
        if (prev) {
          const fresh = normalized.find((m) => m._id === prev._id);
          return fresh || normalized[0] || null;
        }
        // Default to first on desktop if available
        if (window.innerWidth >= 1024 && normalized.length > 0) {
          return normalized[0];
        }
        return null;
      });
    } catch (err) {
      console.error('Failed to load support notifications/messages:', err);
      if (err.response?.status === 403) {
        toast.error('ማሳወቂያዎችን ለማየት ፈቃድ የለዎትም (Access Denied)');
      } else {
        toast.error('ማሳወቂያዎችን መጫን አልተቻለም');
      }
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchMessages();
    }
  }, [user]);

  // Handle selecting a notification / message
  const handleSelectMessage = async (msg, updateUrl = true) => {
    setSelectedMessage(msg);
    setReplyText('');
    if (updateUrl) {
      setSearchParams({ id: msg._id });
    }

    // If unread, mark as read immediately
    if (!msg.read) {
      try {
        await supportAPI.markRead(msg._id);
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, read: true } : m))
        );
        // Dispatch real-time unread count event for navbar badge
        try {
          const countRes = await supportAPI.getUnreadCount();
          const unread = countRes.data?.unreadCount ?? 0;
          window.dispatchEvent(
            new CustomEvent('unreadCountUpdated', { detail: unread })
          );
        } catch (e) {
          // ignore badge refresh failure
        }
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  };

  // Send admin reply
  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await supportAPI.replyMessage(selectedMessage._id, replyText.trim());
      const updated = res.data?.data;
      if (updated) {
        const fullUpdated = {
          ...selectedMessage,
          ...updated,
          read: true,
          status: 'Replied',
          adminResponse: replyText.trim()
        };
        setMessages((prev) =>
          prev.map((m) => (m._id === selectedMessage._id ? fullUpdated : m))
        );
        setSelectedMessage(fullUpdated);
      }
      setReplyText('');
      toast.success('ምላሽዎ በተሳካ ሁኔታ ተልኳል!');
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast.error('ምላሹን መላክ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('am-ET', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getSenderName = (m) => {
    if (!m) return 'ተጠቃሚ';
    if (m.sender?.profile) {
      const fn = m.sender.profile.firstName || '';
      const ln = m.sender.profile.lastName || '';
      const name = `${fn} ${ln}`.trim();
      if (name) return name;
    }
    return m.sender?.email || m.senderRole || 'ተጠቃሚ';
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-600">
        ይህንን ገጽ ለማየት የአስተዳዳሪ ፈቃድ ያስፈልጋል (Access denied)
      </div>
    );
  }

  // Filter messages
  const filteredMessages = messages.filter((m) => {
    const matchesTab = filterTab === 'unread' ? !m.read : true;
    const name = getSenderName(m).toLowerCase();
    const subj = (m.subject || '').toLowerCase();
    const body = (m.message || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query ? name.includes(query) || subj.includes(query) || body.includes(query) : true;
    return matchesTab && matchesSearch;
  });

  const unreadTotal = messages.filter((m) => !m.read).length;

  return (
    <DashboardLayout
      title="የማሳወቂያ እና መልዕክቶች ማዕከል"
      subtitle="ከደንበኞች እና የእደ-ጥበብ ባለሙያዎች የተላኩ ማሳወቂያዎች"
      hideSidebar={false}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>የማሳወቂያዎች ማዕከል</span>
                {unreadTotal > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                    {unreadTotal} አዲስ
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500">
                ከስርዓቱ እና ከተጠቃሚዎች የተላኩ መልዕክቶችን ይመልከቱ እና ፈጣን ምላሽ ይስጡ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchMessages(false)}
              className="h-9 px-3 rounded-xl bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-800 border border-gray-200 flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
              title="አድስ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>አድስ</span>
            </button>
          </div>
        </div>

        {/* Master-Detail Split Pane */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 overflow-hidden flex flex-col lg:grid lg:grid-cols-12 min-h-[580px]">
          
          {/* ══════════════════════════════════════════════════════════════
              LEFT PANE: NOTIFICATIONS / MESSAGES LIST
             ══════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-5 border-r border-gray-200/90 flex flex-col h-full ${
              selectedMessage ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* List Controls Header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/60 space-y-2">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    ሁሉም ({messages.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('unread')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterTab === 'unread'
                        ? 'bg-white text-gray-900 shadow-2xs border border-gray-200'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>ያልተነበቡ</span>
                    {unreadTotal > 0 && (
                      <span className="bg-red-500 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                        {unreadTotal}
                      </span>
                    )}
                  </button>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">
                  {filteredMessages.length} ማሳወቂያዎች
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="በስም፣ በርዕስ ወይም በይዘት ይፈልጉ..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Notifications List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loading ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  ማሳወቂያዎች በመጫን ላይ ናቸው...
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-16 text-center px-4">
                  <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600">ምንም ማሳወቂያ አልተገኘም</p>
                  <p className="text-[11px] text-gray-400 mt-1">አዳዲስ ማሳወቂያዎች ሲመጡ እዚህ ይታያሉ።</p>
                </div>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = selectedMessage?._id === m._id;
                  const senderName = getSenderName(m);
                  const isReplied = m.status === 'Replied' || !!m.adminResponse;

                  return (
                    <div
                      key={m._id}
                      onClick={() => handleSelectMessage(m)}
                      className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-600 shadow-2xs'
                          : !m.read
                            ? 'bg-amber-50/30 border-red-500 hover:bg-gray-50'
                            : 'border-transparent hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {senderName.charAt(0).toUpperCase()}
                        </div>

                        {/* Content Preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-xs truncate ${!m.read ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                              {senderName}
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {formatDate(m.createdAt)}
                            </span>
                          </div>

                          <p className={`text-xs truncate mb-1 ${!m.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                            {m.subject}
                          </p>

                          <p className="text-[11px] text-gray-500 truncate">
                            {m.adminResponse ? `ምላሽ ተሰጥቷል: ${m.adminResponse}` : m.message}
                          </p>

                          {/* Status Pills */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              m.senderRole === 'artisan'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {m.senderRole === 'artisan' ? 'የእደ-ጥበብ ባለሙያ' : 'ደንበኛ'}
                            </span>

                            {isReplied ? (
                              <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.2 rounded font-medium">
                                ✓ ምላሽ የተሰጠ
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                                ⏳ በመጠባበቅ ላይ
                              </span>
                            )}

                            {!m.read && (
                              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded font-bold animate-pulse">
                                አዲስ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT PANE: SELECTED NOTIFICATION CONVERSATION DETAIL
             ══════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-7 flex flex-col h-full bg-white ${
              !selectedMessage ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                {/* Detail Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:text-amber-800 hover:bg-gray-100 rounded-lg cursor-pointer"
                      title="ወደ ዝርዝር ተመለስ"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {getSenderName(selectedMessage).charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                        {getSenderName(selectedMessage)}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{selectedMessage.sender?.email || 'ኢሜይል አልተገለጸም'}</span>
                        <span>•</span>
                        <span className="capitalize font-medium text-amber-700">
                          {selectedMessage.senderRole === 'artisan' ? 'የእደ-ጥበብ ባለሙያ' : 'ደንበኛ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-gray-400 block">
                      {formatDate(selectedMessage.createdAt)}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      selectedMessage.status === 'Replied'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedMessage.status === 'Replied' ? 'ምላሽ ተሰጥቷል' : 'አዲስ ጥያቄ'}
                    </span>
                  </div>
                </div>

                {/* Message Content Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Subject Title Card */}
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                      ርዕስ (Subject)
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {selectedMessage.subject}
                    </h4>
                  </div>

                  {/* Original Message Bubble */}
                  <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        {getSenderName(selectedMessage)} የላከው መልዕክት:
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(selectedMessage.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Previous Admin Response if any */}
                  {selectedMessage.adminResponse && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-2xs ml-4 sm:ml-8">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          የአስተዳዳሪ ምላሽ (Admin Response):
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          የተላከ
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.adminResponse}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reply Form Footer */}
                <div className="p-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                  <div className="flex flex-col space-y-2">
                    <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                      <span>ለተጠቃሚው ምላሽ ይጻፉ:</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        ቀጥታ ወደ ተጠቃሚው መለያ ይላካል
                      </span>
                    </label>

                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="ምላሽዎን እዚህ ይጻፉ..."
                      rows={3}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 resize-none shadow-2xs"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {replyText.length > 0 ? `${replyText.length} ፊደላት` : ''}
                      </span>
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendingReply ? 'በመላክ ላይ...' : 'ምላሽ ላክ'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 opacity-60" />
                </div>
                <h3 className="text-sm font-bold text-gray-700">ማሳወቂያ አልተመረጠም</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  ሙሉ ዝርዝሩን ለማየት እና ምላሽ ለመስጠት ከግራ በኩል የሚፈልጉትን ማሳወቂያ ይምረጡ።
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminMessages;
