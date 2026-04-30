import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { supportAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReply, setActiveReply] = useState({}); // id -> text

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await supportAPI.getMessages();
      console.log('support.getMessages response', res);
      const msgs = res.data.messages || [];
      setMessages(msgs);

      if ((!msgs || msgs.length === 0)) {
        // If no messages returned but unread badge exists, fetch unread count for insight
        try {
          const countRes = await supportAPI.getUnreadCount();
          console.log('support.getUnreadCount response', countRes);
          if (countRes.data?.unreadCount > 0) {
            toast('There are unread support notifications but no messages returned from the API', { icon: '⚠️' });
          }
        } catch (err) {
          console.error('Error fetching unread count after empty messages', err);
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
      if (err.response?.status === 403) {
        toast.error('Access denied when fetching support messages (403)');
      } else {
        toast.error('Failed to load support messages');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') fetchMessages();
  }, [user]);

  const handleReplyChange = (id, value) => {
    setActiveReply(prev => ({ ...prev, [id]: value }));
  };

  const sendReply = async (id) => {
    const text = (activeReply[id] || '').trim();
    if (!text) return;

    try {
      const res = await supportAPI.replyMessage(id, text);
      setMessages(prev => prev.map(m => m._id === id ? res.data.data : m));
      setActiveReply(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      console.error('Failed to send reply', err);
      alert('Failed to send reply');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">Access denied</div>
    );
  }

  return (
    <DashboardLayout title="Support Messages" subtitle="Manage incoming support requests" hideSidebar={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end mb-6">
          <button onClick={fetchMessages} className="px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Messages</h3>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {messages.map(m => (
                <div
                  key={m._id}
                  onClick={async () => {
                    try {
                      await supportAPI.markRead(m._id);
                      fetchMessages();
                    } catch (err) {
                      // Handle unauthorized or other errors gracefully
                      console.error('markRead failed', err);
                      if (err.response?.status === 403) {
                        toast.error('Access denied when marking message read');
                      }
                    }
                  }}
                  className={`p-4 cursor-pointer ${!m.read ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{m.sender?.profile?.firstName ? `${m.sender.profile.firstName} ${m.sender.profile.lastName}` : (m.sender?.email || 'Unknown')}</div>
                      <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                    {!m.read && <div className="text-xs bg-red-600 text-white px-2 py-1 rounded">New</div>}
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-medium">{m.subject}</div>
                    <div className="text-sm text-gray-700 truncate">{m.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500">No messages</div>
            ) : (
              messages.map(m => (
                <div key={m._id} className="mb-6 border-b pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{m.subject}</div>
                      <div className="text-xs text-gray-500">From: {m.sender?.email || 'Unknown'} • {m.senderRole}</div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded mb-3 whitespace-pre-wrap">{m.message}</div>

                  {m.status === 'Replied' && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded mb-3">
                      <div className="text-sm font-semibold text-green-800">Admin Response</div>
                      <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{m.adminResponse}</div>
                    </div>
                  )}

                  <div className="mt-2">
                    <textarea
                      value={activeReply[m._id] || ''}
                      onChange={(e) => handleReplyChange(m._id, e.target.value)}
                      placeholder="Type your reply here..."
                      rows={3}
                      className="w-full px-3 py-2 border rounded mb-2"
                    />
                    <div className="flex justify-end">
                      <button onClick={() => sendReply(m._id)} className="px-4 py-2 bg-ethiopian-gold text-white rounded disabled:opacity-50">Send Reply</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminMessages;
