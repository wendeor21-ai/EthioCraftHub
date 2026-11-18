/**
 * Manage Users Page for EthioCraft Global Admin
 * 
 * Allows admins to view and manage all platform users
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { adminAPI, supportAPI } from '../../utils/api';
import {
  EnvelopeIcon,
  KeyIcon,
  FlagIcon,
  TrashIcon,
  PowerIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatOrderDateTime } from '../../utils/dateUtils';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const ManageUsers = ({ insideDashboard, onSelectTab }) => {
  const { t, currentLanguage } = useCustomTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [stats, setStats] = useState({ total: 0, artisans: 0, customers: 0, active: 0 });

  // action toolbar / message states inside modal
  const [sendMode, setSendMode] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filter, searchTerm, page]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        role: filter !== 'all' ? filter : undefined,
        search: searchTerm || undefined,
        page,
        limit
      };

      console.log('📡 [ManageUsers] Requesting /api/admin/users with:', params);
      const res = await adminAPI.getUsers(params);
      console.log('✅ [ManageUsers] /api/admin/users response:', res.status, res.data);
      const fetchedUsers = res.data?.users || [];
      setUsers(fetchedUsers);
      setTotalPages(res.data?.pagination ? res.data.pagination.totalPages : 1);

      if (res.data?.stats) {
        setStats(prev => ({
          ...prev,
          ...res.data.stats,
          total: res.data.stats.total ?? (res.data.pagination?.totalUsers || fetchedUsers.length),
        }));
      } else if (fetchedUsers.length > 0) {
        setStats({
          total: fetchedUsers.length,
          artisans: fetchedUsers.filter(u => u.role === 'artisan').length,
          customers: fetchedUsers.filter(u => u.role === 'customer').length,
          active: fetchedUsers.filter(u => u.isActive !== false).length,
        });
      }
      setError('');
    } catch (err) {
      console.error('❌ [ManageUsers] Error fetching users:', err.response?.status, err.response?.data || err.message);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📡 [ManageUsers] Requesting /api/admin/dashboard');
      const res = await adminAPI.getDashboard();
      console.log('✅ [ManageUsers] /api/admin/dashboard response:', res.status, res.data);
      const userStats = res.data?.users || [];
      if (Array.isArray(userStats) && userStats.length > 0) {
        let total = 0, artisans = 0, customers = 0, active = 0;
        userStats.forEach((g) => {
          const role = g._id;
          const count = g.count || 0;
          const act = g.active || 0;
          total += count;
          active += act;
          if (role === 'artisan') artisans = count;
          if (role === 'customer') customers = count;
        });
        setStats(prev => ({
          total: total || prev.total,
          artisans: artisans || prev.artisans,
          customers: customers || prev.customers,
          active: active || prev.active,
        }));
      }
    } catch (err) {
      console.warn('Dashboard stats fallback from /users', err);
    }
  };

  const filteredUsers = users.filter(u => {
    // Filter by role
    if (filter !== 'all' && u.role !== filter) return false;
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        u.email.toLowerCase().includes(search) ||
        u.profile?.firstName?.toLowerCase().includes(search) ||
        u.profile?.lastName?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // clear message inputs when modal opens or user changes
  useEffect(() => {
    if (selectedUser) {
      setSendMode(false);
      setMessageSubject('');
      setMessageBody('');
      setSendingMessage(false);
    }
  }, [selectedUser]);

  // clear when closing modal as well
  useEffect(() => {
    if (!modalOpen) {
      setSendMode(false);
      setMessageSubject('');
      setMessageBody('');
      setSendingMessage(false);
    }
  }, [modalOpen]);

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) {
      return toast.error('Subject and message are required');
    }
    setSendingMessage(true);
    try {
      await supportAPI.adminSendMessage(selectedUser._id, messageSubject, messageBody);
      toast.success('Message sent successfully');
      setSendMode(false);
    } catch (err) {
      console.error('Failed to send admin message', err);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const toggleUserStatus = (userId) => {
    const target = users.find((u) => u._id === userId);
    if (!target) return;
    if (target.role === "admin") {
      window.alert("Admin accounts cannot be deactivated or activated from here.");
      return;
    }
    // Call server API to update status (use adminAPI helper)
    (async () => {
      try {
        const res = await adminAPI.setUserStatus(userId, !target.isActive);
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: res.data.user.isActive } : u));
        toast.success('User status updated');
      } catch (err) {
        console.error('Failed to update user status:', err);
        toast.error('Failed to update user status');
      }
    })();
  };

  const deleteUser = (userId) => {
    const target = users.find((u) => u._id === userId);
    if (!target) return;
    if (target.role === "admin") {
      window.alert("Admin accounts cannot be deleted.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) return;

    (async () => {
      try {
        const res = await adminAPI.deleteUser(userId);
        setUsers(prev => prev.filter(u => u._id !== userId));
        toast.success('User deleted');
      } catch (err) {
        console.error('Failed to delete user:', err);
        toast.error('Failed to delete user');
      }
    })();
  };

  const resetUserPassword = (userId) => {
    if (!window.confirm('Reset password for this user? A temporary password will be generated.')) return;
    (async () => {
      try {
        const res = await adminAPI.resetUserPassword(userId);
        toast.success('Password reset');
        // show temp password (for admin/troubleshooting only)
        alert('Temporary password: ' + (res.data.tempPassword || '[hidden]'));
        // refresh list
        fetchUsers();
      } catch (err) {
        console.error('Failed to reset password', err);
        toast.error('Failed to reset password');
      }
    })();
  };

  const flagUser = (userId) => {
    const reason = window.prompt('Reason for flagging this user (min 5 characters)');
    if (!reason || reason.length < 5) return toast.error('Please provide a valid reason');
    (async () => {
      try {
        await adminAPI.flagUser(userId, { reason });
        toast.success('User flagged for review');
        fetchUsers();
      } catch (err) {
        console.error('Failed to flag user', err);
        toast.error('Failed to flag user');
      }
    })();
  };

  const openUser = async (userId) => {
    setModalOpen(true);
    setLoadingUser(true);
    try {
      const resUser = await adminAPI.getUser(userId);
      const resActivity = await adminAPI.getUserActivity(userId);
      setSelectedUser(resUser.data.user || null);
      // prefer recentInteractions then authEvents
      const activities = resActivity.data.recentInteractions || resActivity.data.authEvents || [];
      setSelectedActivity(activities.slice(0, 100));
    } catch (err) {
      console.error('Failed to load user details', err);
      toast.error('Failed to load user details');
      setModalOpen(false);
    } finally {
      setLoadingUser(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      artisan: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={insideDashboard ? "py-12 flex items-center justify-center" : "min-h-screen flex items-center justify-center"}>
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`manage-users-container ${insideDashboard ? 'p-0' : ''}`}>
      <div className={insideDashboard ? 'bg-transparent py-2' : 'min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8'}>
        <div className={insideDashboard ? 'w-full' : 'container mx-auto px-4 max-w-7xl'}>
        {/* Header */}
        <div className="mb-6">
          {!insideDashboard && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-amber-600 hover:text-amber-700 mb-3 flex items-center text-xs font-semibold"
            >
              ← Back to Dashboard
            </button>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-xs text-gray-500 mt-1">View and manage all platform users</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 mb-3">
          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-[10px] sm:text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Total Users</p>
                <p className="text-base sm:text-xl font-bold text-gray-900 mt-0.5">{stats.total || users.length}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-[10px] sm:text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Artisans</p>
                <p className="text-base sm:text-xl font-bold text-blue-600 mt-0.5">
                  {stats.artisans || users.filter(u => u.role === 'artisan').length}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-[10px] sm:text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Customers</p>
                <p className="text-base sm:text-xl font-bold text-green-600 mt-0.5">
                  {stats.customers || users.filter(u => u.role === 'customer').length}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 hover:shadow-xs transition-all">
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-[10px] sm:text-[10.5px] font-semibold text-gray-500 uppercase tracking-wider">Active</p>
                <p className="text-base sm:text-xl font-bold text-amber-600 mt-0.5">
                  {stats.active || users.filter(u => u.isActive).length}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-2.5 sm:p-3 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['all', 'artisan', 'customer'].map(role => (
                <button
                  key={role}
                  onClick={() => setFilter(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === role
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                  {role !== 'all' && (
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${filter === role ? 'bg-white/20 text-white' : 'bg-white text-gray-800'}`}>
                      {users.filter(u => u.role === role).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Users Table - High Density Minimalist View */}
        <div className="bg-white rounded-xl shadow-2xs overflow-hidden border border-gray-200">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full relative text-[11px] font-sans">
              <thead className="bg-gray-50/95 sticky top-0 z-10 shadow-2xs border-b border-gray-200 backdrop-blur-2xs">
                <tr>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    USER (ተጠቃሚ)
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    ROLE (ሚና)
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    CONTACT (መገኛ)
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    STATS (ስታትስቲክስ)
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    JOINED (የተመዘገበበት)
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    STATUS (ሁኔታ)
                  </th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/90">
                    ACTIONS (እርምጃዎች)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u._id} className={(!u.isActive ? 'bg-gray-50/70' : '') + ' hover:bg-amber-50/40 transition-colors'}>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-2xs">
                          {u.profile?.firstName?.charAt(0) || u.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 leading-tight text-[11px] truncate max-w-[170px]">
                            {u.profile?.firstName || u.profile?.lastName ? `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() : (u.email?.split('@')[0] || 'User')}
                            {u.isFlagged && (
                              <span title="Flagged" className="inline-block ml-1 align-middle">
                                <svg className="w-3 h-3 text-red-600 inline" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M6 3c.667 0 1 .333 1 .333V9l5-2V3c0-.667-.333-1-1-1H6v1z" />
                                  <path d="M4 5v11h1V5H4z" />
                                </svg>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[170px] font-mono leading-tight">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className={'px-1.5 py-0.2 inline-flex text-[9.5px] leading-tight font-bold rounded-full border ' + getRoleBadge(u.role)}>
                          {u.role}
                        </span>
                        {u.role === 'artisan' && u.verification && (
                          <span className={'px-1.5 py-0.2 inline-flex text-[9px] leading-tight font-bold rounded-full border ' +
                            (u.verification.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200') }>
                            {u.verification.status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-600 font-mono">
                      {u.profile?.phone || 'N/A'}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-600 leading-tight">
                      {u.role === 'artisan' && (
                        <div>
                          <span className="font-bold text-gray-800">{u.productsCount || 0} prod</span>
                          <span className="text-[9px] text-gray-400 ml-1">({u.ordersCount || 0} ord)</span>
                        </div>
                      )}
                      {u.role === 'customer' && (
                        <div><span className="font-semibold text-gray-800">{u.ordersCount || 0}</span> orders</div>
                      )}
                      {u.role === 'admin' && (
                        <span className="text-gray-400 text-[9.5px]">Staff</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-600 font-mono">
                      {u.createdAt ? formatOrderDateTime(u.createdAt, currentLanguage).date : '—'}
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="px-1.5 py-0.2 inline-flex text-[9px] leading-tight font-bold rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
                      ) : (
                        <span className="px-1.5 py-0.2 inline-flex text-[9px] leading-tight font-bold rounded-full bg-red-50 text-red-700 border border-red-200">Suspended</span>
                      )}
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap text-right text-[10px] font-medium">
                      {u.role === 'admin' ? (
                        <span className="text-[9.5px] text-gray-400">Protected</span>
                      ) : (
                        <button
                          onClick={() => openUser(u._id)}
                          className="bg-gray-100 hover:bg-amber-600 hover:text-white transition-colors text-gray-700 px-2 py-0.5 rounded shadow-2xs text-[10px] font-bold"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </div>
        {/* User Detail Modal */}
        {modalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:w-11/12 md:w-3/4 lg:w-1/2 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Details</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-800">Close</button>
              </div>
              {loadingUser ? (
                <div className="flex items-center justify-center py-8"><LoadingSpinner /></div>
              ) : (
                <div>
                  <p className="font-medium">{selectedUser.profile?.firstName} {selectedUser.profile?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={selectedUser.role}
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        try {
                          await adminAPI.changeUserRole(selectedUser._id, newRole);
                          toast.success('Role updated');
                          setSelectedUser(prev => ({ ...prev, role: newRole }));
                          fetchUsers();
                        } catch (err) {
                          console.error('Role change failed', err);
                          toast.error('Role change failed');
                        }
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                      <option value="customer">Customer</option>
                      <option value="artisan">Artisan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* action toolbar */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex space-x-4">
                      <button
                        title="Send Message"
                        onClick={() => setSendMode(prev => !prev)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EnvelopeIcon className="w-6 h-6" />
                      </button>
                      <button
                        title="Reset Password"
                        onClick={() => {
                          if (window.confirm('Send password reset link?')) {
                            resetUserPassword(selectedUser._id);
                          }
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <KeyIcon className="w-6 h-6" />
                      </button>
                      <button
                        title="Flag User"
                        onClick={() => flagUser(selectedUser._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FlagIcon className="w-6 h-6" />
                      </button>
                      <button
                        title={selectedUser.isActive ? 'Deactivate user' : 'Activate user'}
                        onClick={() => toggleUserStatus(selectedUser._id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <PowerIcon className="w-6 h-6" />
                      </button>
                      <button
                        title="Delete User"
                        onClick={() => deleteUser(selectedUser._id)}
                        className="text-red-800 hover:text-red-900"
                      >
                        <TrashIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* message form inside modal */}
                  {sendMode && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                          type="text"
                          value={messageSubject}
                          onChange={(e) => setMessageSubject(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-ethiopian-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                          rows={4}
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-ethiopian-gold"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage}
                          className="bg-ethiopian-gold text-white px-6 py-2 rounded-lg hover:bg-ethiopian-earth disabled:opacity-50"
                        >
                          {sendingMessage ? 'Sending...' : 'Send Message'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="font-medium">Recent Activity</h3>
                    <ul className="mt-2 max-h-48 overflow-auto text-sm text-gray-700">
                      {selectedActivity.length === 0 && <li className="text-gray-500">No recent activity</li>}
                      {selectedActivity.map((a, idx) => (
                        <li key={idx} className="border-b py-2">{a.type || a.event || JSON.stringify(a)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default ManageUsers;
